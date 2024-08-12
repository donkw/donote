package initialize

import "donote/backend/config"

func Config() *config.Config {
	return &config.Config{
		Zap: config.Zap{
			Level:         "info",
			Format:        "console",
			Prefix:        "[github.com/donkw/prodsel_crawler]",
			Director:      "log",
			ShowLine:      true,
			EncodeLevel:   "LowercaseColorLevelEncoder",
			StacktraceKey: "stacktrace",
			LogInConsole:  true,
		},
	}
}
