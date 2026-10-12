const { Disposable } = require("lumine");

describe("Status bar window contributions", () => {
  let service, leases;
  beforeEach(async () => {
    const pack = await lumine.packages.activatePackage("status-bar");
    service = pack.mainModule.provideStatusBar();
    leases = [];
  });
  afterEach(async () => {
    for (const lease of leases) lease.dispose();
    await lumine.workspace.discardEditorWindows();
  });

  it("defaults to main and creates independent all-window tiles in present and future hosts", async () => {
    const first = await lumine.workspace.openEditorWindow({ show: false });
    const mainOnly = [];
    const all = [];
    const disposed = [];
    const create = (records) => (context) => {
      const element = context.document.createElement("status-bar-tile");
      element.textContent = context.window.persistentId;
      records.push({ ...context, element });
      return { element, dispose: () => disposed.push(element) };
    };
    leases.push(service.addLeftTile({ create: create(mainOnly), priority: 10 }));
    const shared = service.addRightTile({ windows: "all", create: create(all), priority: 20 });
    leases.push(shared);
    const second = await lumine.workspace.openEditorWindow({ show: false });
    expect(mainOnly.map((entry) => entry.window)).toEqual([lumine.workspace.getMainWindow()]);
    expect(all.map((entry) => entry.window)).toEqual(lumine.workspace.getWindows());
    expect(new Set(all.map((entry) => entry.element)).size).toBe(3);
    for (const entry of all) {
      expect(entry.element.ownerDocument).toBe(entry.window.getDocument());
      expect(entry.editorContainer).toBe(entry.window.getEditorContainer());
      expect(
        service.getRightTiles(entry.window).some((tile) => tile.getItem() === entry.element),
      ).toBeTrue();
    }
    await lumine.workspace.releaseEditorWindow(first);
    expect(disposed).toContain(all[1].element);
    shared.dispose();
    expect(
      disposed.filter((element) => all.some((entry) => entry.element === element)).length,
    ).toBe(3);
    await lumine.workspace.releaseEditorWindow(second);
    await lumine.workspace.openEditorWindow({ show: false });
    expect(all.length).toBe(3);
  });

  it("disposes local controllers and prevents an old service reaching a later activation", async () => {
    const destroyed = jasmine.createSpy("destroyed");
    leases.push(
      service.observeWindows(
        (bar, { document }) => {
          const tile = bar.addLeftTile({ item: document.createElement("status-bar-tile") });
          return new Disposable(() => {
            tile.destroy();
            destroyed();
          });
        },
        { windows: "all" },
      ),
    );
    await lumine.workspace.openEditorWindow({ show: false });
    await lumine.packages.deactivatePackage("status-bar");
    expect(destroyed).toHaveBeenCalledTimes(2);
    await lumine.packages.activatePackage("status-bar");
    expect(() => service.addLeftTile({ create: () => ({}) })).toThrowError(/disposed/);
  });
});
