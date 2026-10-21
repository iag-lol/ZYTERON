import test from "node:test";
import assert from "node:assert/strict";
import { mediaCapacity } from "./media-capacity";

test("uploads wait for active downloads and hold the capacity until completion", async () => {
  const acquire = mediaCapacity(),
    first = await acquire(1),
    second = await acquire(1);
  let uploadStarted = false,
    laterDownloadStarted = false;
  const upload = acquire(3).then((release) => {
    uploadStarted = true;
    return release;
  });
  const later = acquire(1).then((release) => {
    laterDownloadStarted = true;
    return release;
  });
  first();
  first();
  await Promise.resolve();
  assert.equal(uploadStarted, false);
  assert.equal(laterDownloadStarted, false);
  second();
  const finishUpload = await upload;
  assert.equal(laterDownloadStarted, false);
  finishUpload();
  (await later)();
});
test("excess waiting requests are rejected and releasing twice does not free another slot", async () => {
  const acquire = mediaCapacity(),
    release = await acquire(3);
  const waiting = Array.from({ length: 12 }, () => acquire(1));
  await assert.rejects(acquire(1), { status: 429 });
  release();
  release();
  for (const next of waiting) (await next)();
});
