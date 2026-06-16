package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWorkspaceServiceListWorkspaceReturnsFoldersAndMarkdownOnly(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "alpha.md"), "# Alpha")
	mustWriteFile(t, filepath.Join(root, "skip.txt"), "not markdown")
	mustMkdir(t, filepath.Join(root, "nested"))
	mustWriteFile(t, filepath.Join(root, "nested", "beta.md"), "# Beta")

	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	nodes, err := service.ListWorkspace()
	if err != nil {
		t.Fatalf("ListWorkspace() error = %v", err)
	}

	if len(nodes) != 2 {
		t.Fatalf("expected 2 root nodes, got %d: %#v", len(nodes), nodes)
	}
	if nodes[0].Name != "nested" || nodes[0].Type != "folder" {
		t.Fatalf("expected folder first, got %#v", nodes[0])
	}
	if len(nodes[0].Children) != 1 || nodes[0].Children[0].Path != "nested/beta.md" {
		t.Fatalf("expected nested markdown child, got %#v", nodes[0].Children)
	}
	if nodes[1].Name != "alpha.md" || nodes[1].Type != "file" || nodes[1].Path != "alpha.md" {
		t.Fatalf("expected alpha.md file second, got %#v", nodes[1])
	}
}

func TestWorkspaceServiceReadSaveCreateRenameDeleteMarkdown(t *testing.T) {
	root := t.TempDir()
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	created, err := service.CreateMarkdown("", "note")
	if err != nil {
		t.Fatalf("CreateMarkdown() error = %v", err)
	}
	if created.Path != "note.md" || created.Type != "file" {
		t.Fatalf("unexpected created node: %#v", created)
	}

	saveResult, err := service.SaveMarkdown("note.md", "# Hello\n\nBody")
	if err != nil {
		t.Fatalf("SaveMarkdown() error = %v", err)
	}
	if saveResult.Path != "note.md" || saveResult.SavedAt == "" {
		t.Fatalf("unexpected save result: %#v", saveResult)
	}

	doc, err := service.ReadMarkdown("note.md")
	if err != nil {
		t.Fatalf("ReadMarkdown() error = %v", err)
	}
	if doc.Path != "note.md" || doc.Content != "# Hello\n\nBody" {
		t.Fatalf("unexpected document: %#v", doc)
	}

	renamed, err := service.RenamePath("note.md", "renamed.md")
	if err != nil {
		t.Fatalf("RenamePath() error = %v", err)
	}
	if renamed.Path != "renamed.md" || renamed.Name != "renamed.md" {
		t.Fatalf("unexpected renamed node: %#v", renamed)
	}

	if err := service.DeletePath("renamed.md"); err != nil {
		t.Fatalf("DeletePath() error = %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "renamed.md")); !os.IsNotExist(err) {
		t.Fatalf("expected renamed.md to be deleted, stat err = %v", err)
	}
}

func TestWorkspaceServiceRejectsUnsafePathsAndNonMarkdownWrites(t *testing.T) {
	root := t.TempDir()
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	unsafePaths := []string{
		"../escape.md",
		"/absolute.md",
		"C:/absolute.md",
		"notes/../../escape.md",
	}
	for _, path := range unsafePaths {
		if _, err := service.ReadMarkdown(path); err == nil {
			t.Fatalf("ReadMarkdown(%q) expected error", path)
		}
	}

	if _, err := service.SaveMarkdown("plain.txt", "nope"); err == nil {
		t.Fatal("SaveMarkdown(non-md) expected error")
	}
	if _, err := service.CreateMarkdown("../escape", "note.md"); err == nil {
		t.Fatal("CreateMarkdown(unsafe parent) expected error")
	}
}

func mustWriteFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func mustMkdir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
}
