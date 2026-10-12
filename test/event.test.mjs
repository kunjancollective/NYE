import { test } from "node:test";
import assert from "node:assert/strict";
import { events, calendar, phase } from "../events.mjs";
test("seven dates and six confirmed afternoon sessions", () => {
  assert.equal(events.length, 7);
  assert.equal(events.filter((x) => x.start).length, 6);
  assert.equal(events[4].start, null);
  assert.equal(events[6].date, "2027-01-02");
});
test("Los Cabos window is inclusive through January 2", () => {
  assert.equal(phase(Date.parse("2026-12-27T06:59:59Z")), "upcoming");
  assert.equal(phase(Date.parse("2026-12-27T07:00:00Z")), "live");
  assert.equal(phase(Date.parse("2027-01-03T06:59:59Z")), "live");
  assert.equal(phase(Date.parse("2027-01-03T07:00:00Z")), "archive");
});
test("calendar exports absolute time and real one-hour alarm; refuses TBD", () => {
  const c = calendar(events[0]);
  assert.match(c, /DTSTART:20261227T210000Z/);
  assert.match(c, /DTEND:20261227T230000Z/);
  assert.match(c, /TRIGGER:-PT1H/);
  assert.throws(() => calendar(events[4]));
});
