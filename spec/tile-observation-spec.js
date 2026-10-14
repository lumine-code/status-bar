const StatusBarView = require("../lib/status-bar-view");
const { Stamp } = require("../lib/tile");

describe("Status bar tile observation", () => {
  let bars, standalone;

  beforeEach(() => {
    bars = [];
    standalone = [];
  });

  afterEach(() => {
    for (const bar of bars) bar.destroy();
    for (const stamp of standalone) stamp.dispose();
  });

  function createBar() {
    const bar = new StatusBarView();
    bars.push(bar);
    return bar;
  }

  it("owns one observer per window bar across both panels and disconnects it once", async () => {
    const NativeObserver = globalThis.MutationObserver;
    const observers = [];
    const constructed = spyOn(globalThis, "MutationObserver").and.callFake(function (callback) {
      const observer = new NativeObserver(callback);
      spyOn(observer, "disconnect").and.callThrough();
      observers.push(observer);
      return observer;
    });
    const first = createBar();
    const second = createBar();
    const retired = document.createElement("status-bar-tile");
    const live = document.createElement("status-bar-tile");
    first.addLeftTile({ item: retired });
    first.addRightTile({ item: document.createElement("status-bar-tile") });
    second.addLeftTile({ item: document.createElement("status-bar-tile-group") });
    second.addRightTile({ item: live });
    expect(constructed).toHaveBeenCalledTimes(2);
    first.destroy();
    first.destroy();
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(observers[1].disconnect).not.toHaveBeenCalled();
    retired.className = "returned";
    live.className = "rerendered";
    await Promise.resolve();
    expect(retired.classList.contains("status-bar-item")).toBeFalse();
    expect(live.classList.contains("status-bar-item")).toBeTrue();
  });

  it("routes class repair only to its hosted root and leaves nested layout blocks unmarked", async () => {
    const bar = createBar();
    const first = document.createElement("status-bar-tile");
    const second = document.createElement("status-bar-tile");
    const nested = document.createElement("status-bar-tile");
    first.appendChild(nested);
    bar.addLeftTile({ item: first });
    const untouched = bar.addRightTile({ item: second });
    const mark = spyOn(untouched.stamp, "mark").and.callThrough();
    first.className = "rerendered";
    nested.className = "inner-layout";
    const unregistered = document.createElement("status-bar-tile");
    bar.leftPanel.appendChild(unregistered);
    await Promise.resolve();
    expect(first.classList.contains("status-bar-item")).toBeTrue();
    expect(second.classList.contains("status-bar-item")).toBeTrue();
    expect(nested.classList.contains("status-bar-item")).toBeFalse();
    expect(unregistered.classList.contains("status-bar-item")).toBeFalse();
    expect(mark).not.toHaveBeenCalled();
  });

  it("tracks group subtree replacements and stops repairing a removed child", async () => {
    const bar = createBar();
    const group = document.createElement("status-bar-tile-group");
    const removed = document.createElement("status-bar-tile");
    group.appendChild(removed);
    bar.addLeftTile({ item: group });
    const wrapper = document.createElement("span");
    const child = document.createElement("status-bar-tile");
    wrapper.appendChild(child);
    group.replaceChildren(wrapper);
    removed.className = "returned-child";
    await Promise.resolve();
    expect(group.classList.contains("status-bar-item")).toBeFalse();
    expect(wrapper.classList.contains("status-bar-item")).toBeFalse();
    expect(child.classList.contains("status-bar-item")).toBeTrue();
    expect(removed.classList.contains("status-bar-item")).toBeFalse();
    child.className = "react-rendered";
    await Promise.resolve();
    expect(child.classList.contains("status-bar-item")).toBeTrue();
  });

  it("ignores queued repair of a retired handle when another bar reuses its element", async () => {
    const first = createBar();
    const second = createBar();
    const item = document.createElement("status-bar-tile");
    const old = first.addLeftTile({ item });
    item.className = "pending-old-render";
    old.destroy();
    const current = second.addRightTile({ item });
    old.destroy();
    await Promise.resolve();
    expect(item.parentElement).toBe(second.rightPanel);
    expect(item.classList.contains("status-bar-item")).toBeTrue();
    expect(first.getLeftTiles()).toEqual([]);
    expect(second.getRightTiles()).toEqual([current]);
  });

  it("settles class repair without repeatedly writing the observer's own marker", async () => {
    const bar = createBar();
    const item = document.createElement("status-bar-tile");
    bar.addLeftTile({ item });
    const add = spyOn(item.classList, "add").and.callThrough();
    item.className = "react-rendered";
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(add).toHaveBeenCalledOnceWith("status-bar-item");
    expect(item.classList.contains("status-bar-item")).toBeTrue();
  });

  it("repairs an owned root even while it is temporarily detached from its bar", async () => {
    const bar = createBar();
    const item = document.createElement("status-bar-tile");
    bar.addLeftTile({ item });
    item.remove();
    await Promise.resolve();
    item.className = "detached-render";
    await Promise.resolve();
    expect(item.classList.contains("status-bar-item")).toBeTrue();
    bar.leftPanel.appendChild(item);
    await Promise.resolve();
    expect(item.parentElement).toBe(bar.leftPanel);
    expect(item.classList.contains("status-bar-item")).toBeTrue();
  });

  it("keeps another root's pending repair when one tile unregisters", async () => {
    const bar = createBar();
    const first = document.createElement("status-bar-tile");
    const second = document.createElement("status-bar-tile");
    const old = bar.addLeftTile({ item: first });
    bar.addRightTile({ item: second });
    second.className = "pending-render";
    old.destroy();
    await Promise.resolve();
    expect(second.classList.contains("status-bar-item")).toBeTrue();
    second.className = "next-render";
    await Promise.resolve();
    expect(second.classList.contains("status-bar-item")).toBeTrue();
    first.className = "returned";
    await Promise.resolve();
    expect(first.classList.contains("status-bar-item")).toBeFalse();
  });

  it("keeps standalone Stamp observation and teardown for ordinary roots and groups", async () => {
    const item = document.createElement("status-bar-tile");
    const ordinary = new Stamp(item);
    standalone.push(ordinary);
    expect(item.classList.contains("status-bar-item")).toBeTrue();
    item.className = "standalone-render";
    await Promise.resolve();
    expect(item.classList.contains("status-bar-item")).toBeTrue();
    const group = document.createElement("status-bar-tile-group");
    const grouped = new Stamp(group);
    standalone.push(grouped);
    const child = document.createElement("status-bar-tile");
    group.appendChild(child);
    await Promise.resolve();
    expect(child.classList.contains("status-bar-item")).toBeTrue();
    expect(group.classList.contains("status-bar-item")).toBeFalse();
    ordinary.dispose();
    grouped.dispose();
    item.className = "returned";
    child.className = "returned";
    await Promise.resolve();
    expect(item.classList.contains("status-bar-item")).toBeFalse();
    expect(child.classList.contains("status-bar-item")).toBeFalse();
  });

  it("rejects new tiles after the bar is destroyed without restarting observation", () => {
    const bar = createBar();
    bar.destroy();
    const item = document.createElement("status-bar-tile");
    expect(() => bar.addLeftTile({ item })).toThrowError(/destroyed/);
    expect(() => bar.addRightTile({ item })).toThrowError(/destroyed/);
    expect(bar.getLeftTiles()).toEqual([]);
    expect(bar.getRightTiles()).toEqual([]);
    expect(item.classList.contains("status-bar-item")).toBeFalse();
  });

  for (const side of ["Left", "Right"]) {
    it(`retires a staged ${side.toLowerCase()} tile if a class write destroys its bar`, () => {
      const bar = createBar();
      const item = document.createElement("status-bar-tile");
      const add = item.classList.add.bind(item.classList);
      spyOn(item.classList, "add").and.callFake((...tokens) => {
        add(...tokens);
        bar.destroy();
      });
      let retired;
      expect(() => {
        retired = bar[`add${side}Tile`]({ item });
      }).not.toThrow();
      expect(retired.destroyed).toBeTrue();
      expect(retired.stamp).toBeNull();
      expect(bar.getLeftTiles()).toEqual([]);
      expect(bar.getRightTiles()).toEqual([]);
      expect(item.parentElement).toBeNull();
      expect(item.classList.contains("status-bar-item")).toBeFalse();
      retired.destroy();
    });
  }
});
