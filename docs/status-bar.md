# status-bar

Window-local status tiles with workspace-owned registrations and deterministic teardown.

|             |                               |
| ----------- | ----------------------------- |
| Version     | `2.0.0`                       |
| Provided by | `provideStatusBar()`          |
| Consumed by | `consumeStatusBar(statusBar)` |
| Owner       | `status-bar`                  |

## Registration

Declare `"status-bar": { "versions": { "^2.0.0": "consumeStatusBar" } }` in `consumedServices`.

## Contract

```ts
type WindowContext = {
  window: EditorWindow;
  document: Document;
  workspace: Workspace;
  editorContainer: PaneContainer;
};
type Contribution = { element: HTMLElement; dispose(): void };
type Tile = { getItem(): unknown; getPriority(): number; destroy(): void };
type ScopedStatusBar = {
  addLeftTile(options: { item: unknown; priority?: number }): Tile;
  addRightTile(options: { item: unknown; priority?: number }): Tile;
  getLeftTiles(): Tile[];
  getRightTiles(): Tile[];
};
type TileOptions = {
  create(context: WindowContext): Contribution;
  windows?: "main" | "all";
  priority?: number;
};
type StatusBar = {
  addLeftTile(options: TileOptions): Disposable;
  addRightTile(options: TileOptions): Disposable;
  observeWindows(
    create: (bar: ScopedStatusBar, context: WindowContext) => Disposable,
    options?: { windows?: "main" | "all" },
  ): Disposable;
  forWindow(window: EditorWindow): ScopedStatusBar;
  getLeftTiles(window?: EditorWindow): Tile[];
  getRightTiles(window?: EditorWindow): Tile[];
};
```

`create` is required for workspace registrations. `windows` defaults to `"main"`; `"all"` covers current and future editor windows. Every call creates a distinct DOM element and disposable subscriptions for that window. Use `context.editorContainer` for the local file or editor; `context.workspace` exposes shared documents and global editing activity.

`observeWindows` owns a controller that can add, replace and remove several local tiles. Its callback returns a disposable that cleans up those tiles and subscriptions. `forWindow` exposes the same scoped collection when the caller already owns an explicit window lifecycle. Collection queries default to the main window.

## Minimal example

```js
module.exports = {
  consumeStatusBar(statusBar) {
    return statusBar.addRightTile({
      windows: "all",
      priority: 310,
      create({ document, editorContainer }) {
        const element = document.createElement("status-bar-tile");
        element.classList.add("my-package-status");
        const observation = editorContainer.observeActivePaneItem((item) => {
          element.textContent = item?.getTitle?.() ?? "";
        });
        return { element, dispose: () => observation.dispose() };
      },
    });
  },
};
```

## Anatomy of a tile

Every tile in the bar has the same shape. Following it is not enforced — the bar hosts whatever you hand it — but a tile that departs from it is the one that looks wrong under somebody else's theme.

```html
<status-bar-tile class="my-package-status">
  <span class="icon icon-alert"></span>
  <span class="my-package-status-label">3</span>
</status-bar-tile>
```

**The root is `<status-bar-tile>`.** A plain custom element, deliberately not a `<button>`: it drags in no widget padding, line height, cursor or focus ring for the bar to strip back out, and it names itself in the inspector. Your own class goes on it and is what your stylesheet targets.

**One tile is one control** — one click target, one tooltip, one hover rectangle. Bind the click to the tile itself, never to a child.

**Content is inline.** An optional `.icon` span, an optional label span, no wrapper element around them. A tile that genuinely composes several parts uses `display: flex; align-items: center; gap:` on the tile itself. Never give a child `.inline-block`: that is a layout utility from core's `layout.css`, and inside a fixed-height tile it aligns on the baseline and hangs past the bottom edge.

**The bar stamps `.status-bar-item` on what it hosts** and removes it again when the tile is destroyed. That class is what a theme keys its padding, height, rounding and hover feedback on, so your tile needs no styling of its own to match the bar.

**Never paint a background inside a tile with `background-color: inherit`.** It resolves to the tile's _computed_ background, so on hover it repaints the theme's translucent colour over itself and the two layers composite into a darker rectangle inside the tile. Use `transparent`.

Two contract classes are honoured on the hosted element:

| Class          | Effect                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------- |
| `is-read-only` | Suppresses hover and press feedback, for a tile that only reports and cannot be clicked. |
| `is-icon-only` | On an `.icon`, drops the trailing margin its label would otherwise need.                 |

The bar normalises what a widget would otherwise drag in with it. A `<button>` — your tile, or one nested inside it — loses its padding, its own line height and its pointer cursor, so it reads as part of the strip rather than as a control dropped into it. `.inline-block`'s right margin is zeroed wherever it appears here: a panel spaces its tiles with `gap`, and a page-layout margin has no place in a one-line strip.

### Several controls in one entry

Related controls that travel together — a push and a pull button, a row of counters — are still one control each, so each is a tile, and a group carries them in:

```html
<status-bar-tile-group class="my-package-status">
  <status-bar-tile class="my-package-count-error">…</status-bar-tile>
  <status-bar-tile class="my-package-count-warning">…</status-bar-tile>
</status-bar-tile-group>
```

Hand the **group** to `addLeftTile`/`addRightTile`. It is a layout box and never a tile itself: the bar marks its `<status-bar-tile>` children instead, so a theme paints one rectangle per control rather than one across the whole group and a second inside it. Do not write `.status-bar-item` yourself — the bar owns that mark, and it watches the group, so children your package renders a frame later through React or etch are marked when they arrive.

The group is laid out for you (`display: flex; align-items: center`) and inherits the panel's own `gap`, so a theme that butts its tiles together gets these butted too.

**One exception exists in the fleet**, written down so an audit does not re-flag it: `busy-signal` registers a real custom element whose class _is_ the component, and keeps its own tag as its tile root.

## Tile priorities

**A lower priority sits closer to its panel's outer edge.** On the left panel that means further left; on the right panel it means further right. Tiles with equal priorities fall back to activation order, which is not stable, so every tile should carry its own number.

Priorities are grouped into bands of 100, numbered from the outer edge inwards, with a step of 10 inside each band so tiles can be inserted later without renumbering. A package that owns several adjacent tiles steps by one from its own slot instead, keeping the band's remaining tens free.

Left panel, from the left edge inwards:

| Priority | Band             | Tiles                                                            |
| -------- | ---------------- | ---------------------------------------------------------------- |
| 110, 120 | Repository       | git-center repository, git-center branch                         |
| 210      | Diagnostics      | linter                                                           |
| 320      | File identity    | grammar-selector (when shown on the left)                        |
| 410–450  | Language tooling | jupyter-repl, latex-tools, typst-tools, tasklist-tools, prettier |
| 510, 520 | View info        | go-to-line cursor position, image-editor size                    |

Right panel, from the right edge inwards:

| Priority | Band              | Tiles                                                                   |
| -------- | ----------------- | ----------------------------------------------------------------------- |
| 110      | Application       | settings-view                                                           |
| 210–243  | Editor modes      | cursor-leader, column-selection, overtype-mode, invert-colors (240–243) |
| 250      | Code intelligence | ide servers                                                             |
| 410–430  | File identity     | grammar-selector, encoding-selector, line-ending                        |
| 510–530  | Observers         | latex-tools, typst-tools, prettier observed files                       |
| 610      | Activity          | busy-signal                                                             |
| 710, 720 | Warnings          | deprecation-cop, incompatible-packages                                  |

Two bands share the 200s: the editor modes take 210–243 and code intelligence 250. They are adjacent kinds — both answer "what is this window doing to my file right now" — and the language-server item belongs outside file identity rather than among the observers, since it is always present.

## Behavior

Tooltips briefly describe the current state and primary left-click action, and show that action's keyboard shortcut through `keyBindingCommand` when one applies. Use `keyBindingTarget` to resolve it in the owning window; a function can return the current editor element or `null` when a scoped binding does not apply. Menus contain all actions and applicable keyboard shortcuts. Describe mouse gestures in the package's README rather than displaying mouse-button labels in tooltips or menus.

Every interactive tile provides a context menu containing all its actions, including its primary left-click action. Middle click and modified left clicks may act as shortcuts to popular menu entries; right click only opens the menu. Informational tiles need no empty menu. Compute availability and checkbox or radio state when the menu opens, and resolve every action against the document and window the tile describes. Menu and mouse activation share command handlers; dispose menu registrations together with the tile. Fence each context-menu block with separators and set `data-context-menu-boundary` on a tile that owns its menu.

Menu rows use the command that actually performs the named action. For editor-scoped bindings, set the row's `keyBindingTarget` to a function resolving the tile's owning editor, or `null` when that binding does not apply. A contextual wrapper with `commandDetail` can declare an equivalent public `keyBindingCommand`; a combined or behavior-changing action cannot borrow another command's shortcut. Resolve labels from current keymaps rather than hardcoding them, and expose distinct actions such as toggling visibility and focusing a panel as separate commands.

Tiles are inserted in priority order at the moment you add them, so a tile added later still lands in the right place.

The status bar itself lives in a bottom panel, or a footer panel when `status-bar.fullWidth` is on. A tile does not need to know which.

`getLeftTiles` and `getRightTiles` return the live, ordered collections. They are useful for inspection but are not a stable API for mutation — add and remove through tiles you own.

## Teardown

**Dispose the workspace registration on teardown.** It releases every current instance and prevents factories from running for future windows. Scoped controllers keep their returned tiles and call `destroy()` on them. Removing only the element leaves the tile in the bar's ordered collection, and the next insertion positioned against that detached item throws. `Tile.destroy()` does both: it splices the tile out of the collection and removes its view.

Destroying a tile again is harmless. A retired handle cannot remove another tile or an item that has since been added through a new handle.

Deactivating the status bar retires its hosted tiles and disconnects their observers. Later cleanup through an old handle is harmless, including when the same element has been reused after reactivation.

## Versioning

`2.0.0` replaces direct global tile insertion with window factories. Consumers request `^2.0.0`; the provider and consumers move together.
