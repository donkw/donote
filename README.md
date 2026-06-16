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
- View a heading outline and switch between light and dark themes.

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
