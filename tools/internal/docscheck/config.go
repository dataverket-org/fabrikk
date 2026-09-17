// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dataverket

// Package docscheck enforces docs/schema.yaml: the page schema and the bounding rules for the docs/ tree, as
// docs/README.md explains them. Ported from the Dataverket docs site's Structured MADR validator and cut down to
// what fabrikk needs: one repository, every rule an error, no JSON Schema.
package docscheck

import (
	"fmt"
	"os"
	"regexp"

	"gopkg.in/yaml.v3"
)

// Config is docs/schema.yaml. Unknown keys are an error, so a misspelt rule cannot silently stop applying.
type Config struct {
	Folders        map[string]string   `yaml:"folders"`
	Files          []string            `yaml:"files"`
	Index          string              `yaml:"index"`
	Fields         map[string]Fields   `yaml:"fields"`
	RequiredByType map[string][]string `yaml:"required_by_type"`
	Allowed        map[string][]string `yaml:"allowed"`
	Formats        map[string]string   `yaml:"formats"`
	Overview       Overview            `yaml:"overview"`
	ADRSections    []string            `yaml:"adr_sections"`
	ADRFilename    string              `yaml:"adr_filename"`
	CodeMap        string              `yaml:"code_map"`
	MappedPaths    []string            `yaml:"mapped_paths"`

	formats     map[string]*regexp.Regexp
	adrFilename *regexp.Regexp
}

// Fields lists what a kind of page (page or adr) may carry.
type Fields struct {
	Required []string `yaml:"required"`
	Optional []string `yaml:"optional"`
}

// Overview says which projects may have any number of explanation pages without a context.
type Overview struct {
	Exempt []string `yaml:"exempt"`
}

// LoadConfig reads and compiles the schema.
func LoadConfig(path string) (*Config, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("reading schema %s: %w", path, err)
	}
	defer f.Close()
	dec := yaml.NewDecoder(f)
	dec.KnownFields(true)
	var cfg Config
	if err := dec.Decode(&cfg); err != nil {
		return nil, fmt.Errorf("parsing schema %s: %w", path, err)
	}
	if err := cfg.compile(); err != nil {
		return nil, fmt.Errorf("schema %s: %w", path, err)
	}
	return &cfg, nil
}

func (c *Config) compile() error {
	if c.Index == "" {
		return fmt.Errorf("index is required")
	}
	if c.CodeMap == "" {
		return fmt.Errorf("code_map is required")
	}
	if len(c.Folders) == 0 {
		return fmt.Errorf("folders is required")
	}
	for _, kind := range []string{"page", "adr"} {
		if _, ok := c.Fields[kind]; !ok {
			return fmt.Errorf("fields.%s is required", kind)
		}
	}
	c.formats = make(map[string]*regexp.Regexp, len(c.Formats))
	for field, pattern := range c.Formats {
		re, err := regexp.Compile(pattern)
		if err != nil {
			return fmt.Errorf("formats.%s: %w", field, err)
		}
		c.formats[field] = re
	}
	if c.ADRFilename != "" {
		re, err := regexp.Compile(c.ADRFilename)
		if err != nil {
			return fmt.Errorf("adr_filename: %w", err)
		}
		c.adrFilename = re
	}
	return nil
}
