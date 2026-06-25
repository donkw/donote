package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestLoadSettingsUsesEmptyValuesWhenNoSettingsFileExists(t *testing.T) {
	settings := loadSettingsFromPath(filepath.Join(t.TempDir(), "settings.json"))

	if len(settings.Values) != 0 {
		t.Fatalf("loadSettingsFromPath() = %#v, want empty values", settings.Values)
	}
}

func TestSaveSettingsWritesSettingsValues(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "settings.json")
	expected := AppSettings{
		Values: map[string]string{
			"donote.lastWorkspaceRoot": "D:/notes",
			"donote.theme":             "light",
		},
	}

	if err := saveSettingsToPath(path, expected); err != nil {
		t.Fatal(err)
	}

	settings := loadSettingsFromPath(path)
	if !reflect.DeepEqual(settings.Values, expected.Values) {
		t.Fatalf("loadSettingsFromPath() = %#v, want %#v", settings.Values, expected.Values)
	}
}

func TestLoadSettingsIgnoresMalformedSettingsFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	if err := os.WriteFile(path, []byte(`bad json`), 0o600); err != nil {
		t.Fatal(err)
	}

	settings := loadSettingsFromPath(path)

	if len(settings.Values) != 0 {
		t.Fatalf("loadSettingsFromPath() = %#v, want empty values", settings.Values)
	}
}
