package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	menuOpenWorkspaceEvent = "menu:open-workspace"
	menuCreateNoteEvent    = "menu:create-note"
)

// App struct
type App struct {
	ctx       context.Context
	workspace *WorkspaceService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) applicationMenu() *menu.Menu {
	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("文件")
	fileMenu.AddText("打开文件夹", keys.CmdOrCtrl("o"), a.emitMenuEvent(menuOpenWorkspaceEvent))
	fileMenu.AddText("新建笔记", keys.CmdOrCtrl("n"), a.emitMenuEvent(menuCreateNoteEvent))
	return appMenu
}

func (a *App) emitMenuEvent(eventName string) menu.Callback {
	return func(_ *menu.CallbackData) {
		if a.ctx == nil {
			return
		}
		runtime.EventsEmit(a.ctx, eventName)
	}
}

func (a *App) SelectWorkspace() (WorkspaceInfo, error) {
	selectedPath, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择笔记文件夹",
	})
	if err != nil {
		return WorkspaceInfo{}, err
	}
	if selectedPath == "" {
		return WorkspaceInfo{}, nil
	}
	return a.OpenWorkspace(selectedPath)
}

func (a *App) OpenWorkspace(rootPath string) (WorkspaceInfo, error) {
	service, err := NewWorkspaceService(rootPath)
	if err != nil {
		return WorkspaceInfo{}, err
	}
	a.workspace = service
	return service.WorkspaceInfo()
}

func (a *App) ListWorkspace() ([]FileNode, error) {
	service, err := a.requireWorkspace()
	if err != nil {
		return nil, err
	}
	return service.ListWorkspace()
}

func (a *App) ReadMarkdown(relativePath string) (Document, error) {
	service, err := a.requireWorkspace()
	if err != nil {
		return Document{}, err
	}
	return service.ReadMarkdown(relativePath)
}

func (a *App) SaveMarkdown(relativePath string, content string) (SaveResult, error) {
	service, err := a.requireWorkspace()
	if err != nil {
		return SaveResult{}, err
	}
	return service.SaveMarkdown(relativePath, content)
}

func (a *App) CreateMarkdown(parentRelativePath string, name string) (FileNode, error) {
	service, err := a.requireWorkspace()
	if err != nil {
		return FileNode{}, err
	}
	return service.CreateMarkdown(parentRelativePath, name)
}

func (a *App) RenamePath(relativePath string, newName string) (FileNode, error) {
	service, err := a.requireWorkspace()
	if err != nil {
		return FileNode{}, err
	}
	return service.RenamePath(relativePath, newName)
}

func (a *App) DeletePath(relativePath string) error {
	service, err := a.requireWorkspace()
	if err != nil {
		return err
	}
	return service.DeletePath(relativePath)
}

func (a *App) requireWorkspace() (*WorkspaceService, error) {
	if a.workspace == nil {
		return nil, ErrWorkspaceNotSelected
	}
	return a.workspace, nil
}
