package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type AppSettings struct {
	Values map[string]string `json:"values"`
}

func loadSettings() AppSettings {
	path, err := settingsPath()
	if err != nil {
		return defaultSettings()
	}
	return loadSettingsFromPath(path)
}

func loadSettingsFromPath(path string) AppSettings {
	content, err := os.ReadFile(path)
	if err != nil {
		return defaultSettings()
	}

	var settings AppSettings
	if err := json.Unmarshal(content, &settings); err != nil {
		return defaultSettings()
	}

	return normalizeSettings(settings)
}

func saveSettings(settings AppSettings) error {
	path, err := settingsPath()
	if err != nil {
		return err
	}
	return saveSettingsToPath(path, settings)
}

func saveSettingsToPath(path string, settings AppSettings) error {
	normalized := normalizeSettings(settings)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	content, err := json.MarshalIndent(normalized, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, content, 0o600)
}

func normalizeSettings(settings AppSettings) AppSettings {
	values := make(map[string]string, len(settings.Values))
	for key, value := range settings.Values {
		if key == "" {
			continue
		}
		values[key] = value
	}
	return AppSettings{Values: values}
}

func defaultSettings() AppSettings {
	return AppSettings{Values: map[string]string{}}
}

func settingsPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "donote", "settings.json"), nil
}
