package main

import "testing"

func TestApplicationMenuContainsWorkspaceActions(t *testing.T) {
	app := NewApp()
	appMenu := app.applicationMenu()

	if len(appMenu.Items) != 1 {
		t.Fatalf("expected 1 top-level menu, got %d", len(appMenu.Items))
	}

	fileMenu := appMenu.Items[0]
	if fileMenu.Label != "文件" {
		t.Fatalf("expected file menu label 文件, got %q", fileMenu.Label)
	}
	if fileMenu.SubMenu == nil {
		t.Fatal("expected file menu to have a submenu")
	}
	if len(fileMenu.SubMenu.Items) != 2 {
		t.Fatalf("expected 2 file menu actions, got %d", len(fileMenu.SubMenu.Items))
	}

	openWorkspace := fileMenu.SubMenu.Items[0]
	if openWorkspace.Label != "打开文件夹" {
		t.Fatalf("expected open action label 打开文件夹, got %q", openWorkspace.Label)
	}
	if openWorkspace.Accelerator == nil || openWorkspace.Accelerator.Key != "o" {
		t.Fatalf("expected open action to use Ctrl/Cmd+O")
	}
	if openWorkspace.Click == nil {
		t.Fatal("expected open action to have a click callback")
	}

	createNote := fileMenu.SubMenu.Items[1]
	if createNote.Label != "新建笔记" {
		t.Fatalf("expected create action label 新建笔记, got %q", createNote.Label)
	}
	if createNote.Accelerator == nil || createNote.Accelerator.Key != "n" {
		t.Fatalf("expected create action to use Ctrl/Cmd+N")
	}
	if createNote.Click == nil {
		t.Fatal("expected create action to have a click callback")
	}
}
