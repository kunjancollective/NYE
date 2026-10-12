import http from "node:http";
import { readFile, mkdir, readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, basename } from "node:path";
import { randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { events, phase, calendar } from "./events.mjs";
const preview = process.env.PREVIEW === "1",
  port = Number(process.env.PORT || 3000),
  origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
if (
  !preview &&
  (!process.env.INVITE_CODE ||
    !process.env.ADMIN_CODE ||
    !process.env.SESSION_SECRET)
)
  throw Error(
    "Set INVITE_CODE, ADMIN_CODE and SESSION_SECRET; use npm run dev for local preview",
  );
if (
  !preview &&
  (process.env.SESSION_SECRET.length < 32 ||
    process.env.INVITE_CODE.length < 16 ||
    process.env.ADMIN_CODE.length < 20 ||
    process.env.INVITE_CODE === process.env.ADMIN_CODE ||
    !origin.startsWith("https://"))
)
  throw Error(
    "Production requires HTTPS origin, strong distinct codes and 32+ character session secret",
  );
const lifecycle = () =>
  phase(
    preview && process.env.PREVIEW_TIME
      ? Date.parse(process.env.PREVIEW_TIME)
      : Date.now(),
  );
const secret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
await mkdir(".data", { recursive: true });
const db = new DatabaseSync(process.env.DB_PATH || ".data/event.sqlite");
db.exec(
  `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY,kind TEXT,guest TEXT,event TEXT,payload TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,payload TEXT);`,
);
const limits = new Map();
setInterval(() => limits.clear(), 60000).unref();
const sign = (x) => createHmac("sha256", secret).update(x).digest("base64url");
const equal = (a, b) => {
  const x = Buffer.from(a || ""),
    y = Buffer.from(b || "");
  return x.length === y.length && timingSafeEqual(x, y);
};
function session(req) {
  try {
    const t = (req.headers.cookie || "")
      .split("; ")
      .find((x) => x.startsWith("nye="))
      ?.slice(4);
    const [s, h] = t.split(".");
    if (!equal(sign(s), h)) return null;
    const v = JSON.parse(Buffer.from(s, "base64url"));
    return v.exp > Date.now() ? v : null;
  } catch {
    return null;
  }
}
function cookie(role) {
  const v = Buffer.from(
    JSON.stringify({
      role,
      id: randomBytes(16).toString("hex"),
      exp: Date.now() + 86400000,
    }),
  ).toString("base64url");
  return `nye=${v}.${sign(v)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${preview ? "" : "; Secure"}`;
}
function programme() {
  const row = db
    .prepare("SELECT payload FROM settings WHERE id='published'")
    .get();
  return row ? JSON.parse(row.payload) : events;
}
const types = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".webp": "image/webp",
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, origin),
      path = url.pathname;
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    if (!preview)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    const send = (status, data, type = "application/json") => {
      res.writeHead(status, { "Content-Type": type });
      res.end(type === "application/json" ? JSON.stringify(data) : data);
    };
    try {
      if (path === "/robots.txt")
        return send(200, "User-agent: *\nDisallow: /", "text/plain");
      if (req.method === "POST") {
        if (req.headers.origin !== origin)
          return send(403, { error: "Invalid request origin" });
        const key = req.socket.remoteAddress;
        const count = (limits.get(key) || 0) + 1;
        limits.set(key, count);
        if (count > 40)
          return send(429, {
            error: "Please wait a minute before trying again.",
          });
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 16000)
            return send(413, { error: "Request too large" });
        }
        let b;
        try {
          b = JSON.parse(body);
        } catch {
          return send(400, { error: "Invalid request" });
        }
        if (path === "/api/login") {
          let role =
            typeof b.code === "string" &&
            b.code.length > 0 &&
            process.env.ADMIN_CODE &&
            equal(b.code, process.env.ADMIN_CODE)
              ? "admin"
              : typeof b.code === "string" &&
                  b.code.length > 0 &&
                  process.env.INVITE_CODE &&
                  equal(b.code, process.env.INVITE_CODE)
                ? "guest"
                : null;
          if (preview && b.code === "preview") role = "guest";
          if (preview && b.code === "review") role = "admin";
          if (!role)
            return send(401, {
              error: "That invitation code was not recognized.",
            });
          res.setHeader("Set-Cookie", cookie(role));
          return send(200, { ok: true });
        }
        if (path === "/api/logout") {
          res.setHeader(
            "Set-Cookie",
            "nye=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          );
          return send(200, { ok: true });
        }
        const s = session(req);
        if (!s)
          return send(401, { error: "Please enter your invitation code." });
        if (path === "/api/manage") {
          if (s.role !== "admin")
            return send(403, { error: "Management access required" });
          if (b.action === "draft") {
            if (!Array.isArray(b.events) || b.events.length !== 7)
              return send(400, { error: "Seven events required" });
            const draft = events.map((e, i) => {
              const v = b.events[i];
              if (
                v.id !== e.id ||
                typeof v.location !== "string" ||
                typeof v.directions !== "string" ||
                v.location.length > 180 ||
                v.directions.length > 500
              )
                throw Error("Invalid schedule");
              let start = v.start || null,
                end = v.end || null;
              if (
                (start || end) &&
                (!start ||
                  !end ||
                  !Number.isFinite(Date.parse(start)) ||
                  !Number.isFinite(Date.parse(end)) ||
                  Date.parse(end) <= Date.parse(start) ||
                  !start.startsWith(e.date) ||
                  !end.startsWith(e.date) ||
                  !start.endsWith("-07:00") ||
                  !end.endsWith("-07:00"))
              )
                throw Error("Use same-day start/end with -07:00 offset");
              return {
                ...e,
                start,
                end,
                location: v.location,
                directions: v.directions,
              };
            });
            db.prepare("INSERT OR REPLACE INTO settings VALUES('draft',?)").run(
              JSON.stringify(draft),
            );
          } else if (b.action === "approve") {
            const d = db
              .prepare("SELECT payload FROM settings WHERE id='draft'")
              .get();
            if (!d) return send(400, { error: "No draft to approve" });
            db.prepare(
              "INSERT OR REPLACE INTO settings VALUES('published',?)",
            ).run(d.payload);
            db.prepare("DELETE FROM settings WHERE id='draft'").run();
          } else return send(400, { error: "Unknown action" });
          db.prepare(
            "INSERT INTO entries(kind,guest,payload) VALUES('audit',?,?)",
          ).run(s.id, JSON.stringify({ action: b.action }));
          return send(200, { ok: true });
        }
        if (lifecycle() === "archive")
          return send(410, {
            error: "This event is now archived. Submissions are closed.",
          });
        const e = programme().find((x) => x.id === b.event);
        if (!e) return send(400, { error: "Choose a performance" });
        let payload, kind;
        if (path === "/api/attendance") {
          kind = "attendance";
          payload = { attending: b.attending === true };
          db.prepare(
            "DELETE FROM entries WHERE kind='attendance' AND guest=? AND event=?",
          ).run(s.id, e.id);
        } else if (path === "/api/song") {
          kind = "song";
          if (
            typeof b.song !== "string" ||
            !b.song.trim() ||
            b.song.length > 180
          )
            return send(400, {
              error: "Enter a song and artist (up to 180 characters).",
            });
          payload = { song: b.song.trim() };
        } else if (path === "/api/feedback") {
          if (lifecycle() !== "live")
            return send(403, {
              error:
                "Feedback opens December 27 and closes after January 2, Los Cabos time.",
            });
          kind = "feedback";
          if (
            !Number.isInteger(b.rating) ||
            b.rating < 1 ||
            b.rating > 5 ||
            typeof b.comment !== "string" ||
            b.comment.length > 1000 ||
            b.consent !== true
          )
            return send(400, {
              error: "Choose a rating and agree to anonymous reporting.",
            });
          payload = {
            rating: b.rating,
            comment: b.comment,
            discovery: String(b.discovery || "").slice(0, 80),
          };
        } else return send(404, { error: "Not found" });
        db.prepare(
          "INSERT INTO entries(kind,guest,event,payload) VALUES(?,?,?,?)",
        ).run(kind, s.id, e.id, JSON.stringify(payload));
        return send(201, { ok: true });
      }
      const s = session(req);
      if (path === "/api/session")
        return send(200, { role: s?.role || null, preview });
      if (
        path.startsWith("/api/") ||
        path.startsWith("/media/") ||
        path === "/coast.jpg"
      ) {
        if (!s) return send(401, { error: "Invitation required" });
      }
      if (path === "/api/events")
        return send(200, {
          events: programme(),
          phase: lifecycle(),
          attendance: db
            .prepare(
              "SELECT event,payload FROM entries WHERE kind='attendance' AND guest=?",
            )
            .all(s.id)
            .filter((x) => JSON.parse(x.payload).attending)
            .map((x) => x.event),
        });
      if (path.startsWith("/api/calendar/")) {
        const e = programme().find((x) => x.id === path.split("/").pop());
        if (!e?.start || !e?.end)
          return send(409, { error: "Time not confirmed" });
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${e.id}.ics"`,
        );
        return send(200, calendar(e), "text/calendar");
      }
      if (path === "/api/media") {
        let files = [];
        try {
          files = (await readdir("private-media")).filter((x) =>
            /^[\w.-]+\.(jpg|png|webp|mp4|webm)$/i.test(x),
          );
        } catch {}
        return send(200, { files });
      }
      if (path.startsWith("/media/")) {
        const file = path.slice(7);
        if (
          file !== basename(file) ||
          !/^[\w.-]+\.(jpg|png|webp|mp4|webm)$/i.test(file)
        )
          return send(404, { error: "Not found" });
        const full = resolve("private-media", file),
          info = await stat(full);
        if (!info.isFile()) return send(404, { error: "Not found" });
        const type = types[file.slice(file.lastIndexOf(".")).toLowerCase()];
        res.setHeader("Accept-Ranges", "bytes");
        let start = 0,
          end = info.size - 1,
          status = 200;
        if (req.headers.range) {
          const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
          if (!m) return send(416, { error: "Invalid range" });
          start = Number(m[1]);
          end = m[2] ? Math.min(Number(m[2]), end) : end;
          if (start > end || start >= info.size) {
            res.setHeader("Content-Range", `bytes */${info.size}`);
            return send(416, { error: "Invalid range" });
          }
          status = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
        }
        res.writeHead(status, {
          "Content-Type": type,
          "Content-Length": end - start + 1,
        });
        const stream = createReadStream(full, { start, end });
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        stream.pipe(res);
        return;
      }
      if (path === "/api/admin" || path === "/api/report") {
        if (s.role !== "admin")
          return send(403, { error: "Management access required" });
        const entries = db
          .prepare(
            "SELECT id,kind,event,payload,created FROM entries ORDER BY id DESC",
          )
          .all()
          .map((x) => ({ ...x, payload: JSON.parse(x.payload) }));
        if (path === "/api/report") {
          const f = entries.filter((x) => x.kind === "feedback");
          const rows = [
            [
              "Kunjan Collective / Paradisus NYE 2026–27 — Meliá corporate review",
            ],
            ["Responses", f.length],
            [
              "Average rating",
              f.length
                ? (
                    f.reduce((n, x) => n + x.payload.rating, 0) / f.length
                  ).toFixed(2)
                : "No responses",
            ],
            ["Event", "Rating", "Discovery", "Comment"],
            ...f.map((x) => [
              x.event,
              x.payload.rating,
              x.payload.discovery,
              x.payload.comment,
            ]),
          ];
          const safe = (v) =>
            '"' +
            String(v)
              .replace(/^[=+@\-\t\r]/, "'$&")
              .replace(/"/g, '""') +
            '"';
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="melia-feedback-report.csv"',
          );
          return send(
            200,
            rows.map((r) => r.map(safe).join(",")).join("\r\n"),
            "text/csv",
          );
        }
        return send(200, {
          entries,
          draft: JSON.parse(
            db.prepare("SELECT payload FROM settings WHERE id='draft'").get()
              ?.payload || "null",
          ),
          rider: [
            "Daily: 2 tops + 2 subs, stereo L/R. Confirm provider and signal path with property AV.",
            "Pioneer REV5 provided by artist. Confirm laptop, DI, cabling and power requirements.",
            "CRITICAL: dedicated violin monitor; independent mix, position and level approved by Nyke during soundcheck.",
            "NYE: equipment supplied by local AV. Vendor, inventory, patch list and soundcheck schedule require sign-off.",
            "Management: confirm exact beach/pool site, accessible route, rain/wind fallback, electrical safety, noise limits, load-in and secure storage.",
            "Before each performance: AV line check, violin monitor check, Guest Experience location update. NYE cue sheet and midnight sequence pending.",
          ],
        });
      }
      const files = {
        "/": "index.html",
        "/app.js": "app.js",
        "/style.css": "style.css",
        "/coast.jpg": "coast.jpg",
      };
      if (!files[path]) return send(404, "Not found", "text/plain");
      const file = files[path];
      return send(
        200,
        await readFile(resolve("public", file)),
        path === "/"
          ? "text/html; charset=utf-8"
          : types[file.slice(file.lastIndexOf("."))],
      );
    } catch (err) {
      send(400, {
        error:
          err.code === "ENOENT"
            ? "Not found"
            : "Unable to process this request. Check the supplied values.",
      });
    }
  })
  .listen(port, preview ? "127.0.0.1" : "0.0.0.0", () =>
    console.log(`NYE ${preview ? "local preview" : "server"}: ${origin}`),
  );
