const { CompositeDisposable, WindowContributionRegistry } = require("lumine");
const StatusBarView = require("./status-bar-view");

module.exports = {
  activate() {
    const generation = (this.activationGeneration ?? 0) + 1;
    this.activationGeneration = generation;
    this.active = true;
    this.subscriptions = new CompositeDisposable();

    this.viewsByWindow = new Map();
    this.statusBar = this.getStatusBar(lumine.workspace.getMainWindow());
    this.statusBarPanel = null;
    this.fullWidth = lumine.config.get("status-bar.fullWidth");
    this.visible = lumine.config.get("status-bar.isVisible");
    this.contributions = new WindowContributionRegistry({
      workspace: lumine.workspace,
      mount: (window, options) =>
        this.getStatusBar(window)[options.side === "left" ? "addLeftTile" : "addRightTile"](
          options,
        ),
    });
    this.subscriptions.add(this.contributions);
    this.subscriptions.add(
      lumine.workspace.observeWindows((window) => {
        this.getStatusBar(window);
        this.subscriptions.add(window.onWillDestroy(() => this.releaseWindow(window)));
        queueMicrotask(() => {
          if (this.active && this.activationGeneration === generation && !window.isDestroyed())
            this.attachStatusBar(this.fullWidth, this.visible, window);
        });
      }),
    );

    this.subscriptions.add(
      lumine.config.onDidChange("status-bar.fullWidth", ({ newValue }) => {
        this.fullWidth = newValue;
        for (const window of this.viewsByWindow.keys())
          this.attachStatusBar(newValue, this.visible, window);
      }),
      lumine.config.onDidChange("status-bar.isVisible", ({ newValue }) => {
        this.updateStatusBarVisibility(newValue);
      }),
      lumine.commands.add("lumine-workspace", "status-bar:toggle", () => {
        lumine.config.set("status-bar.isVisible", !this.visible);
      }),
    );
  },

  deactivate() {
    this.active = false;
    this.activationGeneration = (this.activationGeneration ?? 0) + 1;
    this.subscriptions?.dispose();
    this.subscriptions = null;
    for (const window of [...this.viewsByWindow.keys()]) this.releaseWindow(window);
    this.statusBarPanel = null;
    this.statusBar = null;

    if (lumine.__workspaceView != null) {
      delete lumine.__workspaceView.statusBar;
    }
  },

  updateStatusBarVisibility(visible) {
    this.visible = visible;
    for (const { panel } of this.viewsByWindow.values()) {
      if (visible) panel?.show();
      else panel?.hide();
    }
  },

  provideStatusBar() {
    const contributions = this.contributions;
    const getStatusBar = (window) => {
      if (contributions.disposed) throw new Error("The status bar service has been disposed.");
      return this.getStatusBar(window);
    };
    return {
      forWindow: getStatusBar,
      observeWindows: (callback, { windows = "main" } = {}) =>
        contributions.observe({
          windows,
          create: (context) => callback(getStatusBar(context.window), context),
        }),
      addLeftTile: (options) => contributions.add({ ...options, side: "left" }),
      addRightTile: (options) => contributions.add({ ...options, side: "right" }),
      getLeftTiles: (window = lumine.workspace.getMainWindow()) =>
        getStatusBar(window).getLeftTiles(),
      getRightTiles: (window = lumine.workspace.getMainWindow()) =>
        getStatusBar(window).getRightTiles(),
    };
  },

  getStatusBar(window) {
    if (!lumine.workspace.getWindows().includes(window) || window.isDestroyed())
      throw new Error("The status bar requires a live window of this workspace.");
    let record = this.viewsByWindow.get(window);
    if (!record) {
      if (!this.active) throw new Error("The status bar service is not active.");
      record = { view: new StatusBarView(window.getDocument() ?? document), panel: null };
      this.viewsByWindow.set(window, record);
    }
    return record.view;
  },

  releaseWindow(window) {
    const record = this.viewsByWindow.get(window);
    if (!record) return;
    this.viewsByWindow.delete(window);
    record.panel?.destroy();
    record.view.destroy();
  },

  attachStatusBar(fullWidth, visible, window = lumine.workspace.getMainWindow()) {
    this.fullWidth = fullWidth;
    this.visible = visible;

    const record = this.viewsByWindow.get(window);
    if (!record) return;
    record.panel?.destroy();

    const panelArgs = { item: record.view, priority: 0, visible };
    if (fullWidth || !window.isMain()) {
      record.panel = window.addFooterPanel(panelArgs);
    } else {
      record.panel = lumine.workspace.addBottomPanel(panelArgs);
    }
    if (window.isMain()) this.statusBarPanel = record.panel;
  },
};
