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

// Marks what the bar hosts, and takes the mark off again. A group is watched
// rather than read once: a package rendering its children through React or etch
// hands the bar an empty box and fills it on a later frame.
class Stamp {
  constructor(element) {
    this.element = element;
    this.observer = null;

    if (!isGroup(element)) {
      element.classList.add(TILE_CLASS);
      return;
    }

    this.mark();
    this.observer = new MutationObserver(() => this.mark());
    this.observer.observe(element, { childList: true, subtree: true });
  }

  mark() {
    for (const tile of this.element.querySelectorAll(TILE_TAG)) {
      tile.classList.add(TILE_CLASS);
    }
  }

  dispose() {
    if (!this.observer) {
      this.element.classList.remove(TILE_CLASS);
      return;
    }
    this.observer.disconnect();
    this.observer = null;
    for (const tile of this.element.querySelectorAll(TILE_TAG)) {
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
