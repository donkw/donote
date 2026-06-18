package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	defaultWindowWidth  = 1024
	defaultWindowHeight = 768
	minWindowWidth      = 800
	minWindowHeight     = 600
	maxWindowWidth      = 3840
	maxWindowHeight     = 2160
)

type WindowState struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

func loadWindowState() WindowState {
	path, err := windowStatePath()
	if err != nil {
		return defaultWindowState()
	}
	return loadWindowStateFromPath(path)
}

func loadWindowStateFromPath(path string) WindowState {
	content, err := os.ReadFile(path)
	if err != nil {
		return defaultWindowState()
	}

	var state WindowState
	if err := json.Unmarshal(content, &state); err != nil {
		return defaultWindowState()
	}

	return normalizeWindowState(state)
}

func saveWindowState(state WindowState) error {
	path, err := windowStatePath()
	if err != nil {
		return err
	}
	return saveWindowStateToPath(path, state)
}

func saveWindowStateToPath(path string, state WindowState) error {
	normalized := normalizeWindowState(state)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	content, err := json.Marshal(normalized)
	if err != nil {
		return err
	}
	return os.WriteFile(path, content, 0o600)
}

func normalizeWindowState(state WindowState) WindowState {
	return WindowState{
		Width:  clampInt(state.Width, minWindowWidth, maxWindowWidth),
		Height: clampInt(state.Height, minWindowHeight, maxWindowHeight),
	}
}

func defaultWindowState() WindowState {
	return WindowState{Width: defaultWindowWidth, Height: defaultWindowHeight}
}

func windowStatePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "donote", "window.json"), nil
}

func clampInt(value int, min int, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
