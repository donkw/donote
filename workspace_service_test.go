package main

import (
	"encoding/base64"
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

func TestWorkspaceServiceCreateFolder(t *testing.T) {
	root := t.TempDir()
	mustMkdir(t, filepath.Join(root, "projects"))
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	created, err := service.CreateFolder("projects", "archive")
	if err != nil {
		t.Fatalf("CreateFolder() error = %v", err)
	}
	if created.Path != "projects/archive" || created.Name != "archive" || created.Type != "folder" {
		t.Fatalf("unexpected created folder node: %#v", created)
	}
	info, err := os.Stat(filepath.Join(root, "projects", "archive"))
	if err != nil {
		t.Fatalf("expected folder to exist: %v", err)
	}
	if !info.IsDir() {
		t.Fatalf("expected created path to be a folder")
	}

	if _, err := service.CreateFolder("projects", "archive"); err == nil {
		t.Fatal("CreateFolder(duplicate) expected error")
	}
	if _, err := service.CreateFolder("projects", "../escape"); err == nil {
		t.Fatal("CreateFolder(unsafe name) expected error")
	}
	if _, err := service.CreateFolder("../escape", "notes"); err == nil {
		t.Fatal("CreateFolder(unsafe parent) expected error")
	}
}

func TestWorkspaceServiceSaveAttachment(t *testing.T) {
	root := t.TempDir()
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	payload := base64.StdEncoding.EncodeToString([]byte("image-bytes"))
	created, err := service.SaveAttachment("assets/images", "photo.png", "image/png", payload)
	if err != nil {
		t.Fatalf("SaveAttachment() error = %v", err)
	}
	if created.Name != "photo.png" || created.Path != "assets/images/photo.png" {
		t.Fatalf("unexpected attachment: %#v", created)
	}
	content, err := os.ReadFile(filepath.Join(root, "assets", "images", "photo.png"))
	if err != nil {
		t.Fatalf("expected attachment to be written: %v", err)
	}
	if string(content) != "image-bytes" {
		t.Fatalf("unexpected attachment content: %q", string(content))
	}

	duplicate, err := service.SaveAttachment("assets/images", "photo.png", "image/png", payload)
	if err != nil {
		t.Fatalf("SaveAttachment(duplicate) error = %v", err)
	}
	if duplicate.Path != "assets/images/photo-1.png" {
		t.Fatalf("expected duplicate name to get suffix, got %#v", duplicate)
	}

	if _, err := service.SaveAttachment("../outside", "photo.png", "image/png", payload); err == nil {
		t.Fatal("SaveAttachment(unsafe directory) expected error")
	}
	if _, err := service.SaveAttachment("assets", "../escape.png", "image/png", payload); err == nil {
		t.Fatal("SaveAttachment(unsafe name) expected error")
	}
	if _, err := service.SaveAttachment("assets", "bad.bin", "", "not-base64"); err == nil {
		t.Fatal("SaveAttachment(invalid base64) expected error")
	}

	emptyAttachment, err := service.SaveAttachment("assets/files", "empty.txt", "text/plain", "")
	if err != nil {
		t.Fatalf("SaveAttachment(empty) error = %v", err)
	}
	if emptyAttachment.Path != "assets/files/empty.txt" {
		t.Fatalf("expected empty attachment path, got %#v", emptyAttachment)
	}
	emptyContent, err := os.ReadFile(filepath.Join(root, "assets", "files", "empty.txt"))
	if err != nil {
		t.Fatalf("expected empty attachment to be written: %v", err)
	}
	if len(emptyContent) != 0 {
		t.Fatalf("expected empty attachment content, got %d bytes", len(emptyContent))
	}

	rootAttachment, err := service.SaveAttachment(".", "root.png", "image/png", payload)
	if err != nil {
		t.Fatalf("SaveAttachment(root) error = %v", err)
	}
	if rootAttachment.Path != "root.png" {
		t.Fatalf("expected root attachment path, got %#v", rootAttachment)
	}
}

func TestWorkspaceServiceResolveImageSource(t *testing.T) {
	root := t.TempDir()
	mustMkdir(t, filepath.Join(root, "notes"))
	mustMkdir(t, filepath.Join(root, "assets", "images"))
	mustWriteFile(t, filepath.Join(root, "notes", "intro.md"), "# Intro")
	imageBytes := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}
	imagePath := filepath.Join(root, "assets", "images", "photo one.png")
	if err := os.WriteFile(imagePath, imageBytes, 0o644); err != nil {
		t.Fatalf("write image: %v", err)
	}
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	source, err := service.ResolveImageSource("notes/intro.md", "../assets/images/photo%20one.png")
	if err != nil {
		t.Fatalf("ResolveImageSource() error = %v", err)
	}
	expected := "data:image/png;base64," + base64.StdEncoding.EncodeToString(imageBytes)
	if source != expected {
		t.Fatalf("unexpected image source: %q", source)
	}

	if _, err := service.ResolveImageSource("notes/intro.md", "../../outside.png"); err == nil {
		t.Fatal("ResolveImageSource(outside workspace) expected error")
	}
	if _, err := service.ResolveImageSource("notes/intro.md", "https://example.com/photo.png"); err == nil {
		t.Fatal("ResolveImageSource(external) expected error")
	}
	mustWriteFile(t, filepath.Join(root, "assets", "images", "note.txt"), "not image")
	if _, err := service.ResolveImageSource("notes/intro.md", "../assets/images/note.txt"); err == nil {
		t.Fatal("ResolveImageSource(non-image) expected error")
	}
}

func TestWorkspaceServiceRelativeDirectoryPath(t *testing.T) {
	root := t.TempDir()
	mustMkdir(t, filepath.Join(root, "assets", "images"))
	mustWriteFile(t, filepath.Join(root, "note.md"), "# Note")
	service, err := NewWorkspaceService(root)
	if err != nil {
		t.Fatalf("NewWorkspaceService() error = %v", err)
	}

	relative, err := service.RelativeDirectoryPath(filepath.Join(root, "assets", "images"))
	if err != nil {
		t.Fatalf("RelativeDirectoryPath() error = %v", err)
	}
	if relative != "assets/images" {
		t.Fatalf("expected assets/images, got %q", relative)
	}

	rootRelative, err := service.RelativeDirectoryPath(root)
	if err != nil {
		t.Fatalf("RelativeDirectoryPath(root) error = %v", err)
	}
	if rootRelative != "." {
		t.Fatalf("expected root directory to become '.', got %q", rootRelative)
	}

	if _, err := service.RelativeDirectoryPath(filepath.Join(root, "note.md")); err == nil {
		t.Fatal("RelativeDirectoryPath(file) expected error")
	}
	if _, err := service.RelativeDirectoryPath(filepath.Dir(root)); err == nil {
		t.Fatal("RelativeDirectoryPath(outside workspace) expected error")
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
