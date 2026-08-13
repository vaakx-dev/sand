import assert from "node:assert/strict";
import test from "node:test";

import { normalizeVersion, resolveCanaryVersion } from "./releaseVersion.mjs";

test("normalizes a release tag version", () => {
  assert.equal(normalizeVersion("v1.2.3-alpha.1"), "1.2.3-alpha.1");
});

test("rejects an invalid semantic version", () => {
  assert.throws(() => normalizeVersion("1.2"), /Invalid semantic version/);
});

test("builds a canary for the next patch", () => {
  assert.equal(
    resolveCanaryVersion("0.0.1", "20260813", "42"),
    "0.0.2-canary.20260813.42",
  );
});

test("uses the stable core when the current version has a suffix", () => {
  assert.equal(
    resolveCanaryVersion("1.4.2-alpha.3+build.9", "20260813", 43),
    "1.4.3-canary.20260813.43",
  );
});

test("rejects impossible dates and invalid run numbers", () => {
  assert.throws(
    () => resolveCanaryVersion("1.2.3", "20260230", 1),
    /Invalid canary date/,
  );
  assert.throws(
    () => resolveCanaryVersion("1.2.3", "20260813", 0),
    /Invalid canary run number/,
  );
});
