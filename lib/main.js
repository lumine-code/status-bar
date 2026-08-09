const { CompositeDisposable, Emitter } = require("lumine");
const StatusBarView = require("./status-bar-view");

module.exports = {
  activate() {
    this.emitters = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.statusBar = new StatusBarView();
    this.attachStatusBar();

    this.subscriptions.add(
      lumine.config.onDidChange("status-bar.fullWidth", () => {
        this.attachStatusBar();
      }),
    );

    this.updateStatusBarVisibility();

    this.statusBarVisibilitySubscription = lumine.config.observe("status-bar.isVisible", () => {
      this.updateStatusBarVisibility();
    });

    lumine.commands.add("lumine-workspace", "status-bar:toggle", () => {
      if (this.statusBarPanel.isVisible()) {
        lumine.config.set("status-bar.isVisible", false);
      } else {
        lumine.config.set("status-bar.isVisible", true);
      }
    });
  },

  deactivate() {
    this.statusBarVisibilitySubscription?.dispose();
    this.statusBarVisibilitySubscription = null;

    this.statusBarPanel?.destroy();
    this.statusBarPanel = null;

    this.statusBar?.destroy();
    this.statusBar = null;

    this.subscriptions?.dispose();
    this.subscriptions = null;

    this.emitters?.dispose();
    this.emitters = null;

    if (lumine.__workspaceView != null) {
      delete lumine.__workspaceView.statusBar;
    }
  },

  updateStatusBarVisibility() {
    if (lumine.config.get("status-bar.isVisible")) {
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

  attachStatusBar() {
    if (this.statusBarPanel != null) {
      this.statusBarPanel.destroy();
    }

    const panelArgs = { item: this.statusBar, priority: 0 };
    if (lumine.config.get("status-bar.fullWidth")) {
      this.statusBarPanel = lumine.workspace.addFooterPanel(panelArgs);
    } else {
      this.statusBarPanel = lumine.workspace.addBottomPanel(panelArgs);
    }
  },
};
