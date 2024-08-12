package main

import (
	"context"
	"donote/backend"
	"donote/backend/global"
	"donote/backend/initialize"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"go.uber.org/zap"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const windowTitle = "donote"

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// initial
	global.CONFIG = initialize.Config()
	global.LOG = initialize.Zap()

	app := backend.NewApp()
	appMenu := menu.NewMenu()
	opMenu := appMenu.AddSubmenu("Menu")
	opMenu.AddText("Reload", keys.CmdOrCtrl("r"), func(cd *menu.CallbackData) {
		wailsRuntime.WindowReloadApp(app.Ctx)
	})
	opMenu.AddText("Settings", &keys.Accelerator{}, func(cd *menu.CallbackData) {
		wailsRuntime.EventsEmit(app.Ctx, "openSettings")
	})

	err := wails.Run(&options.App{
		Title:              windowTitle,
		Width:              1230,
		Height:             923,
		Logger:             nil,
		LogLevel:           logger.INFO,
		LogLevelProduction: logger.ERROR,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			app.Startup(ctx)
		},
		Menu: appMenu,
		Bind: app.Bind(),
	})
	if err != nil {
		global.LOG.Error("wails error", zap.Error(err))
		return
	}
	global.LOG.Info("program running...")
}
