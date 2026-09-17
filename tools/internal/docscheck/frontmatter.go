// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dataverket

package docscheck

import (
	"fmt"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Frontmatter is a page's YAML header, values normalised: dates are strings, lists are []string.
type Frontmatter map[string]any

// parseDocument splits a page into frontmatter and body. A page that does not start with `---` has nil frontmatter.
func parseDocument(path string) (Frontmatter, string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, "", err
	}
	text := strings.ReplaceAll(string(raw), "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return nil, text, nil
	}
	rest := text[len("---\n"):]
	end := strings.Index(rest, "\n---\n")
	if end == -1 {
		if strings.HasSuffix(rest, "\n---") {
			end = len(rest) - len("\n---")
		} else {
			return nil, "", fmt.Errorf("frontmatter is not closed")
		}
	}
	var decoded map[string]any
	if err := yaml.Unmarshal([]byte(rest[:end]), &decoded); err != nil {
		return nil, "", fmt.Errorf("frontmatter: %w", err)
	}
	fm := make(Frontmatter, len(decoded))
	for k, v := range decoded {
		fm[k] = normalise(v)
	}
	body := ""
	if end+len("\n---\n") <= len(rest) {
		body = rest[end+len("\n---\n"):]
	}
	return fm, body, nil
}

// normalise turns yaml.v3's timestamps into ISO dates and lists into []string; everything else stays.
func normalise(v any) any {
	switch t := v.(type) {
	case time.Time:
		return t.Format("2006-01-02")
	case []any:
		out := make([]string, 0, len(t))
		for _, x := range t {
			out = append(out, fmt.Sprint(normalise(x)))
		}
		return out
	default:
		return v
	}
}

// str returns a scalar field as text, "" when absent.
func (f Frontmatter) str(key string) string {
	v, ok := f[key]
	if !ok || v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	if _, ok := v.([]string); ok {
		return ""
	}
	return fmt.Sprint(v)
}

// values returns a field's values: a list as is, a scalar split on commas (`audience: operator, agent`).
func (f Frontmatter) values(key string) []string {
	v, ok := f[key]
	if !ok || v == nil {
		return nil
	}
	if list, ok := v.([]string); ok {
		return list
	}
	var out []string
	for _, part := range strings.Split(fmt.Sprint(v), ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

// present reports whether a field has a non-empty value (a scalar with text, or a list with entries).
func (f Frontmatter) present(key string) bool {
	v, ok := f[key]
	if !ok || v == nil {
		return false
	}
	if list, ok := v.([]string); ok {
		return len(list) > 0
	}
	return strings.TrimSpace(fmt.Sprint(v)) != ""
}
