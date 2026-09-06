# Donote

Donote is a Windows-first desktop Markdown note app built with Wails, Go,
Vue 3, TypeScript, and Milkdown.

## Features

- Open a local folder as a Markdown workspace and restore the last workspace on launch.
- Browse folders and `.md` files in a collapsible file tree.
- Edit multiple Markdown notes in tabs with a Typora-style Milkdown editor.
- Save changes manually with `Ctrl+S` or the toolbar save button.
- Create, rename, and delete Markdown notes.
- Search inside the current document with `Ctrl+F`.
- View a heading outline and switch between coordinated Apple-inspired light and dark themes.
- Start a new note directly from the toolbar or the open-workspace empty state.
- Keep edits made during an in-flight save marked as unsaved; late file reads cannot steal the active tab.
- Paste attachments into the note where the paste started, even when switching tabs during upload.
- Confirm before quitting with unsaved notes; saving in progress keeps the window open.

## Development

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run the desktop app in live development mode:

```bash
wails dev
```

## Verification

Run backend tests:

```bash
go test ./...
```

Run frontend tests and build:

```bash
cd frontend
npm test
npm run build
```

Build the Windows desktop executable:

```bash
wails build
```

The built executable is written to `build/bin/donote.exe`.

## Release

When publishing a new version, create the GitHub Release from the new version
tag and upload `build/bin/donote.exe` as a release asset. Every new release must
include the built Windows executable.

## Interaction verification

The shell workflow tests cover delayed saves, out-of-order reads, attachment uploads
across tab switches, and cancellation of the native close-request event. The editor
was visually checked in a browser with a mocked Wails bridge in light/dark themes
and at a 1000px desktop width. Native Windows close-button/event delivery still
requires a desktop smoke test; browser checks do not exercise WebView2 or disk I/O.
