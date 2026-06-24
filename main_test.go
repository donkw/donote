package main

import "testing"

func TestAppTitle(t *testing.T) {
	if appTitle != "DoNote" {
		t.Fatalf("app title = %q, want %q", appTitle, "DoNote")
	}
}
