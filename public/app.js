const $ = (s) => document.querySelector(s),
  app = $("#app"),
  dialog = $("#dialog");
let state,
  session,
  selected = 0;
let countdownTimer;
const chapters = [
  "First light, first notes.",
  "Find your own rhythm.",
  "A little closer to the sea.",
  "One more golden afternoon.",
  "Meet us at the edge of a new year.",
  "Begin on a beautiful note.",
  "One last dance with the tide.",
];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function api(path, body) {
  const r = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Please try again");
  return d;
}
function notice(t) {
  $("#notice").textContent = t;
  setTimeout(() => ($("#notice").textContent = ""), 6500);
}
function modal(html) {
  $("#dialog-content").innerHTML = html;
  dialog.showModal();
}
$(".close").onclick = () => dialog.close();
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});
const day = (e) => new Date(e.date + "T12:00:00-07:00");
const fmt = (e, opts) =>
  day(e).toLocaleDateString("en-US", { timeZone: "America/Mazatlan", ...opts });
const timing = (e) =>
  e.start
    ? new Date(e.start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Mazatlan",
      }) +
      " – " +
      new Date(e.end).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Mazatlan",
      })
    : "Time to be announced";
async function boot() {
  session = await api("/api/session");
  if (!session.role) {
    app.innerHTML = `<main class="gate" id="main"><div class="gate-art"><div class="eyebrow">Kunjan Collective × Paradisus Los Cabos</div><h1>Into<br><em>2027.</em></h1><div class="eyebrow">December 27 — January 2</div></div><div class="gate-form"><div class="eyebrow">An invitation to be here</div><h2>Your week.<br>Your soundtrack.</h2><p>A private music guide for our guests, from sunlit afternoons to the first moments of a new year.</p><form id="login"><label for="code">Invitation code</label><input id="code" name="code" type="password" autocomplete="current-password" required><button class="primary">Enter the experience <span>↗</span></button><p id="login-error" role="alert"></p></form><p class="fine">Find your code in your guest invitation or ask Guest Experience. Management: use your separate review code.</p>${session.preview ? '<p class="fine">LOCAL REVIEW · Guest code: preview · Management code: review</p>' : ""}</div></main>`;
    $("#login").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api("/api/login", { code: $("#code").value });
        await boot();
      } catch (x) {
        $("#login-error").textContent = x.message;
      }
    };
    return;
  }
  state = await api("/api/events");
  render();
}
function render() {
  clearInterval(countdownTimer);
  app.innerHTML = `${session.preview ? '<div class="preview">LOCAL REVIEW · Event details and media subject to management approval</div>' : ""}<div class="wrap"><header><a href="#" class="wordmark" aria-label="Kunjan Collective home">kunjan collective<small>COLLECTED MUSIC INTELLIGENCE</small></a><nav aria-label="Main navigation"><a href="#programme">The programme</a><a href="#experience">The experience</a><a href="#memories">The memories</a>${session.role === "admin" ? '<button id="management">Management ↗</button>' : ""}<button id="logout">Sign out</button></nav></header><main id="main"><section class="hero"><div class="hero-top"><span class="eyebrow">Paradisus Los Cabos · México</span><span class="status"><i class="dot"></i>${state.phase === "archive" ? "The 2026–27 archive" : "Your private guest guide"}</span></div><div class="hero-title"><span class="edition">THE LOS CABOS CHAPTER / 2026—27</span><h1>Between the beat<br>&amp; <em>the tide.</em></h1><span class="hero-year" aria-hidden="true">27</span></div><div class="hero-copy"><p>A DJ. A violin. An ocean of possibility.<br>Your seven-day passage into 2027.</p><a class="button primary" href="#programme">Find your next moment <span>↓</span></a></div><div class="hero-image"><img id="hero-photo" hidden alt=""><div class="tide-lines" aria-hidden="true"><span></span><span></span><span></span></div><span class="image-label">27 DEC 2026 — 02 JAN 2027</span><div class="image-caption"><span class="eyebrow">Baja California Sur</span><strong>Wish you were here?<br>You already are.</strong></div><a class="hero-explore" href="#memories">Explore the private collection ↗</a></div><div class="ribbon"><span>KUNJAN COLLECTIVE × PARADISUS LOS CABOS</span><span>DJ + LIVE VIOLIN</span><span>ALL TIMES · LOS CABOS</span></div></section><section class="section" id="programme"><div class="section-head"><div><span class="eyebrow">01 / Be in the right place</span><h2>Seven days. Seven chapters.</h2></div><p>Find us here, every day. Save your favourite sessions and let the music find you.</p></div>${state.phase === "archive" ? "<p>This chapter is complete. Explore the programme and memories below. Attendance, requests and feedback are now closed.</p>" : ""}<div class="chapter-intro"><span class="eyebrow" id="chapter-number"></span><p id="chapter-title"></p></div><div class="days" role="group" aria-label="Choose a date">${state.events.map((e, i) => `<button class="day ${i === 4 ? "nye" : ""}" data-day="${i}" aria-pressed="${i === selected}"><span>${fmt(e, { weekday: "short" })}</span><strong>${fmt(e, { day: "numeric" })}</strong><span>${fmt(e, { month: "short" })}${i === 4 ? " ✦" : ""}</span></button>`).join("")}</div><div id="event"></div><p class="fine">Calendar reminders include a one-hour alert. Import the file and enable notifications in your calendar; delivery depends on your calendar settings. No SMS or email reminders are active.</p></section><section class="section duo" id="experience"><div><span class="eyebrow">02 / A little less ordinary</span><p class="statement">A conversation between<br>the beat and the bow.</p><p>Kunjan shapes the journey. Nyke Van Wyk brings the strings to life. Together, a sound that moves with the afternoon — and with you.</p><div class="artists"><div>Kunjan<span>DJ / Musical direction</span></div><div>Nyke Van Wyk<span>Live violin</span></div></div><figure class="booth-photo" id="booth-photo" hidden></figure><button id="moment">Take a moment <span>↗</span></button></div><div class="request"><span class="eyebrow">A note to the booth</span><h2>A song.<br>A feeling.<br>A possibility.</h2><p>There’s a carefully curated experience unfolding. Share a song you love; if it fits the moment, it just might find its way into the set.</p><button id="request" ${state.phase === "archive" ? "disabled" : ""}>Request a song <span>↗</span></button><p class="fine">Delivered to our private DJ inbox. Requests are suggestions, not guaranteed plays.</p></div></section><section class="midnight-section"><span class="eyebrow">December 31 / The midnight chapter</span><h2>The last sunset.<br>The first <em>everything.</em></h2><p>One shoreline. A thousand possibilities.<br>Meet us on the beach as a new year begins.</p><div class="countdown" id="countdown" aria-label="Time until New Year in Los Cabos"></div><p class="fine">Counting down to January 1, 2027, 12:00 AM in Los Cabos.<br>Performance start time is still awaiting confirmation.</p><button id="nye-chapter">Explore December 31 ↗</button><span class="midnight-orbit" aria-hidden="true"></span></section><section class="section" id="memories"><div class="section-head"><div><span class="eyebrow">03 / Keep the feeling</span><h2>Some moments stay.</h2></div><p>From above, from the booth, from the moments in between. Original photographs and film from our Los Cabos archive.</p></div><div class="gallery" id="gallery"><div class="gallery-card"><span class="symbol">↗</span><div><h3>From the air.</h3><p>Original aerials · Awaiting event selection</p></div></div><div class="gallery-card"><span class="symbol">▷</span><div><h3>In the moment.</h3><p>Performance films · Coming after review</p></div></div><div class="gallery-card"><span class="symbol">✦</span><div><h3>Into the night.</h3><p>NYE memories · A chapter to come</p></div></div></div></section><section class="section section-head"><div><span class="eyebrow">04 / Your experience matters</span><h2>Tell us how it felt.</h2><p>Help shape the next experience. Anonymous feedback informs a report for Meliá corporate.</p></div><div><button id="feedback" ${state.phase !== "live" ? "disabled" : ""}>Share your experience ↗</button><p class="fine">${state.phase === "archive" ? "Feedback is now closed." : "Open December 27 – January 2, Los Cabos time."}</p></div></section><div id="admin"></div></main><footer class="footer"><div class="wordmark">kunjan collective<small>INTO 2027 / LOS CABOS</small></div><div><p>An independently operated Kunjan Collective event guide for performances at Paradisus Los Cabos. Partner names identify the collaboration; this site is not owned or operated by Meliá.</p><button id="privacy">Privacy & access</button></div></footer></div><nav class="mobile-nav" aria-label="Quick links"><a href="#programme">Programme</a><a href="#experience">Request a song</a><a href="#memories">Memories</a></nav>`;
  $("#logout").onclick = async () => {
    await api("/api/logout", {});
    boot();
  };
  document.querySelectorAll("[data-day]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = Number(b.dataset.day);
        document
          .querySelectorAll("[data-day]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        renderEvent();
      }),
  );
  renderEvent();
  $("#nye-chapter").onclick = () => {
    document.querySelector('[data-day="4"]').click();
    $("#programme").scrollIntoView({ behavior: "smooth" });
  };
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 60000);
  $("#request").onclick = song;
  $("#feedback").onclick = feedback;
  $("#moment").onclick = () => {
    modal(
      `<div class="quiet-moment"><span class="eyebrow">A pause before the next beat</span><h2>Be here.</h2><p>Watch the horizon. Take a breath.<br>The next moment is yours.</p><div class="breath-ring" aria-hidden="true"></div><p class="fine">A silent visual interlude. Stay as long as you like.</p></div>`,
    );
  };
  $("#privacy").onclick = () =>
    modal(
      "<h2>Just this experience.</h2><p>This guide uses an essential, one-day session cookie. Attendance records a session choice, not a verified headcount. Requests and feedback are stored privately without asking for your name, room or phone.</p><p>Please do not include personal information. Management can read submissions and export feedback for Meliá corporate review. No marketing analytics or tracking cookies are used.</p><p>Keep your invitation code private. Access is shared with invited guests and can be revoked by the organizer. Media is for private viewing; please do not redistribute.</p><p>Retention and privacy contact must be confirmed by management before launch. Calendar imports are stored by your calendar provider.</p>",
    );
  if ($("#management")) $("#management").onclick = management;
  loadMedia();
}
function renderEvent() {
  $("#chapter-number").textContent = `CHAPTER 0${selected + 1} / 07`;
  $("#chapter-title").textContent = chapters[selected];
  $("#programme").classList.toggle("night-chapter", selected === 4);
  const e = state.events[selected],
    att = state.attendance.includes(e.id);
  $("#event").innerHTML =
    `<article class="event-card"><div class="event-date"><span class="eyebrow">${fmt(e, { month: "long" })}</span><span class="number">${fmt(e, { day: "numeric" })}</span><span class="fine">${fmt(e, { weekday: "long" })}</span></div><div class="event-body"><span class="tag">${selected === 4 ? "The midnight chapter" : "The afternoon sessions"}</span><h3>${esc(e.title)}</h3><p>DJ Kunjan + Nyke Van Wyk on violin</p><strong>${esc(timing(e))}</strong><div class="fine">Los Cabos local time · UTC−07:00</div></div><div class="event-actions"><button class="primary" id="attend" ${state.phase === "archive" ? "disabled" : ""}>${att ? "✓ You’re planning to attend" : "I’ll be there ↗"}</button>${e.start && state.phase !== "archive" ? `<a class="button" href="/api/calendar/${e.id}">Calendar + 1-hour reminder ↓</a>` : "<button disabled>Reminder awaiting confirmed time</button>"}<span class="fine">A plan to join us, not a reservation. ${att ? "Tap again to remove." : ""}</span></div></article><div class="location"><span aria-hidden="true">⌖</span><div><strong>${esc(e.location)}</strong><p>${esc(e.directions)}</p></div></div>`;
  $("#attend").onclick = async () => {
    try {
      await api("/api/attendance", { event: e.id, attending: !att });
      state.attendance = att
        ? state.attendance.filter((x) => x !== e.id)
        : [...state.attendance, e.id];
      renderEvent();
      notice(
        att
          ? "Your attendance choice was removed."
          : "Saved. We look forward to seeing you.",
      );
    } catch (x) {
      notice(x.message);
    }
  };
}
function options() {
  return state.events
    .map(
      (e, i) =>
        `<option value="${e.id}" ${i === selected ? "selected" : ""}>${fmt(e, { month: "short", day: "numeric" })} · ${esc(e.title)}</option>`,
    )
    .join("");
}
function song() {
  modal(
    `<span class="eyebrow">A suggestion for the moment</span><h2>Send a little inspiration.</h2><p>Our artists curate the experience. If your song fits, it just might get played.</p><form id="song-form"><label for="event-select">Performance</label><select id="event-select">${options()}</select><label for="song">Song & artist</label><input id="song" maxlength="180" required placeholder="The song you can't stop thinking about"><p class="fine">No name, room number or contact details needed.</p><button class="primary">Send to the DJ ↗</button><p class="error" role="alert"></p></form>`,
  );
  $("#song-form").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    b.disabled = true;
    try {
      await api("/api/song", {
        event: $("#event-select").value,
        song: $("#song").value,
      });
      dialog.close();
      notice("Your suggestion is in the private DJ inbox.");
    } catch (x) {
      $(".error").textContent = x.message;
      b.disabled = false;
    }
  };
}
function feedback() {
  modal(
    `<h2>How did it feel?</h2><form id="feedback-form"><label for="fevent">Performance</label><select id="fevent">${options()}</select><label for="rating">Your experience</label><select id="rating" required><option value="">Choose a rating</option>${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} / 5</option>`).join("")}</select><label for="discovery">How did you find us?</label><select id="discovery"><option>Private event guide</option><option>Guest Experience</option><option>Walked by</option><option>Friend or fellow guest</option><option>Other</option></select><label for="comment">Anything to share? (optional)</label><textarea id="comment" maxlength="1000" placeholder="Please leave out names and personal details."></textarea><label><input type="checkbox" id="consent" required>I agree to include this feedback in an anonymous report for Meliá corporate.</label><button class="primary">Send feedback</button><p class="error" role="alert"></p></form>`,
  );
  $("#feedback-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/feedback", {
        event: $("#fevent").value,
        rating: Number($("#rating").value),
        comment: $("#comment").value,
        discovery: $("#discovery").value,
        consent: $("#consent").checked,
      });
      dialog.close();
      notice("Thank you. Your feedback has been saved.");
    } catch (x) {
      $(".error").textContent = x.message;
    }
  };
}
function updateCountdown() {
  const target = Date.parse("2027-01-01T00:00:00-07:00");
  const minutes = Math.max(0, Math.ceil((target - Date.now()) / 60000));
  const el = $("#countdown");
  if (!el) return;
  if (!minutes) {
    el.innerHTML = "<strong>Hello, 2027.</strong>";
    return;
  }
  el.innerHTML = [
    [Math.floor(minutes / 1440), "days"],
    [Math.floor((minutes % 1440) / 60), "hours"],
    [minutes % 60, "minutes"],
  ]
    .map(
      ([n, label]) =>
        `<div><strong>${String(n).padStart(2, "0")}</strong><span>${label}</span></div>`,
    )
    .join("");
}
async function loadMedia() {
  try {
    const { items } = await api("/api/media");
    const hero = items.find((x) => x.role === "hero");
    if (hero) {
      const img = $("#hero-photo");
      img.src = "/media/" + hero.file;
      img.alt = hero.alt;
      img.hidden = false;
    }
    const booth = items.find((x) => x.file === "booth-detail.webp");
    if (booth) {
      $("#booth-photo").hidden = false;
      $("#booth-photo").innerHTML =
        `<img src="/media/${booth.file}" alt="${esc(booth.alt)}" loading="lazy"><figcaption>Behind the sound / Kunjan Collective</figcaption>`;
    }
    if (items.length) {
      $("#gallery").innerHTML = items
        .filter((x) => x.role !== "hero")
        .map(
          (item, i) =>
            `<button class="memory-card memory-${i}" data-memory="${i}" aria-label="${item.type === "video" ? "Play film:" : "View photograph:"} ${esc(item.title)}"><div class="memory-image"><img loading="lazy" src="/media/${esc(item.poster || item.file)}" alt="${esc(item.alt)}"><span class="memory-open">${item.type === "video" ? "▷ PLAY FILM" : "↗ VIEW"}</span></div><span class="memory-caption"><span class="eyebrow">${esc(item.subtitle)}</span><strong>${esc(item.title)}</strong></span></button>`,
        )
        .join("");
      const visible = items.filter((x) => x.role !== "hero");
      document.querySelectorAll("[data-memory]").forEach(
        (b) =>
          (b.onclick = () => {
            const item = visible[Number(b.dataset.memory)];
            dialog.classList.add("media-dialog");
            modal(
              `<div class="lightbox"><span class="eyebrow">The private Los Cabos collection</span><h2>${esc(item.title)}</h2>${item.type === "video" ? `<video controls playsinline preload="metadata" poster="/media/${esc(item.poster)}" aria-label="${esc(item.alt)}"><source src="/media/${esc(item.file)}" type="video/mp4"></video>` : `<img src="/media/${esc(item.file)}" alt="${esc(item.alt)}">`}<p>${esc(item.subtitle)} · Original Kunjan Collective archive</p></div>`,
            );
          }),
      );
    }
  } catch {
    notice("The gallery is temporarily unavailable.");
  }
}
dialog.addEventListener("close", () => {
  dialog.querySelectorAll("video").forEach((v) => v.pause());
  dialog.classList.remove("media-dialog");
});
async function management() {
  try {
    const d = await api("/api/admin");
    $("#admin").innerHTML =
      `<section class="admin"><span class="eyebrow">Management only / review desk</span><h2>The details behind the feeling.</h2><p>Private DJ inbox · Refresh while performing to see new requests.</p><button id="refresh">Refresh inbox</button><div>${
        d.entries
          .filter((x) => x.kind === "song")
          .map(
            (x) =>
              `<div class="inbox-item"><strong>${esc(x.payload.song)}</strong><div class="fine">${esc(x.event)} · Received ${esc(x.created)} UTC</div></div>`,
          )
          .join("") || "<p>No requests yet.</p>"
      }</div><details><summary>AV rider & operational plan</summary><ul>${d.rider.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p>All operational timings, vendor scope and production safety plans require management and AV sign-off.</p></details><details><summary>Review & edit the programme</summary><p>Edit locations, directions and confirmed times below. Save a draft, review it, then approve to update the guest guide. Use ISO timestamps with -07:00 offset; leave NYE times null until confirmed.</p><label for="schedule-edit">Programme draft (JSON)</label><textarea id="schedule-edit">${esc(JSON.stringify(d.draft || state.events, null, 2))}</textarea><button id="save-draft">Save draft</button> <button id="approve" ${d.draft ? "" : "disabled"}>Approve saved draft</button><p class="fine">${d.draft ? "A saved draft is awaiting approval. Approval publishes this saved version, not unsaved edits." : "No pending draft."}</p></details><details><summary>Attendance & corporate feedback report</summary><p>${d.entries.filter((x) => x.kind === "attendance" && x.payload.attending).length} session attendance choices · ${d.entries.filter((x) => x.kind === "feedback").length} feedback responses</p><p>Session choices are indicative interest, not unique guests or verified attendance. Feedback is self-selected; review comments for personal information before sharing.</p><a class="button" href="/api/report">Download Meliá review report ↓</a></details></section>`;
    $("#admin").scrollIntoView({ behavior: "smooth" });
    $("#refresh").onclick = management;
    $("#save-draft").onclick = async () => {
      try {
        await api("/api/manage", {
          action: "draft",
          events: JSON.parse($("#schedule-edit").value),
        });
        notice("Draft saved for review.");
        management();
      } catch (x) {
        notice(x.message);
      }
    };
    $("#approve").onclick = async () => {
      try {
        await api("/api/manage", { action: "approve" });
        state = await api("/api/events");
        renderEvent();
        notice("Approved schedule is now visible to guests.");
        management();
      } catch (x) {
        notice(x.message);
      }
    };
  } catch (x) {
    notice(x.message);
  }
}
boot().catch((x) => {
  app.innerHTML =
    '<main class="wrap"><h1>We’ll be right back.</h1><p>The event guide is temporarily unavailable. Please refresh or check with Guest Experience.</p></main>';
});
