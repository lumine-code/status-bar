describe("Status Bar package", function () {
  let [, statusBar, statusBarService, workspaceElement, mainModule] = [];

  beforeEach(async () => {
    workspaceElement = lumine.views.getView(lumine.workspace);

    const pack = await lumine.packages.activatePackage("status-bar");
    statusBar = workspaceElement.querySelector("status-bar");
    statusBarService = pack.mainModule
      .provideStatusBar()
      .forWindow(lumine.workspace.getMainWindow());
    return ({ mainModule } = pack);
  });

  describe("@activate()", () =>
    it("appends only one status bar", async function () {
      expect(workspaceElement.querySelectorAll("status-bar").length).toBe(1);
      lumine.workspace.getActivePane().splitRight();
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

    it("has exactly one handler after reactivation", async function () {
      await lumine.packages.deactivatePackage("status-bar");
      await lumine.packages.activatePackage("status-bar");
      lumine.config.set("status-bar.isVisible", true);

      lumine.commands.dispatch(workspaceElement, "status-bar:toggle");

      expect(lumine.config.get("status-bar.isVisible")).toBe(false);
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

      it("keeps the status bar hidden when changing its width", function () {
        lumine.config.set("status-bar.isVisible", false);

        lumine.config.set("status-bar.fullWidth", false);
        expect(containers.bottom.panels).toContain(mainModule.statusBarPanel);
        expect(mainModule.statusBarPanel.isVisible()).toBe(false);

        lumine.config.set("status-bar.fullWidth", true);
        expect(containers.footer.panels).toContain(mainModule.statusBarPanel);
        expect(mainModule.statusBarPanel.isVisible()).toBe(false);
      });
    });
  });

  describe("the 'status-bar' service", function () {
    it("keeps icon hover areas as tall as text and respects inset theme controls", () => {
      jasmine.attachToDOM(workspaceElement);
      const tiles = [];
      const registrations = [];
      for (const layout of ["text", "inline-flex", "inline-grid"]) {
        const item = document.createElement("status-bar-tile");
        if (layout === "text") item.textContent = "Status";
        else {
          item.style.display = layout;
          item.style.alignItems = "center";
          const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          icon.style.cssText = "display:block;width:14px;height:14px";
          item.append(icon);
        }
        tiles.push(item);
        registrations.push(statusBarService.addLeftTile({ item }));
      }
      const previousStyle = statusBar.getAttribute("style");
      try {
        for (const height of [22, 30]) {
          statusBar.style.height = `${height}px`;
          statusBar.style.lineHeight = `${height}px`;
          for (const item of tiles) {
            expect(item.getBoundingClientRect().height).toBe(height);
            expect(item.getBoundingClientRect().top).toBe(tiles[0].getBoundingClientRect().top);
          }
        }
        for (const item of tiles) {
          item.style.height = "24px";
          item.style.lineHeight = "24px";
          item.style.marginBlock = "3px";
          expect(item.getBoundingClientRect().height).toBe(24);
          expect(item.getBoundingClientRect().top - statusBar.getBoundingClientRect().top).toBe(3);
        }
      } finally {
        for (const registration of registrations) registration.destroy();
        if (previousStyle == null) statusBar.removeAttribute("style");
        else statusBar.setAttribute("style", previousStyle);
      }
    });

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
