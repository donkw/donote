package main

import (
	"path/filepath"
	"testing"
)

func TestAppOpenWorkspaceLoadsWorkspaceFromPath(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "intro.md"), "# Intro")

	app := NewApp()
	info, err := app.OpenWorkspace(root)
	if err != nil {
		t.Fatalf("OpenWorkspace() error = %v", err)
	}

	if info.RootPath != root || info.Name != filepath.Base(root) {
		t.Fatalf("unexpected workspace info: %#v", info)
	}

	nodes, err := app.ListWorkspace()
	if err != nil {
		t.Fatalf("ListWorkspace() after OpenWorkspace() error = %v", err)
	}
	if len(nodes) != 1 || nodes[0].Path != "intro.md" {
		t.Fatalf("unexpected nodes after OpenWorkspace(): %#v", nodes)
	}
}
