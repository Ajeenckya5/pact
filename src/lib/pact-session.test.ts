import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { inviteProof } from "@pact/core";
import { heldInvite, issueJoinMac, readPact, rememberPact } from "./pact-session";

type Store = Map<string, string>;

function installBrowser(hash: string) {
  const store: Store = new Map();
  const location = { hash, pathname: "/join", search: "" };
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    dump: () => store,
  };
  const history = {
    state: null as unknown,
    replaceState(_state: unknown, _title: string, url: string) {
      location.hash = url.includes("#") ? `#${url.split("#")[1]}` : "";
    },
  };
  const windowStub = {
    location,
    history,
    sessionStorage,
    dispatchEvent() {},
  };
  Object.assign(globalThis, { window: windowStub });
  return sessionStorage;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("invite secret", () => {
  it("keeps the invite secret out of sessionStorage", () => {
    const storage = installBrowser("");
    rememberPact("pact-1", "super-secret-value");
    const dumped = [...storage.dump().values()].join(" ");
    assert.equal(dumped.includes("super-secret-value"), false);
    assert.equal(heldInvite("pact-1"), "super-secret-value");
  });

  it("clears the URL fragment after reading it", () => {
    installBrowser("#pact-1.super-secret-value");
    const room = readPact();
    assert.equal(room?.pactId, "pact-1");
    assert.equal(window.location.hash, "");
    assert.equal(heldInvite("pact-1"), "super-secret-value");
  });

  it("discards the invite secret when the join MAC is issued", async () => {
    installBrowser("#pact-1.super-secret-value");
    readPact();
    const mac = await issueJoinMac("pact-1");
    assert.equal(mac, await inviteProof("super-secret-value", "pact-1"));
    assert.equal(heldInvite("pact-1"), null);
    assert.equal(await issueJoinMac("pact-1"), null);
  });
});
