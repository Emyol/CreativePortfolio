import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { visibleTracks } from "@/lib/tape";

// The 3D's failure paths, with the scene and the stage stubbed: a throw from the running
// scene, or a load that fails, falls back to the flat desk and says why.

const scene = vi.hoisted(() => ({
  sync: vi.fn(),
  dispose: vi.fn(),
  setStill: vi.fn(),
  setNight: vi.fn(),
  screen: vi.fn(),
}));
const stage = vi.hoisted(() => ({ fail: null as null | Error }));

vi.mock("@/lib/three/support", () => ({ hasGpuWebGL: () => true }));
vi.mock("@/lib/three/stage", () => ({
  getStage: async () => {
    if (stage.fail) throw stage.fail;
    return { prepare: async () => {}, add: () => () => {}, onLost: () => () => {} };
  },
}));
vi.mock("./deskPointer", () => ({ attachDeskPointer: () => () => {} }));
vi.mock("./deskScene", () => ({
  createDeskScene: async () => ({
    view: {},
    ...scene,
    project: () => null,
    hover: () => {},
    led: () => {},
    slotOnScreen: () => ({ x: 0, y: 0 }),
    inspect: () => {},
    wiggle: () => {},
    nudge: () => false,
    calm: () => {},
    putBack: () => {},
    seatedId: () => null,
    screenText: () => "",
    screenHeadline: () => null,
  }),
}));

const { Desk3D } = await import("./Desk3D");

const tracks = visibleTracks(FIXTURES);
const desk = (current: "about" | null, onUnavailable: () => void) => (
  <Desk3D
    tracks={tracks}
    content={FIXTURES}
    state={current ? "deck" : "desk"}
    current={current}
    screen={null}
    night={false}
    onTapeClick={() => {}}
    onKnob={() => {}}
    onUnavailable={onUnavailable}
  />
);

describe("Desk3D falls back", () => {
  let info: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    stage.fail = null;
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => info.mockRestore());

  it("when the running scene throws on a route change: it is disposed, the desk falls back, the reason logged", async () => {
    const onUnavailable = vi.fn();
    const { rerender, container } = render(desk(null, onUnavailable));
    await waitFor(() => expect(container.querySelector("[data-desk-view][data-ready]")).not.toBeNull());
    expect(scene.sync).toHaveBeenCalledWith("desk", null, true);
    scene.sync.mockImplementation(() => {
      throw new TypeError("a tape lost its hub");
    });
    act(() => rerender(desk("about", onUnavailable)));
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(scene.dispose).toHaveBeenCalled();
    expect(container.querySelector("[data-desk-view]")).toBeNull();
    expect(info).toHaveBeenCalledWith(expect.stringContaining("the desk fell back (runtime error)"), expect.any(TypeError));
  });

  it("when the load fails: the reason logged, nothing left running", async () => {
    stage.fail = new Error("the model did not load");
    const onUnavailable = vi.fn();
    render(desk(null, onUnavailable));
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
    expect(info).toHaveBeenCalledWith(expect.stringContaining("the desk fell back (load error)"), stage.fail);
    expect(scene.dispose).toHaveBeenCalled();
  });
});
