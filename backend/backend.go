package backend

import (
	"context"
	"donote/backend/app"
)

type apper interface {
	Startup(context.Context)
}
type collection struct {
	Ctx  context.Context
	List []apper
}

func NewApp() *collection {
	return &collection{
		List: []apper{
			app.NewCommonApp(),
			app.NewFileCtrlApp(),
		},
	}
}

func (c *collection) Startup(ctx context.Context) {
	c.Ctx = ctx
	for _, v := range c.List {
		v.Startup(ctx)
	}
}
func (c *collection) Bind() (apps []interface{}) {
	for _, v := range c.List {
		apps = append(apps, v)
	}
	return
}
