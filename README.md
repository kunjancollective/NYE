# Into 2027 — private event guide

Kunjan Collective × Paradisus Los Cabos, December 27, 2026–January 2, 2027. Independent Kunjan Collective site; partner branding does not imply Meliá ownership. **Review build. No deployment or DNS changes have been made.**

## Run locally

Node 24.15 or later. No third-party runtime dependencies or install step.

```
npm run dev
npm test
```

Open http://localhost:3000. Local guest code: `preview`; management code: `review`. These work only with `PREVIEW=1`. Local preview binds to loopback. Production refuses missing/weak secrets and a non-HTTPS origin. Run with injected environment variables and `npm start`; Node does not automatically load `.env`.

## Implemented

- “Between the beat & the tide” creative direction: sand/sea-blue editorial design, seven chapter moods, a midnight section and a timezone-correct New Year countdown, reduced-motion wave motif, keyboard-friendly dialogs and silent visual interlude. The countdown is explicitly separate from the TBD NYE performance time.
- Seven performances. Six Beach’y Beats sessions at 14:00–16:00; Dec 31 has no invented time. America/Mazatlan / UTC−07:00 throughout.
- Invitation-code access and separate management code. Signed, expiring HttpOnly/SameSite cookies; Secure in production. Server-side role checks protect inbox, rider, edits and reports. Private media and hero image require a session. Noindex is supplementary, not access control.
- SQLite-backed attendance choices (one per session/event; not verified headcount), private song inbox, refresh button. No personal DJ contact details exposed. Requests are not guaranteed plays.
- Real `.ics` downloads with a one-hour VALARM for confirmed sessions. Guests must import and enable calendar alerts. No SMS, email, WhatsApp or push delivery is claimed.
- Server-enforced feedback window: Dec 27 00:00 through Jan 2 23:59:59 local. Rating, discovery source, optional comment, reporting consent. Management-only CSV with response count, average and comments, with spreadsheet formula escaping. Export is for review; no automatic corporate transmission.
- Server-only AV rider, operational checklist, editable JSON schedule drafts, explicit approval and audit entries. Drafts do not change the guest schedule until approval.
- Curated authenticated gallery from an untracked `private-media/` directory (or MEDIA_DIR). Only filenames in media.mjs are served. Five supplied Los Cabos photographs and a 20-second beach film are integrated in the local review, with lightbox viewing and byte-range video playback. The files are intentionally absent from GitHub and must be transferred privately to the host. Original files are retained separately; web derivatives omit source metadata.
- Automatic read-only archive after Jan 2 local midnight boundary. Access remains private. No automatic public portfolio conversion.
- Same-origin POST checks, bounded request bodies, request throttling, escaped rendered data, parameterized SQL, CSP, no third-party analytics/fonts/scripts.

## Needed before staging and launch

1. **Hosting/domain:** identify the host behind kunjancollective.com and provide its project access through a secure credential flow. Preferred isolated staging hostname: `nye-review.kunjancollective.com`; proposed final hostname: `nye.kunjancollective.com`. Neither is configured. If `/nye` on the apex is required, configure the existing site's proxy to strip `/nye` and update absolute paths/cookie scope, then test. Do not overwrite the existing website.
2. **Secrets:** distinct strong guest invitation code (16+ characters), management code (20+), session secret (32+), exact HTTPS APP_ORIGIN. Supply via secret manager, not repository/chat. Confirm invited management reviewers and DJ access. Shared management code is suitable for bounded review; individual SSO/MFA accounts and named approval audit are recommended before broader operational use.
3. **Event approval:** precise daily locations, confirmed NYE start/end, Guest Experience contact wording, accessible walking route/map, weather fallback, capacity/reservation rules, approved programme.
4. **Media/branding:** supplied Los Cabos aerials, booth detail and beach film are now integrated locally, pending management approval. Still needed: approved Paradisus logos, artist portraits, performance footage and releases/permissions. No La Boom recap is supplied. The new hero uses the supplied DJI_0426 panorama. No supplied private media is committed to the public repository.
5. **AV:** daily provider for two tops/two subs stereo L/R; REV5 artist provision; dedicated violin monitor independent mix; local NYE AV vendor, inventory, patch, crew, power, load-in, soundcheck, weather protection and midnight cue sheet.
6. **Privacy:** approve retention period, accountable contact and corporate recipient. Current copy explicitly marks these pending. No automated deletion job is enabled; export then purge agreed records/backups under the approved policy. Comments must be reviewed/redacted before corporate sharing; free text can contain volunteered personal information.
7. **Delivery:** decide if manual DJ inbox refresh is sufficient or commission real-time push/provider alerts. No external notifications are wired. Calendar imports do not receive future schedule revisions automatically; communicate changes and re-import as appropriate.

## Staged deployment / management review

- Review this PR, pass CI and inspect guest + management flows at mobile and desktop widths.
- Provision one persistent Node instance with a persistent `.data` volume and private-media volume, HTTPS termination, backups and restrictive filesystem permissions. This is **not compatible with ephemeral/serverless filesystem hosting as-is**.
- Container image can be built from Dockerfile. Mount persistent directories writable by UID 1000. Inject secrets and APP_ORIGIN, never PREVIEW. Put staging behind host-level access protection too. Do not configure GitHub Pages or an automatic public deployment.
- Add reverse-proxy per-client throttling and body limits. Current process-local throttle keys the socket address, so a shared proxy would aggregate guests; configure edge throttling before launch. Use one instance unless replacing SQLite/throttling/session design with shared services.
- Stage test data separately; verify unauthorized access, origin checks, cookie attributes, invitation rotation, rate limiting, calendar import on iOS/Android, protected video playback, report export and timezone boundaries. Rotate SESSION_SECRET to revoke all issued sessions; changing only invitation codes does not revoke existing sessions until their one-day expiry.
- Management reviews branding, locations/times, AV and consent. Save schedule draft, inspect, approve. Approval is an explicit action by the currently authenticated manager; this is not a two-person approval system.
- Only after management sign-off: configure final hostname/APP_ORIGIN, distribute private URL + guest code via agreed property channels. Monitor backups and inbox during performances.
- After Jan 2: submissions close automatically; export/review corporate feedback, follow retention policy, curate the archive. A public resume excerpt requires separate media/privacy approval.

## Verification and limits

`npm test` covers the schedule, UTC conversions, calendar alarm, exact feedback/archive boundaries, guest/admin authorization, private media gate, origin checks, malformed/empty login, private request persistence and draft-to-approved separation. Browser review covers rendered guest page and responsive flows. Load testing, real hosted TLS/proxy behavior, actual calendar notifications and actual event video playback require staging. No fabricated attendee data or testimonials.

Reference sites inspected: https://kunjancollective.com/ and https://www.melia.com/en/hotels/mexico/los-cabos/paradisus-los-cabos . Existing site emphasizes original footage and artist-led curated performance; property page informed the resort context. No site copy or stock photos reproduced.

## Private media handoff (October 12 creative pass)

The local `NYE-private-media.zip` deliverable contains five WebP photographs, one WebP film poster and one MP4 (approximately 8 MB combined). Extract into the private-media volume, or set MEDIA_DIR to its private filesystem directory. Do not put these files in public/, commit them, attach them to the public PR, or host them at unauthenticated URLs. Only entries in media.mjs are eligible for serving. Without that volume, the code remains runnable with the abstract hero and gallery placeholders.

Source mapping: DJI_0426 → coastline.webp; DJI_0451 → resort-panorama.webp; DJI_0452 → resort-detail.webp; DJI_0449 → horizon.webp; IMG_9566 → booth-detail.webp; IMG_9555 → beach-session.mp4 and beach-session.webp. The film depicts a beach moment with passing horses, not a music performance. It starts only on user action; sound is controlled by the player. Source images and the original MOV remain local outside the checkout in work/media-originals.
