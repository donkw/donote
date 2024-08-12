package config

type Config struct {
	Zap Zap `mapstructure:"zap" json:"zap,omitempty" yaml:"zap"`
}
