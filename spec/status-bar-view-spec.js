const StatusBarView = require("../lib/status-bar-view");

describe("StatusBarView", function () {
  let statusBarView = null;

  class TestItem {
    constructor(id) {
      this.id = id;
    }
  }

  beforeEach(function () {
    statusBarView = new StatusBarView();

    lumine.views.addViewProvider(TestItem, function (model) {
      const element = document.createElement("item-view");
      element.model = model;
      return element;
    });
  });

  describe("::addLeftTile({item, priority})", function () {
    it("appends the view for the given item to its left side", function () {
      const testItem1 = new TestItem(1);
      const testItem2 = new TestItem(2);
      const testItem3 = new TestItem(3);

      const tile1 = statusBarView.addLeftTile({ item: testItem1, priority: 10 });
      const tile2 = statusBarView.addLeftTile({ item: testItem2, priority: 30 });
      const tile3 = statusBarView.addLeftTile({ item: testItem3, priority: 20 });

      const { leftPanel } = statusBarView;

      expect(leftPanel.children[0].nodeName).toBe("ITEM-VIEW");
      expect(leftPanel.children[1].nodeName).toBe("ITEM-VIEW");
      expect(leftPanel.children[2].nodeName).toBe("ITEM-VIEW");

      expect(leftPanel.children[0].model).toBe(testItem1);
      expect(leftPanel.children[1].model).toBe(testItem3);
      expect(leftPanel.children[2].model).toBe(testItem2);

      expect(statusBarView.getLeftTiles()).toEqual([tile1, tile3, tile2]);
      expect(tile1.getPriority()).toBe(10);
      expect(tile1.getItem()).toBe(testItem1);
    });

    it("allows the view to be removed", function () {
      const testItem = new TestItem(1);
      const tile = statusBarView.addLeftTile({ item: testItem, priority: 10 });
      tile.destroy();
      expect(statusBarView.leftPanel.children.length).toBe(0);

      return statusBarView.addLeftTile({ item: testItem, priority: 9 });
    });

    describe("when no priority is given", () =>
      it("appends the item", function () {
        const testItem1 = new TestItem(1);
        const testItem2 = new TestItem(2);

        statusBarView.addLeftTile({ item: testItem1, priority: 1000 });
        statusBarView.addLeftTile({ item: testItem2 });

        const { leftPanel } = statusBarView;
        expect(leftPanel.children[0].model).toBe(testItem1);
        expect(leftPanel.children[1].model).toBe(testItem2);
      }));
  });

  describe("::addRightTile({item, priority})", function () {
    it("appends the view for the given item to its right side", function () {
      const testItem1 = new TestItem(1);
      const testItem2 = new TestItem(2);
      const testItem3 = new TestItem(3);

      const tile1 = statusBarView.addRightTile({ item: testItem1, priority: 10 });
      const tile2 = statusBarView.addRightTile({ item: testItem2, priority: 30 });
      const tile3 = statusBarView.addRightTile({ item: testItem3, priority: 20 });

      const { rightPanel } = statusBarView;

      expect(rightPanel.children[0].nodeName).toBe("ITEM-VIEW");
      expect(rightPanel.children[1].nodeName).toBe("ITEM-VIEW");
      expect(rightPanel.children[2].nodeName).toBe("ITEM-VIEW");

      expect(rightPanel.children[0].model).toBe(testItem2);
      expect(rightPanel.children[1].model).toBe(testItem3);
      expect(rightPanel.children[2].model).toBe(testItem1);

      expect(statusBarView.getRightTiles()).toEqual([tile2, tile3, tile1]);
      expect(tile1.getPriority()).toBe(10);
      expect(tile1.getItem()).toBe(testItem1);
    });

    it("allows the view to be removed", function () {
      const testItem = new TestItem(1);
      const disposable = statusBarView.addRightTile({ item: testItem, priority: 10 });
      disposable.destroy();
      expect(statusBarView.rightPanel.children.length).toBe(0);

      return statusBarView.addRightTile({ item: testItem, priority: 11 });
    });

    describe("when no priority is given", () =>
      it("prepends the item", function () {
        const testItem1 = new TestItem(1, { priority: 1000 });
        const testItem2 = new TestItem(2);

        statusBarView.addRightTile({ item: testItem1, priority: 1000 });
        statusBarView.addRightTile({ item: testItem2 });

        const { rightPanel } = statusBarView;
        expect(rightPanel.children[0].model).toBe(testItem2);
        expect(rightPanel.children[1].model).toBe(testItem1);
      }));
  });

  describe("the tile class", function () {
    it("stamps it on a left tile's view", function () {
      const testItem = new TestItem(1);
      statusBarView.addLeftTile({ item: testItem, priority: 10 });

      expect(statusBarView.leftPanel.children[0].classList).toContain("status-bar-item");
    });

    it("stamps it on a right tile's view", function () {
      const testItem = new TestItem(1);
      statusBarView.addRightTile({ item: testItem, priority: 10 });

      expect(statusBarView.rightPanel.children[0].classList).toContain("status-bar-item");
    });

    // The bar hands the element back to whoever gave it, so it must not keep
    // a class that says the element is still hosted.
    it("removes it again when the tile is destroyed", function () {
      const testItem = new TestItem(1);
      const tile = statusBarView.addLeftTile({ item: testItem, priority: 10 });
      const element = lumine.views.getView(testItem);
      tile.destroy();

      expect(element.classList).not.toContain("status-bar-item");
    });

    // A group carries several controls in as one entry. It is a layout box, so
    // the mark belongs on each control: left on the group, a theme paints one
    // rectangle across the lot and a second inside it.
    it("stamps a group's tiles rather than the group", function () {
      const group = document.createElement("status-bar-tile-group");
      const first = document.createElement("status-bar-tile");
      const second = document.createElement("status-bar-tile");
      group.appendChild(first);
      group.appendChild(second);

      const tile = statusBarView.addLeftTile({ item: group, priority: 10 });

      expect(group.classList).not.toContain("status-bar-item");
      expect(first.classList).toContain("status-bar-item");
      expect(second.classList).toContain("status-bar-item");

      tile.destroy();
      expect(first.classList).not.toContain("status-bar-item");
      expect(second.classList).not.toContain("status-bar-item");
    });

    // A package rendering through React or etch hands the bar an empty box and
    // fills it a frame later, so the group is watched rather than read once.
    it("stamps a tile a group gains after it was added", async function () {
      const group = document.createElement("status-bar-tile-group");
      statusBarView.addLeftTile({ item: group, priority: 10 });

      const late = document.createElement("status-bar-tile");
      group.appendChild(late);
      // A MutationObserver delivers on the microtask checkpoint, which is what
      // this awaits — the spec runner freezes `setTimeout`, so a timer here
      // would never fire.
      await Promise.resolve();

      expect(late.classList).toContain("status-bar-item");
    });

    // A tile is the element the bar hosts, never a block nested inside one:
    // packages use `.inline-block` for layout within a tile, so a theme keying
    // on that paints the nesting as a second tile.
    it("does not stamp anything the item nests inside itself", function () {
      const testItem = new TestItem(1);
      const element = lumine.views.getView(testItem);
      const inner = document.createElement("a");
      inner.classList.add("inline-block");
      element.appendChild(inner);

      statusBarView.addLeftTile({ item: testItem, priority: 10 });

      expect(element.classList).toContain("status-bar-item");
      expect(inner.classList).not.toContain("status-bar-item");
    });
  });
});
