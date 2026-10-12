import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("server access, private inbox, feedback gate, and staged edits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nye-test-"));
  const port = 3198,
    origin = `http://localhost:${port}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PREVIEW: "1",
      PREVIEW_TIME: "2026-10-12T12:00:00Z",
      PORT: String(port),
      APP_ORIGIN: origin,
      DB_PATH: join(dir, "test.sqlite"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.once("data", resolve);
      child.once("exit", (c) => reject(Error(`Server exited ${c}`)));
      child.stderr.on("data", () => {});
      setTimeout(() => reject(Error("Server timeout")), 5000).unref();
    });
    const request = (path, body, cookie, customOrigin = origin) =>
      fetch(origin + path, {
        method: body ? "POST" : "GET",
        headers: {
          ...(body
            ? { "Content-Type": "application/json", Origin: customOrigin }
            : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    assert.equal((await request("/api/events")).status, 401);
    assert.equal((await request("/coast.jpg")).status, 401);
    assert.equal((await request("/media/test.jpg")).status, 401);
    assert.equal(
      (
        await request(
          "/api/login",
          { code: "preview" },
          null,
          "https://evil.test",
        )
      ).status,
      403,
    );
    assert.equal((await request("/api/login", { code: "" })).status, 401);
    const g = await request("/api/login", { code: "preview" }),
      guest = g.headers.get("set-cookie").split(";")[0];
    assert.match(g.headers.get("set-cookie"), /HttpOnly/);
    assert.equal((await request("/api/admin", null, guest)).status, 403);
    assert.equal((await request("/api/report", null, guest)).status, 403);
    assert.equal(
      (await request("/api/manage", { action: "approve" }, guest)).status,
      403,
    );
    assert.equal(
      (
        await request(
          "/api/song",
          { event: "2026-12-27", song: "Test artist — Test song" },
          guest,
        )
      ).status,
      201,
    );
    assert.equal(
      (await request("/api/song", { event: "invalid", song: "Test" }, guest))
        .status,
      400,
    );
    assert.equal(
      (
        await request(
          "/api/feedback",
          { event: "2026-12-27", rating: 5, comment: "", consent: true },
          guest,
        )
      ).status,
      403,
    );
    assert.equal(
      (await request("/api/calendar/2026-12-31", null, guest)).status,
      409,
    );
    const a = await request("/api/login", { code: "review" }),
      admin = a.headers.get("set-cookie").split(";")[0];
    let d = await (await request("/api/admin", null, admin)).json();
    assert.equal(d.entries[0].payload.song, "Test artist — Test song");
    let schedule = (await (await request("/api/events", null, guest)).json())
      .events;
    schedule[0].location = "Approved test location";
    assert.equal(
      (
        await request(
          "/api/manage",
          { action: "draft", events: schedule },
          admin,
        )
      ).status,
      200,
    );
    assert.notEqual(
      (await (await request("/api/events", null, guest)).json()).events[0]
        .location,
      "Approved test location",
    );
    await request("/api/manage", { action: "approve" }, admin);
    assert.equal(
      (await (await request("/api/events", null, guest)).json()).events[0]
        .location,
      "Approved test location",
    );
    assert.equal((await request("/api/report", null, admin)).status, 200);
  } finally {
    child.kill();
    await new Promise((r) => child.once("close", r));
    await rm(dir, { recursive: true, force: true });
  }
});
