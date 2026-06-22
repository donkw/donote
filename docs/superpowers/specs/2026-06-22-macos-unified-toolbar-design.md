# macOS Unified Toolbar UI Redesign

## Summary

Donote will be redesigned in two phases. Phase 1 rebuilds the in-app shell to feel like a macOS GUI application while keeping the native Wails window frame. Phase 2, if requested after Phase 1, will evaluate a frameless custom window with self-drawn controls.

This spec covers Phase 1 only.

## Goals

- Make the first screen read as a macOS-style desktop app content area, not a web page.
- Introduce a unified in-app toolbar that becomes the primary command surface.
- Keep Donote's current note workflows intact: workspace tree, multi-document tabs, editor search, save, theme toggle, outline, settings, attachment paste, and format insertion.
- Remove the visual dominance of the permanent right utility rail.
- Keep the backend and Wails window configuration unchanged for Phase 1.

## Non-Goals

- Do not hide the system window title bar.
- Do not add self-drawn traffic-light window controls.
- Do not change workspace file operations, save behavior, attachment handling, or Markdown editor internals.
- Do not replace Element Plus, Milkdown, or lucide icons.
- Do not convert the app to an Apple Notes three-column model in Phase 1.

## Chosen Direction

Use the "unified titlebar toolbar" direction inspired by Finder and Preview:

- A top in-app toolbar holds common commands.
- The left workspace tree becomes a macOS source list.
- The center remains a document editor with lightweight tabs.
- The utility drawer remains available for outline and settings, but its entry points move into the toolbar.

This direction preserves the existing Donote mental model while giving the interface a macOS desktop character.

## Architecture

### Existing Shell

The current shell is assembled in `frontend/src/App.vue`:

- `WorkspaceSidebar` renders the workspace tree.
- `DocumentTabs` renders open document tabs.
- `EditorSurface` hosts the Milkdown editor.
- `UtilityRail` provides permanent right-side icon actions.
- `UtilityDrawer` renders outline and settings.

### New Shell

Phase 1 will change the app shell to:

- Add a new `MacToolbar.vue` component.
- Place `MacToolbar` above the main workspace layout.
- Remove `UtilityRail` as a permanent visual column.
- Keep `UtilityDrawer`, controlled from toolbar buttons.
- Keep `DocumentTabs`, but restyle it as a quiet document switcher.
- Keep `WorkspaceSidebar`, restyled as a macOS source list.

The high-level layout becomes:

```text
app-shell
  error-banner, if present
  mac-toolbar
  workspace-layout
    workspace-sidebar
    sidebar-resizer
    editor-pane
      document-tabs
      search-panel, when open
      editor-surface
    utility-drawer, overlay
```

## Components

### MacToolbar

Create `frontend/src/components/MacToolbar.vue`.

Responsibilities:

- Render icon buttons for theme, save, outline, search, and settings.
- Show save state through icon state, disabled state, or small status treatment.
- Display contextual text such as workspace name or active document name without becoming a large header.
- Emit events instead of owning app behavior.

Props:

- `workspaceName: string`
- `activeDocumentName: string`
- `activePanel: UtilityPanel`
- `drawerOpen: boolean`
- `theme: ThemeMode`
- `saveState: SaveState`
- `searchOpen: boolean`

Events:

- `save`
- `search`
- `toggle-theme`
- `select(panel: UtilityPanel)`

Accessibility:

- Icon-only buttons must have `aria-label`.
- Settings button must retain a clear accessible name.
- Disabled save state must remain keyboard and screen-reader understandable.

### WorkspaceSidebar

Keep behavior unchanged. Restyle as source list:

- Translucent light gray surface.
- Compact rows.
- Rounded selected state.
- Subtle hierarchy lines.
- Search field styled like a macOS sidebar search input.
- Context menu behavior unchanged.

### DocumentTabs

Keep behavior unchanged. Restyle as a quiet document switcher:

- Lower visual height than the current card-tab look.
- Active tab should connect softly to the editor area.
- Dirty mark and close button remain visible.
- Text truncation remains stable.

### EditorSurface and Milkdown

Keep logic unchanged. Restyle the shell:

- Reduce paper-card heaviness.
- Make the editor content feel like a macOS document surface.
- Keep the existing editor width setting.
- Keep the existing inline/sticky format toolbar unless the implementation moves format controls into the new toolbar with equal behavior and tests.

### UtilityDrawer

Keep drawer content and behavior. The drawer remains the container for:

- Outline
- Settings

The drawer is opened from the new toolbar. The permanent right `UtilityRail` should not remain visible in Phase 1.

## Interactions

- Search toolbar button toggles the existing editor search panel.
- Save toolbar button calls the existing save flow and is disabled while saving.
- Theme toolbar button calls the existing theme toggle flow.
- Outline toolbar button toggles `UtilityDrawer` with the outline panel.
- Settings toolbar button toggles `UtilityDrawer` with the settings panel.
- Sidebar resize behavior remains unchanged.
- File tree right-click actions remain unchanged.
- Document tab close and switch behavior remains unchanged.
- Keyboard shortcuts remain unchanged.

## Styling Direction

Use a macOS-like content shell, not a literal clone:

- Light mode: soft gray app background, translucent sidebar/toolbar feel, white editor surface.
- Dark mode: neutral blue-gray surfaces with subdued contrast.
- Use 6-10px radii, not pill-heavy or marketing-style shapes.
- Use restrained shadows and hairline borders.
- Keep dense desktop ergonomics.
- Avoid decorative gradients, orbs, large hero-style typography, and card-in-card layouts.

## Files Expected To Change

- Create `frontend/src/components/MacToolbar.vue`
- Create `frontend/src/components/MacToolbar.test.ts`
- Modify `frontend/src/App.vue`
- Modify `frontend/src/App.test.ts`
- Modify `frontend/src/style.css`
- Modify `frontend/src/style.test.ts`
- Modify or remove `frontend/src/components/UtilityRail.test.ts` only if `UtilityRail` is no longer rendered

The implementation should avoid backend changes unless a future Phase 2 window-frame task explicitly requires them.

## Testing Plan

Frontend tests:

- `MacToolbar.test.ts` verifies button order, accessible names, disabled save behavior, and emitted events.
- `App.test.ts` verifies toolbar actions trigger existing save, search, theme, outline, and settings flows.
- Existing `WorkspaceSidebar`, `DocumentTabs`, `EditorSurface`, and drawer tests remain valid or are updated only for expected shell changes.
- `style.test.ts` asserts macOS shell styling hooks: toolbar exists, source-list styling exists, permanent right rail is not part of the main grid, and toolbar/sidebar palette variables are present.

Commands:

```powershell
npm --prefix frontend test
npm --prefix frontend run build
go test ./...
```

## Acceptance Criteria

- The app content area visually reads as macOS-style desktop software.
- A unified top toolbar is the primary command surface.
- The left workspace tree reads as a macOS source list.
- The permanent right utility rail is no longer visible in the default shell.
- Outline and settings remain accessible through the toolbar and drawer.
- Current core note workflows continue to pass tests.
- Phase 1 does not introduce frameless-window behavior or self-drawn window controls.

## Phase 2 Evaluation

After Phase 1 is visually accepted, evaluate whether to hide the native window frame and draw custom traffic-light controls. That work needs a separate design because it affects Wails window options, drag regions, platform-specific behavior, accessibility, and close/minimize/maximize interactions.
