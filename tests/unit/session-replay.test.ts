import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_REPLAY_CONFIG,
  isKitPath,
  maskReplayAttribute,
  onReplayNavigation,
  readReplayEnvironment,
  replayAllowed,
  scrubReplayEvents,
  syncSessionReplay,
  type ReplayEnvironment,
} from "@/lib/session-replay";

const KIT = "https://launchloop.dev/kit/AbC123xyz_-9";
const real: ReplayEnvironment = { isTest: false, webdriver: false, userAgent: "Mozilla/5.0 (Macintosh) Chrome/141.0.0.0 Safari/537.36", globalPrivacyControl: false, doNotTrack: false };

/** posthog-js's recording controls, tracking whether it's recording. */
function fakePosthog(recording = false) {
  const ph = {
    recording,
    startSessionRecording: vi.fn(() => void (ph.recording = true)),
    stopSessionRecording: vi.fn(() => void (ph.recording = false)),
    sessionRecordingStarted: () => ph.recording,
  };
  return ph;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("which pages are recorded", () => {
  it("only /kit/<id>", () => {
    expect(isKitPath("/kit/AbC123xyz_-9")).toBe(true);
    expect(isKitPath("/kit/AbC123xyz_-9/")).toBe(true);
    for (const path of ["/", "/kit", "/kit/", "/kit/a/b", "/account/kits/abc", "/example-kit", "/pricing", "/checkout/mock", "/login"]) expect(isKitPath(path), path).toBe(false);
  });

  it("a kit page starts recording, once", () => {
    const ph = fakePosthog();
    syncSessionReplay(ph, new URL(KIT), real);
    syncSessionReplay(ph, new URL(`${KIT}?unlock=1`), real);
    expect(ph.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(ph.recording).toBe(true);
  });

  it("any other page never starts it, and stops it if it was running", () => {
    const ph = fakePosthog();
    for (const url of ["https://launchloop.dev/", "https://launchloop.dev/pricing", "https://launchloop.dev/account/kits/abc?paid=1", "https://launchloop.dev/example-kit"]) {
      syncSessionReplay(ph, new URL(url), real);
    }
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
    const recording = fakePosthog(true);
    syncSessionReplay(recording, new URL("https://launchloop.dev/"), real);
    expect(recording.stopSessionRecording).toHaveBeenCalled();
    expect(recording.recording).toBe(false);
  });
});

describe("never for", () => {
  const cases: [string, URL, Partial<ReplayEnvironment>][] = [
    ["a QA tab (isTestVisit: landed with ?qa=1 or utm_source=qa, or is_test remembered for the tab)", new URL(KIT), { isTest: true }],
    ["a kit link tagged ?qa=1", new URL(`${KIT}?qa=1`), {}],
    ["a kit link tagged utm_source=qa", new URL(`${KIT}?utm_source=QA`), {}],
    ["navigator.webdriver", new URL(KIT), { webdriver: true }],
    ["a headless browser", new URL(KIT), { userAgent: "Mozilla/5.0 HeadlessChrome/141.0.0.0" }],
    ["a crawler", new URL(KIT), { userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" }],
    ["Global Privacy Control", new URL(KIT), { globalPrivacyControl: true }],
    ["Do Not Track", new URL(KIT), { doNotTrack: true }],
  ];
  for (const [label, url, env] of cases) {
    it(label, () => {
      expect(replayAllowed(url, { ...real, ...env })).toBe(false);
      const ph = fakePosthog();
      syncSessionReplay(ph, url, { ...real, ...env });
      expect(ph.startSessionRecording).not.toHaveBeenCalled();
    });
  }

  it("reads GPC and every Do Not Track spelling from the browser", () => {
    const env = (nav: Record<string, unknown>, win: Record<string, unknown> = {}) => {
      vi.stubGlobal("navigator", { userAgent: real.userAgent, webdriver: false, ...nav });
      vi.stubGlobal("window", win);
      return readReplayEnvironment(false);
    };
    expect(env({})).toMatchObject({ globalPrivacyControl: false, doNotTrack: false, webdriver: false });
    expect(env({ globalPrivacyControl: true }).globalPrivacyControl).toBe(true);
    expect(env({ doNotTrack: "1" }).doNotTrack).toBe(true);
    expect(env({ msDoNotTrack: "1" }).doNotTrack).toBe(true);
    expect(env({}, { doNotTrack: "yes" }).doNotTrack).toBe(true);
    expect(env({ doNotTrack: "0" }).doNotTrack).toBe(false);
    expect(env({ webdriver: true }).webdriver).toBe(true);
    expect(readReplayEnvironment(true).isTest).toBe(true);
  });
});

describe("client navigations (onRouterTransitionStart, before the URL changes)", () => {
  it("leaving a kit page stops recording at once, before the next page renders", () => {
    const ph = fakePosthog(true);
    onReplayNavigation(ph, new URL("https://launchloop.dev/pricing"), real, { currentPath: () => "/kit/AbC123xyz_-9" });
    expect(ph.stopSessionRecording).toHaveBeenCalled();
    expect(ph.recording).toBe(false);
  });

  it("arriving at a kit page starts only once the address bar shows it, so the page being left isn't recorded", () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
    let path = "/";
    const ph = fakePosthog();
    onReplayNavigation(ph, new URL(KIT), real, { currentPath: () => path });
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
    frames.shift()!();
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
    path = "/kit/AbC123xyz_-9";
    frames.shift()!();
    expect(ph.startSessionRecording).toHaveBeenCalledTimes(1);
  });

  it("gives up if the navigation never lands", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
    const ph = fakePosthog();
    onReplayNavigation(ph, new URL(KIT), real, { currentPath: () => "/", timeoutMs: 1000 });
    vi.advanceTimersByTime(1001);
    frames.shift()!();
    expect(frames).toHaveLength(0);
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
  });

  it("a QA, GPC or DNT visitor never starts, even arriving at a kit page", () => {
    const ph = fakePosthog();
    for (const env of [{ isTest: true }, { globalPrivacyControl: true }, { doNotTrack: true }]) {
      onReplayNavigation(ph, new URL(KIT), { ...real, ...env }, { currentPath: () => "/kit/AbC123xyz_-9" });
    }
    expect(ph.startSessionRecording).not.toHaveBeenCalled();
  });
});

describe("what a recording can contain", () => {
  it("masks all text and every input; blocks images, video, canvas, SVG, iframes and hidden inputs; no console, network, headers, bodies or canvas", () => {
    const { session_recording: rec, enable_recording_console_log, capture_performance } = SESSION_REPLAY_CONFIG;
    expect(rec).toMatchObject({ maskAllInputs: true, maskTextSelector: "*", recordHeaders: false, recordBody: false, recordCrossOriginIframes: false, captureCanvas: { recordCanvas: false } });
    expect(rec.blockSelector.split(",").map((s) => s.trim())).toEqual(["img", "picture", "video", "canvas", "svg", "iframe", "input[type=hidden]"]);
    expect(enable_recording_console_log).toBe(false);
    // Network timing off for replays; web vitals are left to the project's settings, as before.
    expect(capture_performance).toEqual({ network_timing: false });
  });

  it("URLs it keeps (the page address, any network entry) lose the private kit id and every non-utm query param", () => {
    const mask = SESSION_REPLAY_CONFIG.session_recording.maskCapturedNetworkRequestFn;
    expect(mask({ name: `${KIT}?unlock=1&utm_source=x#top` } as never)).toMatchObject({ name: "https://launchloop.dev/kit/[id]?utm_source=x" });
    expect(mask({ name: "/account/kits/abc?paid=1" } as never)).toMatchObject({ name: "/account/kits/[id]" });
  });

  it("attributes: kit links and the page's own kit id are scrubbed; words people read are masked like text", () => {
    vi.stubGlobal("location", new URL(KIT));
    expect(maskReplayAttribute("href", "/api/kits/AbC123xyz_-9/zip")).toBe("/api/kits/[id]/zip");
    expect(maskReplayAttribute("href", "/kit/AbC123xyz_-9?unlock=1")).toBe("/kit/[id]?unlock=1");
    expect(maskReplayAttribute("data-kit-id", "AbC123xyz_-9")).toBe("[id]");
    expect(maskReplayAttribute("aria-label", "Copy Snapshelf tagline")).toBe("**** ********* *******");
    expect(maskReplayAttribute("title", "My launch")).toBe("** ******");
    expect(maskReplayAttribute("placeholder", "you@example.com")).toBe("***************");
    expect(maskReplayAttribute("class", "mt-6 h-11 w-full")).toBe("mt-6 h-11 w-full");
  });

  it("the recorder's own custom events (type 5) lose the kit id in any payload field, such as a URL trigger's matchedUrl; other events are untouched", () => {
    vi.stubGlobal("location", new URL(KIT));
    const started = { type: 5, timestamp: 1, data: { tag: "$recording_started", payload: { reason: "url_trigger_matched", matchedUrl: `${KIT}?unlock=1`, nested: { href: "/kit/AbC123xyz_-9/x" } } } };
    const other = { type: 3, timestamp: 2, data: { source: 5, text: "/kit/AbC123xyz_-9" } };
    const [scrubbedStarted, scrubbedOther] = scrubReplayEvents([started, other]) as [typeof started, typeof other];
    expect(scrubbedStarted.data.payload).toEqual({ reason: "url_trigger_matched", matchedUrl: "https://launchloop.dev/kit/[id]?unlock=1", nested: { href: "/kit/[id]/x" } });
    expect(scrubbedOther).toBe(other);
    expect(JSON.stringify(scrubbedStarted)).not.toContain("AbC123xyz_-9");
    // An event with no payload comes back as it was.
    const bare = { type: 5, data: { tag: "$x" } };
    expect(scrubReplayEvents(bare)).toBe(bare);
  });
});
