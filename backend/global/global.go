package global

import (
	"donote/backend/config"

	"go.uber.org/zap"
)

var (
	CONFIG *config.Config
	LOG    *zap.Logger
)
