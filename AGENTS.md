# Repository Guidelines

## Project Structure & Module Organization

Donote is a Wails desktop Markdown note app. Go backend code lives at the
repository root: `main.go` starts Wails, `app.go` exposes methods to the
frontend, and `workspace_service.go` handles workspace file operations. Backend
tests use `*_test.go`, currently `workspace_service_test.go`.

The Vue 3 and TypeScript frontend lives in `frontend/src`. The main shell is
`frontend/src/App.vue`, editor components are in `frontend/src/components`, and
small reusable utilities with tests are in `frontend/src/lib`. Static assets are
under `frontend/src/assets`. Generated Wails bindings live in `frontend/wailsjs`;
do not edit them by hand.

## Build, Test, and Development Commands

- `wails dev`: run the desktop app with frontend live reload.
- `go test ./...`: run backend Go tests.
- `npm --prefix frontend test`: run Vitest frontend tests.
- `npm --prefix frontend run build`: type-check with `vue-tsc` and build the
  frontend with Vite.
- `wails build`: build the Windows executable at `build/bin/donote.exe`.

Run `npm install` from `frontend` if dependencies are missing.

## Coding Style & Naming Conventions

Format Go code with `gofmt`; use exported PascalCase names only for Wails APIs
or shared data types. Keep backend path handling defensive and return clear
errors for invalid workspace operations.

Frontend code uses Vue single-file components with `<script setup lang="ts">`.
Use two-space indentation in Vue and TypeScript files, camelCase for functions
and refs, PascalCase for components, and `*.test.ts` for utility tests. Prefer
existing helper modules in `frontend/src/lib` before adding new abstractions.

## Testing Guidelines

Backend tests use Go's standard `testing` package. Frontend tests use Vitest and
Vue Test Utils with jsdom. Add or update tests next to changed behavior:
`workspace_service_test.go` for file-system rules, `frontend/src/lib/*.test.ts`
for utilities, and `frontend/src/App.test.ts` for UI workflow behavior.

## Commit & Pull Request Guidelines

This checkout has no Git history, so no local commit convention can be inferred.
Use short, imperative commit subjects such as `Add workspace rename validation`
or `Fix editor save status`. Pull requests should include a concise summary,
test results, linked issues when applicable, and screenshots or recordings for
visible UI changes.

## Release Guidelines

When publishing a new version, run `wails build` and upload
`build/bin/donote.exe` to the GitHub Release assets. Every release must include
the built Windows executable.

## Security & Configuration Tips

Keep all file access constrained to the selected workspace. Avoid accepting
absolute paths or `..` traversal from the frontend. Do not commit local build
outputs from `build/`, generated dependency folders, or machine-specific Wails
artifacts.
