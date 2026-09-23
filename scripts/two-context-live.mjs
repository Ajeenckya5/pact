import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "playwright";

const origin = process.env.PACT_WEB_ORIGIN ?? "http://localhost:3000";
const pactId = randomUUID();
const secret = randomBytes(32).toString("base64url");
const url = `${origin}/#${pactId}.${secret}`;

const isolate = `(() => {
  window.__pactSocketMessages = 0;
  window.__pactSocketUrls = [];
  window.__pactBroadcasts = 0;
  window.__pactSse = 0;
  window.__pactStorageListens = 0;
  const NativeWS = window.WebSocket;
  function Wrapped(target, protocols) {
    const socket = protocols === undefined ? new NativeWS(target) : new NativeWS(target, protocols);
    window.__pactSocketUrls.push(String(target));
    socket.addEventListener("message", () => {
      if (String(target).includes("/pacts/")) window.__pactSocketMessages += 1;
    });
    return socket;
  }
  Wrapped.prototype = NativeWS.prototype;
  Wrapped.CONNECTING = NativeWS.CONNECTING;
  Wrapped.OPEN = NativeWS.OPEN;
  Wrapped.CLOSING = NativeWS.CLOSING;
  Wrapped.CLOSED = NativeWS.CLOSED;
  window.WebSocket = Wrapped;
  window.EventSource = function EventSource() {
    window.__pactSse += 1;
  };
  function Channel() {}
  Channel.prototype.postMessage = function postMessage() {
    window.__pactBroadcasts += 1;
  };
  Channel.prototype.close = function close() {};
  Channel.prototype.addEventListener = function addEventListener() {};
  Channel.prototype.removeEventListener = function removeEventListener() {};
  window.BroadcastChannel = Channel;
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
    if (type === "storage") {
      window.__pactStorageListens += 1;
      return;
    }
    return add.call(this, type, listener, options);
  };
  const dispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
    if (event && event.type === "storage") return true;
    return dispatch.call(this, event);
  };
})();`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const first = await browser.newContext();
const second = await browser.newContext();
await first.addInitScript(isolate);
await second.addInitScript(isolate);
const pageA = await first.newPage();
const pageB = await second.newPage();

try {
  await Promise.all([pageA.goto(url, { waitUntil: "domcontentloaded" }), pageB.goto(url, { waitUntil: "domcontentloaded" })]);
  try {
    await Promise.all([
      pageA.waitForFunction(() => document.querySelector("[data-live]")?.getAttribute("data-live") === "open", { timeout: 15000 }),
      pageB.waitForFunction(() => document.querySelector("[data-live]")?.getAttribute("data-live") === "open", { timeout: 15000 }),
    ]);
  } catch (err) {
    const debug = await pageA.evaluate(() => ({
      live: document.querySelector("[data-live]")?.getAttribute("data-live") ?? null,
      urls: window.__pactSocketUrls,
      messages: window.__pactSocketMessages,
      sse: window.__pactSse,
    }));
    console.error(JSON.stringify(debug));
    throw err;
  }
  await Promise.all([dismiss(pageA), dismiss(pageB)]);
  const ids = await Promise.all([identity(pageA), identity(pageB)]);
  if (!ids[0] || !ids[1] || ids[0] === ids[1]) throw new Error(`identities were not separate: ${ids.join(" ")}`);
  const started = Date.now();
  await pageA.getByRole("button", { name: "Today's pact Sleep 7h+" }).click();
  await pageB.waitForFunction(
    () => document.querySelector('[data-partner-box="sleep"]')?.getAttribute("data-partner-done") === "yes",
    { timeout: 2000 },
  );
  const elapsed = Date.now() - started;
  const proof = await pageB.evaluate(() => ({
    messages: window.__pactSocketMessages,
    urls: window.__pactSocketUrls,
    broadcasts: window.__pactBroadcasts,
    sse: window.__pactSse,
    storageListens: window.__pactStorageListens,
    localBoxes: document.body.innerText.includes("0/4 boxes"),
    partner: document.querySelector('[data-partner-box="sleep"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
  }));
  if (proof.messages < 1) throw new Error(`no socket frame: ${JSON.stringify(proof)}`);
  if (!proof.urls.some((item) => item.startsWith("ws://127.0.0.1:8788/pacts/"))) throw new Error(`socket was not the worker: ${proof.urls.join(" ")}`);
  if (proof.broadcasts !== 0 || proof.sse !== 0) throw new Error(`side channel used: ${JSON.stringify(proof)}`);
  if (!proof.localBoxes) throw new Error(`second context changed its own boxes: ${JSON.stringify(proof)}`);
  console.log(
    `PASS two contexts in ${elapsed}ms via socket messages=${proof.messages} broadcasts=${proof.broadcasts} sse=${proof.sse} storageListenersBlocked=${proof.storageListens} partner="${proof.partner}"`,
  );
} finally {
  await browser.close();
}

async function dismiss(page) {
  const later = page.getByRole("button", { name: "Later" });
  try {
    await later.click({ timeout: 8000 });
  } catch {
    /* the first-run dialog is already gone */
  }
}

async function identity(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("pact.device-key");
    if (!raw) return "";
    return JSON.parse(raw).pk ?? "";
  });
}
