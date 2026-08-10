describe("Status Bar package", function () {
  let [, statusBar, statusBarService, workspaceElement, mainModule] = [];

  beforeEach(async () => {
    workspaceElement = lumine.views.getView(lumine.workspace);

    const pack = await lumine.packages.activatePackage("status-bar");
    statusBar = workspaceElement.querySelector("status-bar");
    statusBarService = pack.mainModule.provideStatusBar();
    return ({ mainModule } = pack);
  });

  describe("@activate()", () =>
    it("appends only one status bar", function () {
      expect(workspaceElement.querySelectorAll("status-bar").length).toBe(1);
      lumine.workspace.getActivePane().splitRight({ copyActiveItem: true });
      expect(workspaceElement.querySelectorAll("status-bar").length).toBe(1);
    }));

  describe("@deactivate()", () =>
    it("removes the status bar view", async () => {
      await Promise.resolve(lumine.packages.deactivatePackage("status-bar")); // Wrapped so works with Promise & non-Promise deactivate
      expect(workspaceElement.querySelector("status-bar")).toBeNull();
    }));

  describe("isVisible option", function () {
    beforeEach(() => jasmine.attachToDOM(workspaceElement));

    describe("when it is true", function () {
      beforeEach(() => lumine.config.set("status-bar.isVisible", true));

      it("shows status bar", () =>
        expect(workspaceElement.querySelector("status-bar").parentNode).toBeVisible());
    });

    describe("when it is false", function () {
      beforeEach(() => lumine.config.set("status-bar.isVisible", false));

      it("hides status bar", () =>
        expect(workspaceElement.querySelector("status-bar").parentNode).not.toBeVisible());
    });
  });

  describe("when status-bar:toggle is triggered", function () {
    beforeEach(function () {
      jasmine.attachToDOM(workspaceElement);
      return lumine.config.set("status-bar.isVisible", true);
    });

    it("hides or shows the status bar", function () {
      lumine.commands.dispatch(workspaceElement, "status-bar:toggle");
      expect(workspaceElement.querySelector("status-bar").parentNode).not.toBeVisible();
      lumine.commands.dispatch(workspaceElement, "status-bar:toggle");
      expect(workspaceElement.querySelector("status-bar").parentNode).toBeVisible();
    });

    it("toggles the value of isVisible in config file", function () {
      expect(lumine.config.get("status-bar.isVisible")).toBe(true);
      lumine.commands.dispatch(workspaceElement, "status-bar:toggle");
      expect(lumine.config.get("status-bar.isVisible")).toBe(false);
      lumine.commands.dispatch(workspaceElement, "status-bar:toggle");
      expect(lumine.config.get("status-bar.isVisible")).toBe(true);
    });
  });

  describe("full-width setting", function () {
    let [containers] = [];

    beforeEach(async () => {
      containers = lumine.workspace.panelContainers;
      jasmine.attachToDOM(workspaceElement);

      await lumine.workspace.open("sample.js");
    });

    it("expects the setting to be enabled by default", function () {
      expect(lumine.config.get("status-bar.fullWidth")).toBeTruthy();
      expect(containers.footer.panels).toContain(mainModule.statusBarPanel);
    });

    describe("when setting is changed", function () {
      it("fits status bar to editor's width", function () {
        lumine.config.set("status-bar.fullWidth", false);
        expect(containers.bottom.panels).toContain(mainModule.statusBarPanel);
        expect(containers.footer.panels).not.toContain(mainModule.statusBarPanel);
      });

      it("restores the status-bar location when re-enabling setting", function () {
        lumine.config.set("status-bar.fullWidth", true);
        expect(containers.footer.panels).toContain(mainModule.statusBarPanel);
        expect(containers.bottom.panels).not.toContain(mainModule.statusBarPanel);
      });
    });
  });

  describe("the 'status-bar' service", function () {
    it("allows tiles to be added, removed, and retrieved", function () {
      let dummyView = document.createElement("div");
      let tile = statusBarService.addLeftTile({ item: dummyView });
      expect(statusBar).toContain(dummyView);
      expect(statusBarService.getLeftTiles()).toContain(tile);
      tile.destroy();
      expect(statusBar).not.toContain(dummyView);
      expect(statusBarService.getLeftTiles()).not.toContain(tile);

      dummyView = document.createElement("div");
      tile = statusBarService.addRightTile({ item: dummyView });
      expect(statusBar).toContain(dummyView);
      expect(statusBarService.getRightTiles()).toContain(tile);
      tile.destroy();
      expect(statusBar).not.toContain(dummyView);
      expect(statusBarService.getRightTiles()).not.toContain(tile);
    });
  });
});
