const { Tile, Stamp } = require("./tile");

module.exports = class StatusBarView {
  constructor() {
    this.element = document.createElement("status-bar");
    this.element.classList.add("status-bar");

    const flexboxHackElement = document.createElement("div");
    flexboxHackElement.classList.add("flexbox-repaint-hack");
    this.element.appendChild(flexboxHackElement);

    this.leftPanel = document.createElement("div");
    this.leftPanel.classList.add("status-bar-left");
    flexboxHackElement.appendChild(this.leftPanel);
    this.element.leftPanel = this.leftPanel;

    this.rightPanel = document.createElement("div");
    this.rightPanel.classList.add("status-bar-right");
    flexboxHackElement.appendChild(this.rightPanel);
    this.element.rightPanel = this.rightPanel;

    this.leftTiles = [];
    this.rightTiles = [];

    this.element.getLeftTiles = this.getLeftTiles.bind(this);
    this.element.getRightTiles = this.getRightTiles.bind(this);
    this.element.addLeftTile = this.addLeftTile.bind(this);
    this.element.addRightTile = this.addRightTile.bind(this);
  }

  destroy() {
    this.element.remove();
  }

  addLeftTile(options) {
    let index;
    const newItem = options.item;
    const newPriority =
      options?.priority != null
        ? options?.priority
        : (this.leftTiles[this.leftTiles.length - 1]?.priority ?? 0) + 1;
    let nextItem = null;
    for (index = 0; index < this.leftTiles.length; index++) {
      const { priority, item } = this.leftTiles[index];
      if (priority > newPriority) {
        nextItem = item;
        break;
      }
    }

    const newTile = new Tile(newItem, newPriority, this.leftTiles);
    this.leftTiles.splice(index, 0, newTile);
    const newElement = lumine.views.getView(newItem);
    newTile.stamp = new Stamp(newElement);
    const nextElement = lumine.views.getView(nextItem);
    this.leftPanel.insertBefore(newElement, nextElement);
    return newTile;
  }

  addRightTile(options) {
    let index;
    const newItem = options.item;
    const newPriority =
      options?.priority != null ? options?.priority : (this.rightTiles[0]?.priority ?? 0) + 1;
    let nextItem = null;
    for (index = 0; index < this.rightTiles.length; index++) {
      const { priority, item } = this.rightTiles[index];
      if (priority < newPriority) {
        nextItem = item;
        break;
      }
    }

    const newTile = new Tile(newItem, newPriority, this.rightTiles);
    this.rightTiles.splice(index, 0, newTile);
    const newElement = lumine.views.getView(newItem);
    newTile.stamp = new Stamp(newElement);
    const nextElement = lumine.views.getView(nextItem);
    this.rightPanel.insertBefore(newElement, nextElement);
    return newTile;
  }

  getLeftTiles() {
    return this.leftTiles;
  }

  getRightTiles() {
    return this.rightTiles;
  }
};
