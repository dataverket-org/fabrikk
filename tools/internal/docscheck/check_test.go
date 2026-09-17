// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dataverket

package docscheck

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func testConfig() *Config {
	return &Config{
		Folders: map[string]string{"explanation": "explanation", "guides": "guide", "reference": "reference", "decisions": "adr"},
		Files:   []string{"schema.yaml"},
		Index:   "README.md",
		Fields: map[string]Fields{
			"page": {Required: []string{"title", "type", "project"}, Optional: []string{"audience", "last-verified", "context", "related"}},
			"adr":  {Required: []string{"title", "type", "project", "category", "status", "created"}, Optional: []string{"related"}},
		},
		RequiredByType: map[string][]string{"audience": {"explanation", "guide"}, "last-verified": {"explanation", "reference"}},
		Allowed:        map[string][]string{"project": {"fabrikk", "sentral"}, "audience": {"operator", "agent"}, "category": {"architecture"}, "status": {"accepted"}},
		Formats:        map[string]string{"last-verified": `^[0-9]{4}-[0-9]{2}-[0-9]{2} @ [0-9a-f]{7,40}$`, "created": `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`},
		Overview:       Overview{Exempt: []string{"fabrikk"}},
		ADRSections:    []string{"Status", "Context", "Decision"},
		ADRFilename:    `^[0-9]{4}-[a-z0-9-]+\.md$`,
		CodeMap:        "reference/code-map.md",
		MappedPaths:    []string{"workflows"},
	}
}

const explanation = "---\ntitle: How\ntype: explanation\nproject: fabrikk\naudience: operator, agent\nlast-verified: 2026-09-17 @ abc1234\n---\n\n# How\n"
const guide = "---\ntitle: Do\ntype: guide\nproject: fabrikk\naudience: operator\n---\n\n# Do\n"
const adr = "---\ntitle: Pick\ntype: adr\nproject: sentral\ncategory: architecture\nstatus: accepted\ncreated: 2026-10-01\nrelated: [0002-other.md]\n---\n\n## Status\n\n## Context\n\n## Decision\n"

// validTree is a docs/ tree that passes every rule.
func validTree() map[string]string {
	return map[string]string{
		"README.md":               "---\ntitle: Docs\ntype: index\nproject: fabrikk\n---\n- [how](explanation/how.md)\n- [do](guides/do.md)\n- [map](reference/code-map.md)\n- [adrs](decisions/README.md)\n",
		"schema.yaml":             "folders: {}\n",
		"explanation/how.md":      explanation,
		"guides/do.md":            guide,
		"reference/code-map.md":   "---\ntitle: Map\ntype: reference\nproject: fabrikk\naudience: agent\nlast-verified: 2026-09-17 @ abc1234\n---\n`workflows/a.yaml` and `workflows/b.yaml`\n",
		"decisions/README.md":     "---\ntitle: ADRs\ntype: index\nproject: fabrikk\n---\n- [1](0001-pick.md)\n- [2](0002-other.md)\n",
		"decisions/0001-pick.md":  adr,
		"decisions/0002-other.md": strings.Replace(adr, "related: [0002-other.md]\n", "", 1),
	}
}

func run(t *testing.T, tree map[string]string, tracked []string) *Report {
	t.Helper()
	root := t.TempDir()
	for rel, content := range tree {
		path := filepath.Join(root, "docs", filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	report, err := Check(root, testConfig(), func([]string) ([]string, error) { return tracked, nil })
	if err != nil {
		t.Fatalf("Check: %v", err)
	}
	return report
}

func rules(report *Report) []string {
	var out []string
	for _, issue := range report.Issues {
		out = append(out, issue.Rule)
	}
	return out
}

func TestValidTreePasses(t *testing.T) {
	report := run(t, validTree(), []string{"workflows/a.yaml", "workflows/b.yaml"})
	if len(report.Issues) != 0 {
		t.Fatalf("expected no issues, got %+v", report.Issues)
	}
	if report.Pages != 7 {
		t.Fatalf("expected 7 pages, got %d", report.Pages)
	}
}

func TestEveryRule(t *testing.T) {
	cases := []struct {
		name    string
		mutate  func(tree map[string]string)
		tracked []string
		want    []string
	}{
		{"unknown folder", func(tr map[string]string) {
			tr["research/README.md"] = "---\ntitle: r\ntype: index\nproject: fabrikk\n---\n"
		}, nil, []string{"unknown_folder", "not_indexed"}},
		{"unexpected file", func(tr map[string]string) { tr["notes.txt"] = "x" }, nil, []string{"unexpected_file"}},
		{"missing frontmatter", func(tr map[string]string) { tr["guides/do.md"] = "# no header\n" }, nil, []string{"missing_frontmatter"}},
		{"unclosed frontmatter", func(tr map[string]string) { tr["guides/do.md"] = "---\ntitle: x\n" }, nil, []string{"invalid_frontmatter"}},
		{"unknown field", func(tr map[string]string) {
			tr["guides/do.md"] = strings.Replace(guide, "audience", "audience: operator\nfoo", 1)
		}, nil, []string{"unknown_field"}},
		{"missing required field", func(tr map[string]string) { tr["guides/do.md"] = strings.Replace(guide, "project: fabrikk\n", "", 1) }, nil, []string{"missing_field"}},
		{"missing field required on type", func(tr map[string]string) {
			tr["explanation/how.md"] = strings.Replace(explanation, "last-verified: 2026-09-17 @ abc1234\n", "", 1)
		}, nil, []string{"missing_field"}},
		{"type does not match folder", func(tr map[string]string) {
			tr["guides/do.md"] = strings.Replace(guide, "type: guide", "type: tutorial", 1)
		}, nil, []string{"type_mismatch"}},
		{"value outside allowlist", func(tr map[string]string) {
			tr["explanation/how.md"] = strings.Replace(explanation, "operator, agent", "operator, everybody", 1)
		}, nil, []string{"invalid_value"}},
		{"bad format", func(tr map[string]string) {
			tr["explanation/how.md"] = strings.Replace(explanation, "2026-09-17 @ abc1234", "yesterday", 1)
		}, nil, []string{"invalid_format"}},
		{"two overviews for one product", func(tr map[string]string) {
			tr["explanation/a.md"] = strings.Replace(explanation, "project: fabrikk", "project: sentral", 1)
			tr["explanation/b.md"] = strings.Replace(explanation, "project: fabrikk", "project: sentral", 1)
			tr["README.md"] += "- [a](explanation/a.md)\n- [b](explanation/b.md)\n"
		}, nil, []string{"duplicate_overview"}},
		{"page with context is not an overview", func(tr map[string]string) {
			tr["explanation/a.md"] = strings.Replace(explanation, "project: fabrikk", "project: sentral\ncontext: onboarding", 1)
			tr["explanation/b.md"] = strings.Replace(explanation, "project: fabrikk", "project: sentral", 1)
			tr["README.md"] += "- [a](explanation/a.md)\n- [b](explanation/b.md)\n"
		}, nil, nil},
		{"page not indexed", func(tr map[string]string) { tr["guides/more.md"] = guide }, nil, []string{"not_indexed"}},
		{"adr missing sections", func(tr map[string]string) {
			tr["decisions/0002-other.md"] = strings.Replace(tr["decisions/0002-other.md"], "## Decision\n", "", 1)
		}, nil, []string{"missing_section"}},
		{"adr bad filename", func(tr map[string]string) {
			tr["decisions/pick.md"] = strings.Replace(adr, "related: [0002-other.md]\n", "", 1)
			tr["decisions/README.md"] += "- [p](pick.md)\n"
		}, nil, []string{"invalid_filename"}},
		{"adr related target missing", func(tr map[string]string) {
			tr["decisions/0001-pick.md"] = strings.Replace(adr, "0002-other.md", "0009-nope.md", 1)
		}, nil, []string{"invalid_related_target"}},
		{"adr date in the wrong shape", func(tr map[string]string) {
			tr["decisions/0002-other.md"] = strings.Replace(tr["decisions/0002-other.md"], "created: 2026-10-01", "created: Oct 1", 1)
		}, nil, []string{"invalid_format"}},
		{"tracked path missing from code map", nil, []string{"workflows/a.yaml", "workflows/c.yaml"}, []string{"unmapped_path"}},
		{"test files are covered by their source", nil, []string{"workflows/a.yaml", "extensions/x_test.ts", "tools/y_test.go"}, []string{"unmapped_path", "unmapped_path"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tree := validTree()
			if tc.mutate != nil {
				tc.mutate(tree)
			}
			tracked := tc.tracked
			if tracked == nil {
				tracked = []string{"workflows/a.yaml", "workflows/b.yaml"}
			}
			got := rules(run(t, tree, tracked))
			want := tc.want
			slices.Sort(got)
			slices.Sort(want)
			if !slices.Equal(got, want) {
				t.Fatalf("rules: got %v, want %v", got, want)
			}
		})
	}
}

func TestCoveredTestFiles(t *testing.T) {
	tree := validTree()
	tree["reference/code-map.md"] += "`extensions/x.ts` `tools/y.go` `tools/go.mod`\n"
	report := run(t, tree, []string{"extensions/x_test.ts", "tools/y_test.go", "tools/go.sum"})
	if len(report.Issues) != 0 {
		t.Fatalf("expected test and sum files to be covered, got %+v", report.Issues)
	}
}

func TestLoadConfigRejectsUnknownKeys(t *testing.T) {
	path := filepath.Join(t.TempDir(), "schema.yaml")
	if err := os.WriteFile(path, []byte("folders: {explanation: explanation}\nindex: README.md\ncode_map: x.md\nfields: {page: {}, adr: {}}\nallowd: {project: [x]}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadConfig(path); err == nil || !strings.Contains(err.Error(), "allowd") {
		t.Fatalf("expected an unknown-key error naming allowd, got %v", err)
	}
}

func TestLoadConfigRejectsBadRegexp(t *testing.T) {
	path := filepath.Join(t.TempDir(), "schema.yaml")
	if err := os.WriteFile(path, []byte("folders: {explanation: explanation}\nindex: README.md\ncode_map: x.md\nfields: {page: {}, adr: {}}\nformats: {created: '('}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadConfig(path); err == nil || !strings.Contains(err.Error(), "formats.created") {
		t.Fatalf("expected a regexp error for formats.created, got %v", err)
	}
}

func TestFrontmatterDatesBecomeStrings(t *testing.T) {
	path := filepath.Join(t.TempDir(), "p.md")
	if err := os.WriteFile(path, []byte("---\ncreated: 2026-10-01\ntags: [a, b]\naudience: x, y\n---\nbody\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	fm, body, err := parseDocument(path)
	if err != nil {
		t.Fatal(err)
	}
	if fm.str("created") != "2026-10-01" || !slices.Equal(fm.values("tags"), []string{"a", "b"}) || !slices.Equal(fm.values("audience"), []string{"x", "y"}) || body != "body\n" {
		t.Fatalf("unexpected parse: %v %q", fm, body)
	}
}
