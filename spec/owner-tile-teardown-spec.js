describe("Status Bar owned tile teardown", () => {
  let service, subscription, oldTile, liveTile, item;

  beforeEach(async () => {
    jasmine.useRealClock();
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"])
      spyOn(lumine.shell, method).and.resolveTo();
    spyOn(lumine.application, "openWindow").and.resolveTo();
    jasmine.attachToDOM(lumine.workspace.getElement());
    await lumine.packages.activatePackage("status-bar");
    subscription = lumine.packages.serviceHub.consume("status-bar", "^1.0.0", (next) => {
      service = next;
    });
    item = document.createElement("status-bar-tile");
    item.textContent = "Owned indicator";
  });

  afterEach(async () => {
    oldTile?.destroy();
    liveTile?.destroy();
    subscription?.dispose();
    await lumine.packages.deactivatePackage("status-bar");
    item?.remove();
    service = subscription = oldTile = liveTile = item = null;
  });

  it("releases a hosted indicator's observer when its provider is deactivated", async () => {
    const retired = service;
    oldTile = service.addLeftTile({ item, priority: 10 });
    await lumine.packages.deactivatePackage("status-bar");
    item.className = "returned-indicator";
    await Promise.resolve();
    expect(item.classList.contains("status-bar-item")).toBe(false);
    expect(retired.getLeftTiles()).toEqual([]);
  });

  it("keeps a reused indicator visible when the previous generation's cleanup arrives later", async () => {
    oldTile = service.addRightTile({ item, priority: 10 });
    await lumine.packages.deactivatePackage("status-bar");
    const pack = await lumine.packages.activatePackage("status-bar");
    liveTile = service.addRightTile({ item, priority: 20 });
    oldTile.destroy();
    await Promise.resolve();
    expect(item.parentElement).toBe(pack.mainModule.statusBar.rightPanel);
    expect(item.classList.contains("status-bar-item")).toBe(true);
    expect(service.getRightTiles()).toEqual([liveTile]);
  });

  it("keeps ordinary live tile destruction working on both sides", () => {
    oldTile = service.addLeftTile({ item, priority: 10 });
    const right = document.createElement("status-bar-tile");
    liveTile = service.addRightTile({ item: right, priority: 20 });
    oldTile.destroy();
    expect(service.getLeftTiles()).toEqual([]);
    expect(item.classList.contains("status-bar-item")).toBe(false);
    expect(service.getRightTiles()).toEqual([liveTile]);
    expect(right.parentElement).not.toBeNull();
  });
});
