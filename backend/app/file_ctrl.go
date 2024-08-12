package app

import "context"

type fileCtrl struct {
	ctx context.Context
}

func NewFileCtrlApp() *fileCtrl {
	return &fileCtrl{}
}

func (app *fileCtrl) Startup(ctx context.Context) {
	app.ctx = ctx
}

// func (app *fileCtrl) GetDirectoryTree() {

// }
