# Donote Layout Redesign Design

Date: 2026-06-17

## Goal

Refactor Donote into a more modern, beautiful, and usable desktop Markdown note app
using Element Plus as the primary UI framework. The redesign should improve the
layout, control consistency, and information architecture while preserving the
existing note editing, workspace, save, search, theme, and settings behavior unless
explicitly called out below.

## Selected Direction

Use a full Element Plus migration with a Calm writing tool visual style.

The app should feel like a focused desktop writing workspace, not a marketing page
or a heavy admin system. The default theme should use light neutral surfaces,
subtle borders, white and off-white panels, and teal accents for active states and
primary actions. Dark mode remains supported and should use matching Element Plus
CSS variable overrides.

## Information Architecture

Use a right utility rail architecture.

The default workspace layout has:

- A compact top application bar.
- A persistent left workspace sidebar for opening folders, creating notes, and
  browsing the file tree.
- A central editor workspace with document tabs and the Milkdown editor surface.
- A narrow right utility rail with icon buttons for outline, search, and settings.
- A right drawer that opens the currently selected utility panel.

The old always-visible right outline panel is replaced by the utility rail and
drawer. This gives the editor more space by default while keeping outline, search,
and settings one click away.

## User Experience

The top application bar should contain the Donote identity, sidebar toggle,
formatting shortcuts, save status, search or utility access, settings access, and
theme toggle. Formatting shortcuts remain icon-first with tooltips.

The left sidebar should remain direct and efficient. Users should be able to open a
workspace, create a note, see the current workspace name, expand and collapse
folders, and select Markdown files. Folder collapse state remains persisted per
workspace.

The central workspace should keep multi-document editing. Open notes appear as
Element Plus tabs. Dirty documents are visibly marked. Closing a dirty document
requires confirmation. The active document shows its title and actions for rename
and delete above the editor.

The right utility rail should vertically group outline, search, and settings icons.
Clicking an icon opens the right drawer for that tool. Clicking the active tool can
close the drawer. Switching documents refreshes outline and search data for the
active document; search query follows the current behavior and resets when
switching documents.

## Component Architecture

Keep `App.vue` as the state orchestration layer. It owns Wails API calls and shared
application state, then passes data and callbacks into focused components.

Create these frontend components:

- `AppHeader.vue`: brand, sidebar toggle, formatting actions, save status, utility
  shortcuts, settings access, theme toggle.
- `WorkspaceSidebar.vue`: workspace open action, note creation, workspace title,
  Element Plus file tree, and folder expansion events.
- `DocumentTabs.vue`: open document tabs, active document selection, dirty state,
  and close events.
- `EditorSurface.vue`: document heading, rename and delete actions, and
  `MilkdownEditor` hosting.
- `UtilityRail.vue`: right-side icon rail and active utility selection.
- `UtilityDrawer.vue`: shared Element Plus drawer shell for outline, search, and
  settings panels.
- `OutlinePanel.vue`: active document outline display.
- `SearchPanel.vue`: current-document search input, result count, and previous/next
  navigation.
- `SettingsPanel.vue`: layout font size controls and save/cancel actions.

State flows from `App.vue` into components via props. Components emit user intents
back to `App.vue`; backend calls remain in `App.vue` so file system behavior stays
centralized and easier to test.

## Element Plus Usage

Element Plus should become the primary UI layer. Import Element Plus styles in the
frontend entry and use component-level imports or direct imports in Vue files.

Use Element Plus components as follows:

- `ElContainer`, `ElHeader`, `ElAside`, and `ElMain` for the app shell.
- `ElButton`, `ElButtonGroup`, and `ElTooltip` for top bar and tool controls.
- `ElTree` for the workspace file tree, with custom icons and active file styling.
- `ElTabs` and `ElTabPane` for open documents.
- `ElDrawer` for right-side outline, search, and settings panels.
- `ElDialog` and `ElMessageBox` for rename, delete, and dirty-close flows.
- `ElInput` for search and rename input.
- `ElForm` and `ElSlider` for settings controls.
- `ElAlert` or `ElMessage` for errors and transient feedback.
- `ElScrollbar` for file tree, editor shell, and drawer scrolling where useful.

The Milkdown editor remains the editing engine. The redesign should only wrap it in
a cleaner Element Plus-compatible editor surface and should not change the editor's
content synchronization model.

## Layout And Styling

Default dimensions:

- Left sidebar: about `280px`, collapsible.
- Right utility rail: about `48px`, fixed while visible.
- Right drawer: about `320px`.
- Editor document surface: centered with a readable max width and stable padding.

Use 8px-or-less border radii for panels and controls unless Element Plus defaults
are already close. Avoid decorative blobs, oversized hero styling, nested cards,
and single-hue palettes. The app should read as a practical desktop note tool.

Text must fit within buttons, tabs, tree rows, and drawer controls across the
supported desktop viewport. File and tab names should truncate with ellipsis
instead of resizing layout.

## Error Handling

Wails API failures should update the existing error state and also show immediate
Element Plus feedback with `ElMessage.error` where appropriate.

Use `ElMessageBox.confirm` for destructive or potentially lossy actions:

- Delete active document.
- Close a dirty tab.

Use `ElDialog` for rename. Validate empty names before calling the backend.

Save state remains visible in the top bar:

- `已保存`
- `正在保存`
- `有未保存更改`
- `保存失败`

## Testing And Verification

Update `frontend/src/App.test.ts` to cover the same behavior through the new
Element Plus-based UI:

- Empty workspace state.
- Restoring last workspace.
- Opening a workspace.
- Selecting files from the file tree.
- Opening multiple documents as tabs.
- Preserving dirty drafts across tab switches.
- Closing clean and dirty tabs.
- Saving only through Ctrl+S or explicit save action.
- Creating notes in the current workspace.
- Persisting folder collapse state.
- Applying layout font sizes only after saving settings.

Add focused component tests where they provide value, especially for component
emits and prop rendering. Do not duplicate all backend workflow tests in every
child component.

Keep existing `frontend/src/lib/*.test.ts` tests for search, outline, theme,
tree expansion, save queue, and layout font sizes. Only update them if the redesign
requires a real utility contract change.

Verification commands:

- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `go test ./...` if backend-generated bindings or Go-facing contracts change.

Because Element Plus adds dependencies, update and verify frontend dependency
metadata, including `frontend/package.json.md5` and any Wails-generated files when
required by the local Wails workflow.

Perform a visual check of these states before considering implementation complete:

- Empty state.
- Workspace with file tree.
- Active document with tabs.
- Outline drawer open.
- Search drawer open.
- Settings drawer open.
- Dark theme.
