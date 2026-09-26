const { CompositeDisposable } = require("lumine");
const StatusBarView = require("./status-bar-view");

module.exports = {
  activate() {
    const generation = (this.activationGeneration ?? 0) + 1;
    this.activationGeneration = generation;
    this.active = true;
    this.subscriptions = new CompositeDisposable();

    this.statusBar = new StatusBarView();
    this.statusBarPanel = null;
    this.fullWidth = lumine.config.get("status-bar.fullWidth");
    this.visible = lumine.config.get("status-bar.isVisible");

    this.subscriptions.add(
      lumine.config.onDidChange("status-bar.fullWidth", ({ newValue }) => {
        this.fullWidth = newValue;
        if (this.statusBarPanel != null) this.attachStatusBar(newValue, this.visible);
      }),
      lumine.config.onDidChange("status-bar.isVisible", ({ newValue }) => {
        this.updateStatusBarVisibility(newValue);
      }),
      lumine.commands.add("lumine-workspace", "status-bar:toggle", () => {
        lumine.config.set("status-bar.isVisible", !this.visible);
      }),
    );

    queueMicrotask(() => {
      if (!this.active || this.activationGeneration !== generation) return;
      this.attachStatusBar(this.fullWidth, this.visible);
    });
  },

  deactivate() {
    this.active = false;
    this.activationGeneration = (this.activationGeneration ?? 0) + 1;
    this.statusBarPanel?.destroy();
    this.statusBarPanel = null;

    this.statusBar?.destroy();
    this.statusBar = null;

    this.subscriptions?.dispose();
    this.subscriptions = null;

    if (lumine.__workspaceView != null) {
      delete lumine.__workspaceView.statusBar;
    }
  },

  updateStatusBarVisibility(visible) {
    this.visible = visible;
    if (this.statusBarPanel == null) return;

    if (visible) {
      this.statusBarPanel.show();
    } else {
      this.statusBarPanel.hide();
    }
  },

  provideStatusBar() {
    return {
      addLeftTile: this.statusBar.addLeftTile.bind(this.statusBar),
      addRightTile: this.statusBar.addRightTile.bind(this.statusBar),
      getLeftTiles: this.statusBar.getLeftTiles.bind(this.statusBar),
      getRightTiles: this.statusBar.getRightTiles.bind(this.statusBar),
    };
  },

  attachStatusBar(fullWidth, visible) {
    this.fullWidth = fullWidth;
    this.visible = visible;

    if (this.statusBarPanel != null) {
      this.statusBarPanel.destroy();
    }

    const panelArgs = { item: this.statusBar, priority: 0, visible };
    if (fullWidth) {
      this.statusBarPanel = lumine.workspace.addFooterPanel(panelArgs);
    } else {
      this.statusBarPanel = lumine.workspace.addBottomPanel(panelArgs);
    }
  },
};
