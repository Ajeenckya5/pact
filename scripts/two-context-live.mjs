import { randomBytes, randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { chromium } from "playwright";

const ENVELOPE_FIELDS = ["v", "pactId", "epoch", "senderPk", "kind", "nonce", "ct", "sig"];
const READABLE = /"(sleep|water|box|value|time|heartRate|heart_rate|protein|recovery|strain|hrv|steps|kcal|text|message|sender)"\s*:/;

function envelopeOnly(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const keys = Object.keys(body);
  return keys.length === ENVELOPE_FIELDS.length && ENVELOPE_FIELDS.every((key) => keys.includes(key)) && !READABLE.test(raw);
}

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
  window.__pactStorageSwallowed = 0;
  window.__pactProbePosted = false;
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
  const NativeBroadcast = window.BroadcastChannel;
  let nativeBroadcastHits = 0;
  const nativeProbe = new NativeBroadcast("pact-blocker-probe");
  nativeProbe.addEventListener("message", () => {
    nativeBroadcastHits += 1;
  });
  function Channel() {}
  Channel.prototype.postMessage = function postMessage(data) {
    if (data === "pact-probe") {
      window.__pactProbePosted = true;
      return;
    }
    window.__pactBroadcasts += 1;
  };
  Channel.prototype.close = function close() {};
  Channel.prototype.addEventListener = function addEventListener() {};
  Channel.prototype.removeEventListener = function removeEventListener() {};
  window.BroadcastChannel = Channel;
  const add = EventTarget.prototype.addEventListener;
  let nativeStorageHits = 0;
  add.call(window, "storage", () => {
    nativeStorageHits += 1;
  });
  EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
    if (type === "storage") {
      window.__pactStorageListens += 1;
      return;
    }
    return add.call(this, type, listener, options);
  };
  const dispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
    if (event && event.type === "storage") {
      window.__pactStorageSwallowed += 1;
      return true;
    }
    return dispatch.call(this, event);
  };
  window.__pactRunBlockerProbe = function runBlockerProbe() {
    const storageBefore = nativeStorageHits;
    const broadcastBefore = nativeBroadcastHits;
    const swallowedBefore = window.__pactStorageSwallowed;
    window.dispatchEvent(new Event("storage"));
    const channel = new BroadcastChannel("pact-blocker-probe");
    channel.postMessage("pact-probe");
    return {
      storageBlocked: nativeStorageHits === storageBefore && window.__pactStorageSwallowed > swallowedBefore,
      broadcastBlocked: nativeBroadcastHits === broadcastBefore && window.__pactProbePosted === true,
    };
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
  const probes = await Promise.all([
    pageA.evaluate(() => window.__pactRunBlockerProbe()),
    pageB.evaluate(() => window.__pactRunBlockerProbe()),
  ]);
  if (probes.some((probe) => !probe?.storageBlocked || !probe?.broadcastBlocked)) {
    throw new Error(`blocker probe failed: ${JSON.stringify(probes)}`);
  }
  const posts = [];
  pageA.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/pacts/") && req.url().includes("/messages")) posts.push(req.postData() ?? "");
  });
  const ids = await Promise.all([identity(pageA), identity(pageB)]);
  if (!ids[0] || !ids[1] || ids[0] === ids[1]) throw new Error(`identities were not separate: ${ids.join(" ")}`);
  const started = Date.now();
  await pageA.getByRole("button", { name: "Today's pact Sleep 7h+" }).click();
  await pageB.waitForFunction(
    () => document.querySelector('[data-partner-box="sleep"]')?.getAttribute("data-partner-done") === "yes",
    null,
    { timeout: 2000 },
  );
  const elapsed = Date.now() - started;
  const stored = await pageA.evaluate(readStoredEnvelopes);
  const proof = await pageB.evaluate(() => ({
    messages: window.__pactSocketMessages,
    urls: window.__pactSocketUrls,
    broadcasts: window.__pactBroadcasts,
    sse: window.__pactSse,
    storageListens: window.__pactStorageListens,
    localBoxes: document.body.innerText.includes("0/4 boxes"),
    partner: document.querySelector('[data-partner-box="sleep"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
  }));
  const socketPrefix = process.env.PACT_SOCKET_PREFIX ?? "wss://pact-api.ajeenckyam8.workers.dev/pacts/";
  if (proof.messages < 1) throw new Error(`no socket frame: ${JSON.stringify(proof)}`);
  if (!proof.urls.some((item) => item.startsWith(socketPrefix))) throw new Error(`socket was not the worker: ${proof.urls.join(" ")}`);
  if (proof.urls.some((item) => item.includes("/pacts/") && (item.includes("x-pact-sig") || item.includes("?")))) {
    throw new Error(`signature was in the socket URL: ${proof.urls.join(" ")}`);
  }
  if (proof.broadcasts !== 0 || proof.sse !== 0) throw new Error(`side channel used: ${JSON.stringify(proof)}`);
  if (!proof.localBoxes) throw new Error(`second context changed its own boxes: ${JSON.stringify(proof)}`);
  if (!posts.length || posts.some((body) => !envelopeOnly(body))) throw new Error(`posted body was not an envelope: ${posts.join(" | ")}`);
  if (!stored.ok) throw new Error(`stored-envelope check failed: ${stored.reason}`);
  console.log(
    `PASS two contexts in ${elapsed}ms via socket messages=${proof.messages} broadcasts=${proof.broadcasts} sse=${proof.sse} storageListenersBlocked=${proof.storageListens} storageProbeBlocked=1 broadcastProbeBlocked=1 storedEnvelopes=${stored.count} foreignFields=0 partner="${proof.partner}"`,
  );
} catch (err) {
  await pageA.screenshot({ path: "test-results/two-context.png" }).catch(() => {});
  throw err;
} finally {
  await browser.close();
  rmSync("test-results", { recursive: true, force: true });
}

async function readStoredEnvelopes() {
  function b64UrlToBytes(value) {
    const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
    const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64Url(bytes) {
    let bin = "";
    for (const byte of bytes) bin += String.fromCharCode(byte);
    return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }
  async function deviceKeyFromPage() {
    const fromDb = await new Promise((resolve) => {
      const req = indexedDB.open("pact", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("account")) db.createObjectStore("account");
        if (!db.objectStoreNames.contains("device")) db.createObjectStore("device");
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("device")) {
          resolve(null);
          return;
        }
        const get = db.transaction("device", "readonly").objectStore("device").get("current");
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
    if (fromDb && fromDb.pk && fromDb.sk) return fromDb;
    try {
      return JSON.parse(localStorage.getItem("pact.device-key") ?? "null");
    } catch {
      return null;
    }
  }
  const keys = await deviceKeyFromPage();
  const live = JSON.parse(sessionStorage.getItem("pact.live") ?? "null");
  if (!keys?.pk || !keys?.sk || !live?.pactId) return { ok: false, reason: "missing device key" };
  const path = `/pacts/${live.pactId}/messages`;
  const ts = Math.floor(Date.now() / 1000);
  const offsetMin = -new Date().getTimezoneOffset();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("")));
  let bin = "";
  for (const byte of digest) bin += String.fromCharCode(byte);
  const hash = btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const canon = `${ts}.GET.${path}.${offsetMin}.${hash}`;
  const seed = b64UrlToBytes(keys.sk).slice(0, 32);
  const prefix = Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
  const pkcs8 = new Uint8Array(prefix.length + seed.length);
  pkcs8.set(prefix);
  pkcs8.set(seed, prefix.length);
  const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
  const sigBytes = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(canon)));
  const origin = "https://pact-api.ajeenckyam8.workers.dev";
  const response = await fetch(`${origin}${path}?viewer=${encodeURIComponent(keys.pk)}`, {
    headers: {
      "X-Pact-Pk": keys.pk,
      "X-Pact-Ts": String(ts),
      "X-Pact-Sig": bytesToB64Url(sigBytes),
      "X-Pact-Offset": String(offsetMin),
    },
  });
  if (!response.ok) return { ok: false, reason: `GET ${response.status}` };
  const data = await response.json();
  const messages = Array.isArray(data.messages) ? data.messages : [];
  if (!messages.length) return { ok: false, reason: "empty log" };
  const allowed = ["v", "pactId", "epoch", "senderPk", "kind", "nonce", "ct", "sig"];
  const readable = /"(sleep|water|box|value|time|heartRate|heart_rate|protein|recovery|strain|hrv|steps|kcal|text|message|sender)"\s*:/;
  for (const message of messages) {
    const fields = Object.keys(message);
    if (fields.length !== allowed.length || allowed.some((key) => !fields.includes(key)) || readable.test(JSON.stringify(message))) {
      return { ok: false, reason: `foreign field ${fields.join(",")}` };
    }
  }
  return { ok: true, count: messages.length };
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
  return page.evaluate(async () => {
    const fromDb = await new Promise((resolve) => {
      const req = indexedDB.open("pact", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("account")) db.createObjectStore("account");
        if (!db.objectStoreNames.contains("device")) db.createObjectStore("device");
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("device")) {
          resolve(null);
          return;
        }
        const get = db.transaction("device", "readonly").objectStore("device").get("current");
        get.onsuccess = () => resolve(get.result ?? null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
    if (fromDb && fromDb.pk) return fromDb.pk;
    try {
      return JSON.parse(localStorage.getItem("pact.device-key") ?? "null")?.pk ?? "";
    } catch {
      return "";
    }
  });
}
