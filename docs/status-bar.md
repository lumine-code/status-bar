# status-bar

The status bar's tile collection: a package adds an element to the left or right panel and receives a handle that removes it again.

|             |                                                      |
| ----------- | ---------------------------------------------------- |
| Version     | `1.0.0`                                              |
| Provided by | `provideStatusBar()` returning the four tile methods |
| Consumed by | `consumeStatusBar(statusBar)`                        |
| Owner       | `status-bar` (bundled)                               |

This is the most widely consumed service in the workspace. Read [Tile priorities](#tile-priorities) before picking a number — the ordering is a shared convention, not a free-for-all.

## Registration

In your `package.json`:

```json
{
  "consumedServices": {
    "status-bar": {
      "versions": { "^1.0.0": "consumeStatusBar" }
    }
  }
}
```

## Contract

```ts
type StatusBar = {
  addLeftTile(options: { item: unknown; priority?: number }): Tile;
  addRightTile(options: { item: unknown; priority?: number }): Tile;
  getLeftTiles(): Tile[];
  getRightTiles(): Tile[];
};

type Tile = {
  getItem(): unknown;
  getPriority(): number;
  destroy(): void;
};
```

| Option     | Type   | Description                                                                                                                                |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `item`     | any    | Required. Rendered through `lumine.views.getView(item)`, so an `HTMLElement` works directly and a model works if it has a registered view. |
| `priority` | number | Position within the panel. Defaults to one past the last tile, which puts you innermost — always pass one instead.                         |

## Minimal example

```js
const { Disposable } = require("lumine");

module.exports = {
  consumeStatusBar(statusBar) {
    const element = document.createElement("status-bar-tile");
    element.classList.add("my-package-status");
    element.textContent = "ready";

    const tile = statusBar.addRightTile({ item: element, priority: 310 });
    return new Disposable(() => tile.destroy());
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
| 110      | Diagnostics      | linter                                                           |
| 210, 220 | Repository       | git-center repository, git-center branch                         |
| 310, 320 | File identity    | editor-status path, grammar-selector (when shown on the left)    |
| 410–450  | Language tooling | jupyter-repl, latex-tools, typst-tools, tasklist-tools, prettier |
| 510, 520 | View info        | editor-status cursor position, image-editor size                 |

Right panel, from the right edge inwards:

| Priority | Band           | Tiles                                                                   |
| -------- | -------------- | ----------------------------------------------------------------------- |
| 110      | Application    | settings-view                                                           |
| 210–243  | Editor modes   | cursor-leader, column-selection, overtype-mode, invert-colors (240–243) |
| 310, 320 | Source control | git-panel, github-panel                                                 |
| 410–430  | File identity  | grammar-selector, encoding-selector, line-ending-selector               |
| 510–540  | Observers      | latex-tools, typst-tools, prettier observed files, ide-client servers   |
| 610      | Activity       | busy-signal                                                             |
| 710, 720 | Warnings       | deprecation-cop, incompatible-packages                                  |

## Behavior

Tiles are inserted in priority order at the moment you add them, so a tile added later still lands in the right place.

The status bar itself lives in a bottom panel, or a footer panel when `status-bar.fullWidth` is on. A tile does not need to know which.

`getLeftTiles` and `getRightTiles` return the live, ordered collections. They are useful for inspection but are not a stable API for mutation — add and remove through tiles you own.

## Teardown

**Always keep the returned tile and `destroy()` it on teardown.** Removing only the element leaves the tile in the bar's ordered collection, and the next insertion positioned against that detached item throws. `Tile.destroy()` does both: it splices the tile out of the collection and removes its view.

## Versioning

`1.0.0` provided, `^1.0.0` consumed. A change that breaks this shape gets a new service name rather than a new major version, and both sides move in the same release.
