export const zone = "America/Mazatlan";
export const opens = Date.parse("2026-12-27T00:00:00-07:00");
export const closes = Date.parse("2027-01-03T00:00:00-07:00");
export const events = [
  "2026-12-27",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-02",
].map((date, i) => ({
  id: date,
  date,
  title: i === 4 ? "NYE on the Beach" : "Beach’y Beats",
  start: i === 4 ? null : `${date}T14:00:00-07:00`,
  end: i === 4 ? null : `${date}T16:00:00-07:00`,
  location: "Exact location awaiting management confirmation",
  directions: "Please check with Guest Experience before making your way over.",
}));
export function phase(now = Date.now()) {
  return now >= closes ? "archive" : now >= opens ? "live" : "upcoming";
}
export function calendar(e) {
  if (!e.start || !e.end) throw Error("Time not confirmed");
  const utc = (x) =>
    new Date(x).toISOString().replace(/[-:]/g, "").replace(".000", "");
  const esc = (x) =>
    x.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kunjan Collective//NYE//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@kunjancollective.com`,
    "DTSTAMP:20261012T000000Z",
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(e.title + " • Kunjan + Nyke Van Wyk")}`,
    `LOCATION:${esc(e.location)}`,
    "DESCRIPTION:Check the private event guide for location updates.",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Your music experience begins in one hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
