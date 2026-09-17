// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dataverket

package docscheck

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"sort"
	"strings"
)

// Issue is one broken rule on one path. Every issue fails the check; there are no warnings.
type Issue struct {
	Rule    string
	Path    string
	Message string
}

// Report is the outcome of one run.
type Report struct {
	Pages  int
	Issues []Issue
}

// Lister returns the tracked files under the given paths, relative to the repository root.
type Lister func(paths []string) ([]string, error)

// GitTracked lists tracked files with git, for code-map coverage.
func GitTracked(root string) Lister {
	return func(paths []string) ([]string, error) {
		args := append([]string{"-C", root, "ls-files", "--"}, paths...)
		out, err := exec.Command("git", args...).Output()
		if err != nil {
			return nil, fmt.Errorf("git ls-files: %w", err)
		}
		return strings.Fields(string(out)), nil
	}
}

type checker struct {
	root    string
	cfg     *Config
	tracked Lister
	report  *Report
	index   string
	codeMap string
	// overviews collects explanation pages without a context, per project.
	overviews map[string][]string
	adrNames  map[string]bool
}

// Check runs every rule over <root>/docs. It returns an error only when the check itself cannot run; broken
// rules are Issues in the Report.
func Check(root string, cfg *Config, tracked Lister) (*Report, error) {
	if err := cfg.compile(); err != nil {
		return nil, err
	}
	c := &checker{root: root, cfg: cfg, tracked: tracked, report: &Report{}, overviews: map[string][]string{}, adrNames: map[string]bool{}}
	docs := filepath.Join(root, "docs")
	for _, name := range []string{cfg.Index, cfg.CodeMap} {
		raw, err := os.ReadFile(filepath.Join(docs, name))
		if err != nil {
			return nil, fmt.Errorf("reading docs/%s: %w", name, err)
		}
		if name == cfg.Index {
			c.index = string(raw)
		} else {
			c.codeMap = string(raw)
		}
	}
	var pages []string
	err := filepath.WalkDir(docs, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel := filepath.ToSlash(strings.TrimPrefix(path, docs+string(os.PathSeparator)))
		if path == docs {
			return nil
		}
		if d.IsDir() {
			if !strings.Contains(rel, "/") {
				if _, ok := cfg.Folders[rel]; !ok {
					c.add("unknown_folder", "docs/"+rel+"/", "not one of "+strings.Join(sortedKeys(cfg.Folders), ", "))
				}
			}
			return nil
		}
		if strings.HasSuffix(rel, ".md") {
			pages = append(pages, rel)
		} else if !slices.Contains(cfg.Files, rel) {
			c.add("unexpected_file", "docs/"+rel, "not Markdown and not listed under files in the schema")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(pages)
	for _, rel := range pages {
		if filepath.Dir(rel) == "decisions" && filepath.Base(rel) != "README.md" {
			c.adrNames[filepath.Base(rel)] = true
		}
	}
	for _, rel := range pages {
		c.page(rel)
	}
	c.report.Pages = len(pages)
	for project, paths := range c.overviews {
		if len(paths) > 1 {
			c.add("duplicate_overview", "docs/"+paths[0], fmt.Sprintf("%s has more than one overview page (explanation without context): %s", project, strings.Join(paths, ", ")))
		}
	}
	if err := c.codeMapCoverage(); err != nil {
		return nil, err
	}
	sort.Slice(c.report.Issues, func(i, j int) bool {
		a, b := c.report.Issues[i], c.report.Issues[j]
		if a.Path != b.Path {
			return a.Path < b.Path
		}
		if a.Rule != b.Rule {
			return a.Rule < b.Rule
		}
		return a.Message < b.Message
	})
	return c.report, nil
}

func (c *checker) add(rule, path, message string) {
	c.report.Issues = append(c.report.Issues, Issue{Rule: rule, Path: path, Message: message})
}

func (c *checker) page(rel string) {
	path := "docs/" + rel
	fm, body, err := parseDocument(filepath.Join(c.root, path))
	if err != nil {
		c.add("invalid_frontmatter", path, err.Error())
		return
	}
	if fm == nil {
		c.add("missing_frontmatter", path, "missing YAML frontmatter")
		return
	}
	cfg := c.cfg
	pageType := fm.str("type")
	kind := "page"
	if pageType == "adr" {
		kind = "adr"
	}
	fields := cfg.Fields[kind]
	for _, key := range sortedKeys(fm) {
		if !slices.Contains(fields.Required, key) && !slices.Contains(fields.Optional, key) {
			c.add("unknown_field", path, fmt.Sprintf("unknown field %q for a %s", key, kind))
		}
	}
	for _, key := range fields.Required {
		if !fm.present(key) {
			c.add("missing_field", path, fmt.Sprintf("missing required field %q", key))
		}
	}
	for _, key := range sortedKeys(cfg.RequiredByType) {
		if slices.Contains(cfg.RequiredByType[key], pageType) && !fm.present(key) {
			c.add("missing_field", path, fmt.Sprintf("missing field %q (required on %s)", key, pageType))
		}
	}
	dir, base := filepath.Dir(rel), filepath.Base(rel)
	want := "index"
	if base != "README.md" {
		if folder, ok := cfg.Folders[strings.SplitN(dir, "/", 2)[0]]; ok {
			want = folder
		}
	}
	if pageType != want {
		c.add("type_mismatch", path, fmt.Sprintf("type %q but its folder says %q", pageType, want))
	}
	for _, key := range sortedKeys(cfg.Allowed) {
		for _, v := range fm.values(key) {
			if !slices.Contains(cfg.Allowed[key], v) {
				c.add("invalid_value", path, fmt.Sprintf("%s %q is not one of %s", key, v, strings.Join(cfg.Allowed[key], ", ")))
			}
		}
	}
	for _, key := range sortedKeys(cfg.formats) {
		if v := fm.str(key); v != "" && !cfg.formats[key].MatchString(v) {
			c.add("invalid_format", path, fmt.Sprintf("%s %q does not match %s", key, v, cfg.Formats[key]))
		}
	}
	if pageType == "adr" {
		c.adr(path, base, fm, body)
	}
	if pageType == "explanation" && !fm.present("context") && !slices.Contains(cfg.Overview.Exempt, fm.str("project")) {
		project := fm.str("project")
		c.overviews[project] = append(c.overviews[project], rel)
	}
	c.indexed(rel)
}

func (c *checker) adr(path, base string, fm Frontmatter, body string) {
	if c.cfg.adrFilename != nil && !c.cfg.adrFilename.MatchString(base) {
		c.add("invalid_filename", path, fmt.Sprintf("ADR filename must match %s", c.cfg.ADRFilename))
	}
	headings := map[string]bool{}
	for _, line := range strings.Split(body, "\n") {
		if t := strings.TrimSpace(line); strings.HasPrefix(t, "## ") {
			headings[strings.ToLower(strings.TrimSpace(t[3:]))] = true
		}
	}
	for _, section := range c.cfg.ADRSections {
		if !headings[strings.ToLower(section)] {
			c.add("missing_section", path, fmt.Sprintf("missing section %q", "## "+section))
		}
	}
	for _, related := range fm.values("related") {
		if strings.Contains(related, "://") || strings.HasPrefix(related, "#") {
			continue
		}
		if strings.Contains(related, "/") {
			if _, err := os.Stat(filepath.Join(c.root, filepath.Dir(path), filepath.FromSlash(related))); err == nil {
				continue
			}
		} else if c.adrNames[related] {
			continue
		}
		c.add("invalid_related_target", path, fmt.Sprintf("related target %q does not exist", related))
	}
}

// indexed requires every page but the index itself to be linked from the index or from its own folder's README.
func (c *checker) indexed(rel string) {
	if rel == c.cfg.Index {
		return
	}
	if strings.Contains(c.index, "("+rel+")") {
		return
	}
	dir := filepath.Dir(rel)
	if dir != "." {
		folderIndex, err := os.ReadFile(filepath.Join(c.root, "docs", dir, "README.md"))
		if err == nil && strings.Contains(string(folderIndex), "("+filepath.Base(rel)+")") {
			return
		}
	}
	c.add("not_indexed", "docs/"+rel, fmt.Sprintf("not linked from docs/%s or its folder's README.md", c.cfg.Index))
}

var testFile = regexp.MustCompile(`_test\.ts$`)

// codeMapCoverage requires every tracked path under mapped_paths to appear in the code map; a test file is
// covered by the file it tests.
func (c *checker) codeMapCoverage() error {
	if len(c.cfg.MappedPaths) == 0 || c.tracked == nil {
		return nil
	}
	paths, err := c.tracked(c.cfg.MappedPaths)
	if err != nil {
		return err
	}
	for _, p := range paths {
		if strings.Contains(c.codeMap, p) {
			continue
		}
		if testFile.MatchString(p) && strings.Contains(c.codeMap, testFile.ReplaceAllString(p, ".ts")) {
			continue
		}
		if strings.HasSuffix(p, "_test.go") && strings.Contains(c.codeMap, strings.TrimSuffix(p, "_test.go")+".go") {
			continue
		}
		if strings.HasSuffix(p, "/go.sum") && strings.Contains(c.codeMap, strings.TrimSuffix(p, "go.sum")+"go.mod") {
			continue
		}
		c.add("unmapped_path", p, "not in docs/"+c.cfg.CodeMap)
	}
	return nil
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
