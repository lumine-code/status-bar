const { CompositeDisposable } = require("lumine");
const StatusBarView = require("./status-bar-view");

module.exports = {
  activate() {
    this.subscriptions = new CompositeDisposable();

    this.statusBar = new StatusBarView();
    this.attachStatusBar(
      lumine.config.get("status-bar.fullWidth"),
      lumine.config.get("status-bar.isVisible"),
    );

    this.subscriptions.add(
      lumine.config.onDidChange("status-bar.fullWidth", ({ newValue }) => {
        this.attachStatusBar(newValue, lumine.config.get("status-bar.isVisible"));
      }),
      lumine.config.onDidChange("status-bar.isVisible", ({ newValue }) => {
        this.updateStatusBarVisibility(newValue);
      }),
      lumine.commands.add("lumine-workspace", "status-bar:toggle", () => {
        if (this.statusBarPanel.isVisible()) {
          lumine.config.set("status-bar.isVisible", false);
        } else {
          lumine.config.set("status-bar.isVisible", true);
        }
      }),
    );
  },

  deactivate() {
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
