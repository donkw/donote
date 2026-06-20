# Donote Obsidian Dark Shell Design

Date: 2026-06-20

## Goal

Redesign Donote's current shell toward an Obsidian-style dark writing workspace,
with special attention to the left workspace file tree. The result should feel
more modern, calm, and immersive while preserving the current file, editor,
workspace, search, save, tab, and settings behavior.

## Selected Direction

Use the B1 visual direction selected during review: a full dark application shell.

The dark treatment applies to the left workspace sidebar, document tabs, central
editor surroundings, right utility rail, right utility drawer, context menus, and
Element Plus controls used inside those areas. The Markdown editing surface should
remain highly readable and should not become decorative or low contrast.

## Non-Goals

Do not replace the current tree implementation with a new component library.
`WorkspaceSidebar.vue` already uses Element Plus `ElTree` with a custom node slot,
which is enough for the selected design.

Do not change backend workspace operations, file path rules, document save
behavior, tab lifecycle, paste attachment behavior, or search semantics.

Do not add large new layout features such as drag-and-drop tree reordering,
split panes, breadcrumbs, preview panels, or a full file manager.

## Visual System

Use a dark neutral palette with blue-gray active states:

- App background: near-black blue gray.
- Primary panel background: dark slate.
- Secondary controls: slightly lighter slate.
- Borders and dividers: low-contrast blue-gray.
- Muted text: desaturated blue-gray.
- Primary text: soft off-white.
- Active file and selected tool states: blue-gray pill backgrounds with a brighter
  text color and subtle border.
- Danger states: keep a restrained red that remains readable on dark surfaces.

Keep radii at 8px or less for rows, inputs, menus, and tabs. Avoid gradients,
glowing backgrounds, or ornamental decoration. The design should read as a focused
desktop note app, not a themed landing page.

## Workspace Sidebar

Retain `WorkspaceSidebar.vue` as the left navigation component and keep
Element Plus `ElTree` as the underlying tree.

Update the sidebar presentation:

- Use a dark sidebar background with a subtle right border.
- Show the workspace name as a compact header with icon-only actions for common
  workspace/file operations where existing events support them.
- Restyle the search input as a dark inset control with a muted search icon.
- Restyle tree rows as compact 30px to 32px rows with stable height.
- Use a clear active row pill for the current Markdown file.
- Use muted folder rows, softer file rows, and persistent ellipsis truncation for
  long names.
- Keep folder expand/collapse interaction exactly as it works now.
- Keep right-click context menu behavior, but restyle the menu for the dark shell.

The current tree filtering, root workspace node, expansion state, and context menu
events remain unchanged unless a small template adjustment is needed for the new
visual controls.

## Application Shell

Coordinate the rest of the shell with the sidebar so the UI does not feel split
between a new dark tree and old light panels.

Update these surfaces:

- `app-shell` and `workspace-layout` backgrounds.
- `editor-pane` background and dividers.
- `DocumentTabs.vue` / Element Plus tab styling.
- `UtilityRail.vue` icon buttons, active state, save state, and theme control.
- `UtilityDrawer.vue` drawer background, border, headings, settings controls, and
  outline rows.
- Existing error banner and messages where local CSS affects contrast.

The center editor content can stay slightly lighter than the surrounding shell if
that improves writing readability, but it should still belong to the dark theme.

## Theme Behavior

Prefer improving the existing dark theme variables rather than hardcoding one-off
colors in many selectors. Shared CSS variables should drive the new shell palette
so later light/dark changes remain manageable.

If the app currently supports toggling light and dark themes, keep that behavior.
The selected B1 design should become the dark theme's primary visual direction.
Light theme should remain usable and should not inherit unreadable dark-only
styles.

## Component Boundaries

Keep the change mostly in:

- `frontend/src/style.css` for shared layout and Element Plus overrides.
- `frontend/src/components/WorkspaceSidebar.vue` for small template improvements
  such as action icons or row metadata.
- `frontend/src/components/UtilityRail.vue`, `UtilityDrawer.vue`, and
  `DocumentTabs.vue` only if class hooks or structure are needed for the dark
  shell polish.

Avoid moving Wails calls or shared app state. `App.vue` should remain the
orchestration layer for workspace and document operations.

## Accessibility And Usability

Maintain readable contrast for text, icons, active rows, disabled or muted text,
input placeholders, and destructive menu actions.

Tree rows, tabs, icon buttons, and context menu items should keep predictable
target sizes and focus-visible states. Long file names and tab labels must
truncate instead of resizing the layout.

The design must work at the current resizable sidebar widths. Narrow sidebars
should preserve icons, row height, and ellipsis behavior without overlapping text.

## Testing And Verification

Preserve existing behavior tests for `WorkspaceSidebar.vue` and `App.vue`.
Update selectors or expected classes only where the visual structure genuinely
changes.

Run:

- `npm --prefix frontend test`
- `npm --prefix frontend run build`

Run `go test ./...` only if generated bindings or backend-facing contracts change.

Perform a visual check for:

- Workspace opened with nested folders.
- Active file row.
- Search input focus and clear state.
- Right-click context menu on file and folder.
- Open document tabs, including long names.
- Utility rail active and inactive states.
- Utility drawer in outline and settings modes.
- Empty workspace state.
- Light theme still readable after the dark shell changes.
