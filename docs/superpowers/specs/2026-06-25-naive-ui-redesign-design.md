# Donote Naive UI Redesign

Date: 2026-06-25

## Summary

Donote will be redesigned as a professional desktop writing tool and will replace
Element Plus with Naive UI across the frontend shell. The Markdown editor remains
Milkdown, icons remain lucide, and the Wails backend behavior remains unchanged.

This spec supersedes earlier visual assumptions that depended on Element Plus
styling. Prior layout goals such as a polished desktop shell, quiet document
tabs, source-list navigation, dark mode, and a focused editor surface remain in
scope.

## Goals

- Replace Element Plus with Naive UI for application controls, overlays,
  messages, dialogs, forms, sliders, inputs, scrollbars, tabs where appropriate,
  and empty states.
- Create a calmer professional desktop writing interface while preserving the
  current three-area workflow: workspace tree, editor, and utility drawer.
- Use custom Donote design tokens for color, spacing, radii, shadows, focus
  states, and typography instead of relying on framework defaults.
- Keep the existing workflows intact: workspace open/restore, file tree search,
  file/folder actions, document tabs, editor search, save, theme toggle, outline,
  settings, attachment paste, and format insertion.
- Improve light and dark mode consistency through a Naive UI theme bridge and
  shared CSS variables.
- Keep the implementation testable by changing display components without moving
  Wails calls or shared app state.

## Non-Goals

- Do not change backend workspace operations, path validation, save behavior, or
  attachment storage semantics.
- Do not replace Milkdown or change Markdown editing internals.
- Do not add new product features such as split panes, backlinks, graph view,
  drag-and-drop tree reordering, or command palette search.
- Do not introduce frameless Wails window controls or custom OS titlebar behavior.
- Do not keep Element Plus as a runtime dependency after migration unless a
  temporary compatibility step is explicitly needed during implementation.

## Chosen Direction

Use the "Focused Desktop Polish" direction:

- Preserve the familiar left tree, center editor, and right utility drawer.
- Replace the Element Plus visual language with Naive UI plus Donote-specific
  styling.
- Make the interface feel like a desktop writing tool rather than a generic web
  admin panel.
- Use restrained surfaces, clear borders, 8px-or-less radii, readable contrast,
  and subtle state transitions.

Naive UI is the preferred framework because it is Vue 3 native, TypeScript
friendly, has stronger built-in theme support than Element Plus for this use
case, and is easier to bend toward a modern desktop app aesthetic.

## Architecture

### Current Shell

The frontend shell is orchestrated in `frontend/src/App.vue`:

- `WorkspaceSidebar` renders the workspace tree and context menu.
- `DocumentTabs` renders open Markdown documents.
- `SearchPanel` renders in-document search.
- `EditorSurface` hosts `MilkdownEditor`.
- `CommandToolbar` exposes save, search, outline, settings, and theme controls.
- `UtilityDrawer` renders outline and settings.

The app currently imports Element Plus globally in `frontend/src/main.ts` and
uses `ElMessage` and `ElMessageBox` directly in `App.vue`.

### New Shell

Add Naive UI providers at the app root:

```text
NConfigProvider
  NDialogProvider
    NMessageProvider
      App
```

The shell remains structurally similar:

```text
app-shell
  error-banner, if present
  command-toolbar
  workspace-layout
    workspace-sidebar
    sidebar-resizer
    editor-pane
      document-tabs
      search-panel, when open
      editor-surface
    utility-drawer overlay
```

`App.vue` remains the state and workflow owner. It should use Naive UI's
composition APIs for message and dialog feedback instead of Element Plus globals.

## Framework Migration Map

Replace Element Plus usage as follows:

| Current Element Plus | Target |
| --- | --- |
| `ElButton` | `NButton` or custom icon button where tighter control is needed |
| `ElInput` | `NInput` |
| `ElDrawer` | `NDrawer` with `NDrawerContent` |
| `ElTabs` / `ElTabPane` | Custom document tab bar, or `NTabs` only if it does not constrain styling |
| `ElEmpty` | `NEmpty` or custom empty-state block |
| `ElScrollbar` | Native scroll containers or `NScrollbar` |
| `ElTree` | Custom recursive tree component |
| `ElForm` / `ElFormItem` | `NForm` / `NFormItem` |
| `ElSlider` | `NSlider` plus number input if needed |
| `ElTooltip` | `NTooltip` |
| `ElButtonGroup` | Custom toolbar grouping |
| `ElMessage` | `useMessage()` |
| `ElMessageBox.prompt` | `useDialog()` with dedicated prompt dialog component |
| `ElMessageBox.confirm` | `useDialog().warning()` / `useDialog().error()` as appropriate |

## Component Design

### App Root And Theme Provider

`frontend/src/main.ts` should stop importing Element Plus CSS. It should mount a
small provider wrapper component or configure providers directly around `App`.

The provider must:

- Select Naive UI light or dark theme based on the existing `theme` mode.
- Expose theme overrides mapped from Donote tokens.
- Preserve the current `applyTheme()` behavior so CSS variables and document
  theme attributes remain available to non-Naive UI surfaces.

### CommandToolbar

Keep `CommandToolbar.vue` as the command surface and migrate it to Naive UI.

Requirements:

- Continue using lucide icons.
- Keep icon-only buttons labelled with `aria-label` and `title`.
- Use 32px to 36px visual controls with at least 36px hit targets for desktop
  ergonomics.
- Save button must disable or show loading while `saveState === 'saving'`.
- Active search, outline, or settings state must be visually clear without
  relying on color alone.

### WorkspaceSidebar

Replace `ElTree` with a custom recursive tree component inside
`WorkspaceSidebar.vue` or a focused child component such as
`WorkspaceTreeNode.vue`.

Requirements:

- Preserve the synthetic workspace root node.
- Preserve file tree search behavior using existing filter semantics.
- Preserve controlled expansion through `expandedFolderPaths`.
- Preserve root expansion state.
- Preserve right-click context menu actions and event names.
- Preserve current `data-test` identifiers where practical.
- Use stable row heights, indentation, chevrons, folder/file/workspace icons, and
  ellipsis truncation.
- Use native buttons for rows so keyboard focus and activation remain available.

This custom tree is preferred because Element Plus tree structure is the largest
visual constraint in the current app.

### DocumentTabs

Replace Element Plus tabs with a custom tab strip unless implementation proves
`NTabs` can meet the styling and test requirements cleanly.

Requirements:

- Preserve active-path update and close events.
- Preserve dirty marker.
- Preserve close buttons with accessible names.
- Keep long file names truncated without resizing the layout.
- Use quiet desktop tab styling rather than heavy card tabs.

### SearchPanel

Migrate to `NInput`, `NButton`, and lucide icons.

Requirements:

- Preserve the exposed `focus()` method.
- Preserve `data-test` selectors for input, previous, next, and close actions.
- Keep result count visible and stable.
- Ensure previous/next buttons are disabled when there are no matches.

### UtilityDrawer

Migrate to `NDrawer` and `NDrawerContent`.

Requirements:

- Preserve `v-model` behavior.
- Preserve `activePanel` selection.
- Keep outline and settings as the drawer's two panel types.
- Use a clear drawer title and close affordance.
- Keep overlay scrim legible in both themes.

### SettingsPanel

Migrate controls to Naive UI.

Requirements:

- Workspace path remains read-only with a clear select action.
- Attachment directory fields remain editable and can invoke directory selection.
- Layout font size controls remain sliders with numeric visibility.
- Editor width control remains a slider with numeric visibility.
- Labels must remain visible above controls.

### OutlinePanel

Migrate empty state and scrollbar behavior.

Requirements:

- Outline rows remain buttons.
- Heading indentation remains visible and stable.
- Empty outline state remains clear.

### FormatToolbar

Migrate button group and tooltips to Naive UI or custom toolbar controls.

Requirements:

- Preserve emitted markdown snippets.
- Preserve lucide icons.
- Preserve vertical sticky toolbar placement near the editor surface.
- Keep every icon button labelled by tooltip and accessible name or title.

### EditorSurface And Milkdown

Do not replace Milkdown. Update only shell styling around the editor.

Requirements:

- Preserve paste-file handling.
- Preserve search highlighting.
- Preserve image source resolution and resizing controls.
- Preserve editor content width setting.
- Maintain readable line length and contrast in both themes.

## Visual System

Use a token-driven design system in `frontend/src/style.css`:

- `--app-bg`
- `--surface`
- `--surface-muted`
- `--surface-raised`
- `--border`
- `--text`
- `--text-muted`
- `--text-subtle`
- `--accent`
- `--accent-soft`
- `--accent-strong`
- `--danger`
- `--warning`
- `--focus-ring`
- `--shadow-soft`
- `--shadow-control`

Light mode should use clean neutral surfaces with a restrained teal or blue-green
accent. Dark mode should use neutral dark surfaces with desaturated accent
tones. Avoid a one-hue interface, purple-blue gradients, decorative orbs,
oversized marketing typography, and card-in-card layouts.

Desktop density should remain practical:

- Compact command toolbar.
- Clear but not oversized sidebar rows.
- Quiet document tabs.
- Generous editor padding.
- Drawer controls with consistent 8px spacing rhythm.

## Interaction And Accessibility

- All interactive controls must have visible focus states.
- Icon-only buttons must have accessible names.
- Do not remove keyboard access for tree rows, context menu actions, tabs, or
  drawer controls.
- Touch target guidance is less strict for desktop, but controls should not be
  smaller than the current usable desktop targets.
- Dialogs must provide clear confirm/cancel actions.
- Destructive actions must remain visually and semantically distinct.
- Errors remain visible through message feedback and the existing error banner.
- Animations should be short, based on opacity or transform, and disabled under
  `prefers-reduced-motion`.

## Files Expected To Change

- `frontend/package.json`
- `frontend/package-lock.json` or equivalent lockfile if present
- `frontend/src/main.ts`
- `frontend/src/App.vue`
- `frontend/src/App.test.ts`
- `frontend/src/style.css`
- `frontend/src/style.test.ts`
- `frontend/src/components/CommandToolbar.vue`
- `frontend/src/components/CommandToolbar.test.ts`
- `frontend/src/components/WorkspaceSidebar.vue`
- `frontend/src/components/WorkspaceSidebar.test.ts`
- `frontend/src/components/DocumentTabs.vue`
- `frontend/src/components/DocumentTabs.test.ts`
- `frontend/src/components/SearchPanel.vue`
- `frontend/src/components/SearchPanel.test.ts`
- `frontend/src/components/UtilityDrawer.vue`
- `frontend/src/components/SettingsPanel.vue`
- `frontend/src/components/OutlinePanel.vue`
- `frontend/src/components/FormatToolbar.vue`
- Related component tests where Element Plus DOM assumptions need updates.

New helper components may be added when they keep files focused, especially for
the recursive workspace tree and reusable icon buttons.

## Testing Plan

Run frontend tests after migration:

```powershell
npm --prefix frontend test
```

Run frontend type-check and build:

```powershell
npm --prefix frontend run build
```

Run backend tests only if generated bindings or backend-facing contracts change:

```powershell
go test ./...
```

Manual visual checks:

- Empty startup state.
- Open workspace with nested folders.
- File tree search and clear.
- Folder expand and collapse.
- File and folder context menus.
- Create note, create folder, rename, and delete confirmation dialogs.
- Open several tabs, including long names and dirty documents.
- Editor search open, next, previous, and close.
- Save state while saving and after save.
- Utility drawer outline and settings panels.
- Theme toggle from light to dark and back.
- Attachment directory prompts and settings navigation.

## Acceptance Criteria

- Element Plus imports are removed from application code.
- Naive UI is the active UI framework for shared controls and overlays.
- Core workflows continue to pass automated tests.
- The app visually reads as a professional desktop Markdown writing tool.
- Light and dark themes are both legible and consistent.
- Workspace tree, document tabs, command toolbar, drawer, settings, search panel,
  and format toolbar share one coherent design language.
- No backend behavior changes are required for the redesign.

