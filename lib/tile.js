// The class the bar stamps on every element it hosts. It is what marks a tile
// as a tile: `.inline-block` is a layout utility packages also use *inside* a
// tile, so it cannot say where one starts, and a theme keying on it paints a
// nested block as though it were a second tile. Stamped on insertion, removed
// on destroy so an element handed back to a package leaves as it arrived.
const TILE_CLASS = "status-bar-item";

class Tile {
  constructor(item, priority, collection) {
    this.item = item;
    this.priority = priority;
    this.collection = collection;
  }

  getItem() {
    return this.item;
  }

  getPriority() {
    return this.priority;
  }

  destroy() {
    this.collection.splice(this.collection.indexOf(this), 1);
    const element = lumine.views.getView(this.item);
    element.classList.remove(TILE_CLASS);
    element.remove();
  }
}

module.exports = { Tile, TILE_CLASS };
