const path = require("path");

const PACKAGE_ROOT = path.join(__dirname, "..");

describe("activation bootstrap", () => {
  let queuedAttachment;

  beforeEach(async () => {
    spyOn(globalThis, "queueMicrotask").and.callFake((callback) => {
      queuedAttachment = callback;
    });

    lumine.packages.loadPackage(PACKAGE_ROOT);
    lumine.config.set("status-bar.fullWidth", true);
    lumine.config.set("status-bar.isVisible", true);
  });

  afterEach(async () => {
    await lumine.packages.deactivatePackage("status-bar");
  });

  it("publishes a detached tile service before attaching its panel", async () => {
    const addFooterPanel = spyOn(lumine.workspace, "addFooterPanel").and.callThrough();
    const addBottomPanel = spyOn(lumine.workspace, "addBottomPanel").and.callThrough();
    const pack = await lumine.packages.activatePackage("status-bar");
    const { mainModule } = pack;
    const service = mainModule.provideStatusBar();
    const item = document.createElement("div");

    service.addLeftTile({ item });

    expect(mainModule.statusBarPanel).toBeNull();
    expect(mainModule.statusBar.element).toContain(item);
    expect(addFooterPanel).not.toHaveBeenCalled();
    expect(addBottomPanel).not.toHaveBeenCalled();

    lumine.config.set("status-bar.fullWidth", false);
    lumine.commands.dispatch(lumine.views.getView(lumine.workspace), "status-bar:toggle");

    expect(lumine.config.get("status-bar.isVisible")).toBe(false);

    queuedAttachment();

    expect(mainModule.statusBarPanel).not.toBeNull();
    expect(addBottomPanel).toHaveBeenCalled();
    expect(mainModule.statusBarPanel.isVisible()).toBe(false);
  });

  it("cancels a pending panel attachment when deactivated", async () => {
    const pack = await lumine.packages.activatePackage("status-bar");
    const { mainModule } = pack;
    const addFooterPanel = spyOn(lumine.workspace, "addFooterPanel").and.callThrough();
    const addBottomPanel = spyOn(lumine.workspace, "addBottomPanel").and.callThrough();

    await lumine.packages.deactivatePackage("status-bar");
    queuedAttachment();

    expect(addFooterPanel).not.toHaveBeenCalled();
    expect(addBottomPanel).not.toHaveBeenCalled();
    expect(mainModule.statusBarPanel).toBeNull();
  });
});
