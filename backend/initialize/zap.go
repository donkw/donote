package initialize

import (
	"donote/backend/global"
	"donote/backend/initialize/internal"
	"donote/backend/util"
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Zap 获取zap.Logger
func Zap() (logger *zap.Logger) {
	// 创建对应目录
	// if ok, _ := util.PathExists(global.CONFIG.Zap.Director); !ok {
	if ok, _ := util.PathExists(global.CONFIG.Zap.Director); !ok {
		fmt.Printf("create zap log directory: %s\n", global.CONFIG.Zap.Director)
		_ = os.Mkdir(global.CONFIG.Zap.Director, os.ModePerm)
	}
	_Zap := new(_zap)
	logger = zap.New(zapcore.NewTee(_Zap.GetZapCores()...))
	if global.CONFIG.Zap.ShowLine {
		logger = logger.WithOptions(zap.AddCaller())
	}
	return logger
}

type _zap struct{}

// GetZapCores 根据配置文件的Level获取 []zapcore.Core
func (z *_zap) GetZapCores() []zapcore.Core {
	cores := make([]zapcore.Core, 0, 7)
	for level := global.CONFIG.Zap.TransportLevel(); level <= zapcore.FatalLevel; level++ {
		cores = append(cores, z.GetEncoderCore(level, z.GetLevelPriority(level)))
	}
	return cores
}

// GetEncoderCore 获取Encoder的zapcore.Core
func (z *_zap) GetEncoderCore(level zapcore.Level, levelFunc zap.LevelEnablerFunc) zapcore.Core {
	// 使用file-rotatelogs分割日志
	writer, err := internal.FileRotateLogs.GetWriteSyncer(level.String())
	if err != nil {
		fmt.Printf("get Writer Syncer failed, error: %v\n", err.Error())
		return nil
	}
	return zapcore.NewCore(z.GetEncoder(), writer, levelFunc)
}

// GetEncoder 获取 zapcore.Encoder
func (z *_zap) GetEncoder() zapcore.Encoder {
	if global.CONFIG.Zap.Format == "json" {
		return zapcore.NewJSONEncoder(z.GetEncoderConfig())
	}
	return zapcore.NewConsoleEncoder(z.GetEncoderConfig())
}

// GetEncoderConfig 获取zapcore.EncoderConfig
func (z *_zap) GetEncoderConfig() zapcore.EncoderConfig {
	return zapcore.EncoderConfig{
		MessageKey:     "message",
		LevelKey:       "level",
		TimeKey:        "time",
		NameKey:        "logger",
		CallerKey:      "caller",
		StacktraceKey:  global.CONFIG.Zap.StacktraceKey,
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    global.CONFIG.Zap.ZapEncodeLevel(),
		EncodeTime:     z.CustomTimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.FullCallerEncoder,
	}
}

// CustomTimeEncoder 自定义日志输出时间格式
func (z *_zap) CustomTimeEncoder(t time.Time, encoder zapcore.PrimitiveArrayEncoder) {
	encoder.AppendString(global.CONFIG.Zap.Prefix + t.Format("2006/01/02 - 15:04:05.000"))
}

// GetLevelPriority 根据zap.Level获取zap.LevelEnablerFunc
func (z *_zap) GetLevelPriority(level zapcore.Level) zap.LevelEnablerFunc {
	switch level {
	case zapcore.DebugLevel:
		return zapLevelEnablerFunc(zap.DebugLevel) // 调试级别
	case zapcore.InfoLevel:
		return zapLevelEnablerFunc(zap.InfoLevel) // 日志级别
	case zapcore.WarnLevel:
		return zapLevelEnablerFunc(zap.WarnLevel) // 警告级别
	case zapcore.ErrorLevel:
		return zapLevelEnablerFunc(zap.ErrorLevel) // 错误级别
	case zapcore.DPanicLevel:
		return zapLevelEnablerFunc(zap.DPanicLevel) // dpanic级别
	case zapcore.PanicLevel:
		return zapLevelEnablerFunc(zap.PanicLevel) // panic级别
	case zapcore.FatalLevel:
		return zapLevelEnablerFunc(zap.FatalLevel) // 终止级别
	default:
		return zapLevelEnablerFunc(zap.DebugLevel) // 默认：调试级别
	}
}

func zapLevelEnablerFunc(zlevel zapcore.Level) func(l zapcore.Level) bool {
	return func(l zapcore.Level) bool {
		return l == zlevel
	}
}
