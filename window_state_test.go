package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadWindowStateUsesDefaultsWhenNoStateExists(t *testing.T) {
	state := loadWindowStateFromPath(filepath.Join(t.TempDir(), "window.json"))

	if state.Width != defaultWindowWidth || state.Height != defaultWindowHeight {
		t.Fatalf("loadWindowStateFromPath() = %+v, want default %dx%d", state, defaultWindowWidth, defaultWindowHeight)
	}
}

func TestLoadWindowStateNormalizesSavedState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "window.json")
	if err := os.WriteFile(path, []byte(`{"width":400,"height":500}`), 0o600); err != nil {
		t.Fatal(err)
	}

	state := loadWindowStateFromPath(path)

	if state.Width != minWindowWidth || state.Height != minWindowHeight {
		t.Fatalf("loadWindowStateFromPath() = %+v, want %dx%d", state, minWindowWidth, minWindowHeight)
	}
}

func TestSaveWindowStateWritesNormalizedState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "window.json")

	if err := saveWindowStateToPath(path, WindowState{Width: 1600, Height: 900}); err != nil {
		t.Fatal(err)
	}

	state := loadWindowStateFromPath(path)
	if state.Width != 1600 || state.Height != 900 {
		t.Fatalf("loadWindowStateFromPath() = %+v, want 1600x900", state)
	}
}

func TestLoadWindowStateIgnoresMalformedState(t *testing.T) {
	path := filepath.Join(t.TempDir(), "window.json")
	if err := os.WriteFile(path, []byte(`bad json`), 0o600); err != nil {
		t.Fatal(err)
	}

	state := loadWindowStateFromPath(path)

	if state.Width != defaultWindowWidth || state.Height != defaultWindowHeight {
		t.Fatalf("loadWindowStateFromPath() = %+v, want default %dx%d", state, defaultWindowWidth, defaultWindowHeight)
	}
}
