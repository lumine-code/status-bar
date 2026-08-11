// The class the bar stamps on every element it hosts. It is what marks a tile
// as a tile: `.inline-block` is a layout utility packages also use *inside* a
// tile, so it cannot say where one starts, and a theme keying on it paints a
// nested block as though it were a second tile. Stamped on insertion, removed
// on destroy so an element handed back to a package leaves as it arrived.
const TILE_CLASS = "status-bar-item";

// The tile primitive, and the layout box that holds several of them. A group is
// never itself a tile: its `<status-bar-tile>` children are, so a theme paints
// one rectangle per control instead of one across the group and a second inside
// it. See `docs/status-bar.md`.
const TILE_TAG = "status-bar-tile";
const GROUP_TAG = "status-bar-tile-group";

function isGroup(element) {
  return element.tagName?.toLowerCase() === GROUP_TAG;
}

// Marks what the bar hosts, and takes the mark off again.
//
// Watched rather than written once, for two reasons a package cannot help. A
// group rendered through React or etch reaches the bar empty and gains its
// children a frame later. And a component that owns its `className` rewrites
// the whole attribute on every render, which erases a mark written from
// outside — a class change is not a childList mutation, so watching the tree
// alone would never notice.
//
// `mark` MUST check before it adds. `classList.add` runs the attribute update
// steps even when the token is already present, and a set to the same value
// still queues a mutation record — so an unconditional add inside the
// observer's own callback observes itself and never settles: the microtask
// queue never drains and the renderer freezes before its next frame. The
// `contains` guard reads without writing, which is what lets this loop close.
class Stamp {
  constructor(element) {
    this.element = element;
    this.group = isGroup(element);

    this.mark();
    this.observer = new MutationObserver(() => this.mark());
    this.observer.observe(element, {
      attributes: true,
      attributeFilter: ["class"],
      childList: this.group,
      subtree: this.group,
    });
  }

  tiles() {
    return this.group ? this.element.querySelectorAll(TILE_TAG) : [this.element];
  }

  mark() {
    for (const tile of this.tiles()) {
      if (!tile.classList.contains(TILE_CLASS)) {
        tile.classList.add(TILE_CLASS);
      }
    }
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
    for (const tile of this.tiles()) {
      tile.classList.remove(TILE_CLASS);
    }
  }
}

class Tile {
  constructor(item, priority, collection) {
    this.item = item;
    this.priority = priority;
    this.collection = collection;
    this.stamp = null;
  }

  getItem() {
    return this.item;
  }

  getPriority() {
    return this.priority;
  }

  destroy() {
    this.collection.splice(this.collection.indexOf(this), 1);
    this.stamp?.dispose();
    this.stamp = null;
    lumine.views.getView(this.item).remove();
  }
}

module.exports = { Tile, Stamp, TILE_CLASS, TILE_TAG, GROUP_TAG };
