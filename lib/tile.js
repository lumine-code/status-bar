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
  constructor(element, owner) {
    this.element = element;
    this.group = isGroup(element);
    this.owner = owner ?? null;
    this.observer = null;
    this.disposed = false;
    // Stamp is also usable independently of a bar. Keep its own observation
    // in that case; hosted tiles use their window's shared observer instead.
    if (!this.owner) {
      this.mark();
      this.observer = new MutationObserver(() => this.mark());
      this.observe(this.observer);
    }
  }

  observe(observer) {
    observer.observe(this.element, {
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
    if (this.disposed) return;
    for (const tile of this.tiles()) {
      if (this.disposed) break;
      if (!tile.classList.contains(TILE_CLASS)) {
        tile.classList.add(TILE_CLASS);
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.owner?.remove(this);
    this.owner = null;
    this.observer?.disconnect();
    this.observer = null;
    for (const tile of this.tiles()) {
      tile.classList.remove(TILE_CLASS);
    }
  }
}

// Share one observer across a window's tiles. Observe their actual roots so
// class repair keeps working while a provider temporarily detaches its DOM.
// Groups watch their subtree; ordinary tiles only watch their own class.
class TileStamps {
  constructor() {
    this.stamps = new Map();
    this.observer = new MutationObserver((records) => this.update(records));
  }

  add(element) {
    const stamp = new Stamp(element, this);
    this.stamps.set(element, stamp);
    stamp.mark();
    // Custom elements can tear down their host synchronously from a class
    // attribute callback. Do not observe a stamp withdrawn by that write.
    if (this.observer && this.stamps.get(element) === stamp && !stamp.disposed)
      stamp.observe(this.observer);
    else stamp.dispose();
    return stamp;
  }

  remove(stamp) {
    if (this.stamps.get(stamp.element) !== stamp) return;
    this.stamps.delete(stamp.element);
    if (!this.observer) return;
    // MutationObserver has no per-target unobserve. Reconnect the remaining
    // roots and repair their pending records rather than silently losing a
    // class rewrite that arrived just before another tile was destroyed.
    const records = this.observer.takeRecords();
    this.observer.disconnect();
    for (const remaining of this.stamps.values()) remaining.observe(this.observer);
    this.update(records);
  }

  update(records) {
    if (!this.observer) return;
    const changed = new Set();
    for (const record of records) {
      let element = record.target;
      while (element) {
        const stamp = this.stamps.get(element);
        if (stamp) {
          if (stamp.group || (record.type === "attributes" && record.target === element))
            changed.add(stamp);
        }
        element = element.parentNode;
      }
    }
    for (const stamp of changed) stamp.mark();
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
    this.stamps.clear();
  }
}

class Tile {
  constructor(item, priority, collection) {
    this.item = item;
    this.priority = priority;
    this.collection = collection;
    this.stamp = null;
    this.destroyed = false;
  }

  getItem() {
    return this.item;
  }

  getPriority() {
    return this.priority;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const index = this.collection.indexOf(this);
    if (index !== -1) this.collection.splice(index, 1);
    const stamp = this.stamp;
    this.stamp = null;
    stamp?.dispose();
    lumine.views.getView(this.item).remove();
  }
}

module.exports = { Tile, Stamp, TileStamps, TILE_CLASS, TILE_TAG, GROUP_TAG };
