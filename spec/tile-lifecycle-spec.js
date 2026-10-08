describe("Status bar tile lifetime", () => {
  let bar, view;

  beforeEach(async () => {
    const pack = await lumine.packages.activatePackage("status-bar");
    bar = pack.mainModule.provideStatusBar();
    view = pack.mainModule.statusBar;
    jasmine.attachToDOM(lumine.workspace.getElement());
  });

  afterEach(async () => {
    await lumine.packages.deactivatePackage("status-bar");
  });

  for (const side of ["Left", "Right"]) {
    it(`preserves other ${side.toLowerCase()} tiles when a handle is destroyed twice`, () => {
      const first = document.createElement("status-bar-tile");
      const second = document.createElement("status-bar-tile");
      const retired = bar[`add${side}Tile`]({ item: first, priority: 1 });
      const live = bar[`add${side}Tile`]({ item: second, priority: 3 });
      retired.destroy();
      retired.destroy();
      expect(bar[`get${side}Tiles`]()).toEqual([live]);
      expect(second.parentElement).toBe(view[`${side.toLowerCase()}Panel`]);
      expect(second.classList.contains("status-bar-item")).toBe(true);
      live.destroy();
    });
  }

  it("does not remove or unstamp an item reused by a new tile", async () => {
    const item = document.createElement("status-bar-tile");
    const old = bar.addLeftTile({ item, priority: 1 });
    old.destroy();
    expect(old.stamp).toBeNull();
    const replacement = bar.addLeftTile({ item, priority: 2 });
    old.destroy();
    await Promise.resolve();
    expect(bar.getLeftTiles()).toEqual([replacement]);
    expect(item.parentElement).toBe(view.leftPanel);
    expect(item.classList.contains("status-bar-item")).toBe(true);
    replacement.destroy();
  });

  it("ignores old cleanup after package reactivation and item reuse", async () => {
    const item = document.createElement("status-bar-tile");
    const old = bar.addLeftTile({ item, priority: 1 });
    old.destroy();
    await lumine.packages.deactivatePackage("status-bar");
    const pack = await lumine.packages.activatePackage("status-bar");
    bar = pack.mainModule.provideStatusBar();
    view = pack.mainModule.statusBar;
    const replacement = bar.addLeftTile({ item, priority: 2 });
    old.destroy();
    expect(item.parentElement).toBe(view.leftPanel);
    expect(bar.getLeftTiles()).toEqual([replacement]);
    replacement.destroy();
  });
});
