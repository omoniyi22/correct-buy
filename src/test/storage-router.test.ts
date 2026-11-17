import { describe, expect, it } from "vitest";
import { AllStoragesFullError, StorageRouter, type StorageTarget } from "@/lib/storage-router";

const targets: StorageTarget[] = [1, 2].map((index) => ({ index, accessKeyId: "fixture", secretAccessKey: "fixture", endpoint: "https://example.invalid", baseUrl: "https://example.invalid", bucket: `fixture-${index}` }));
const input = { key: "products/photo.jpg", body: new Uint8Array([1]) };
function state(initial = 1) { let index = initial; return { get: async () => index, set: async (value: number) => { index = value; } }; }
describe("two-bucket storage rules", () => {
  it("starts in bucket 1 and stays there after success", async () => {
    const store = state(); const calls: number[] = [];
    const router = new StorageRouter(targets, store, async (target) => { calls.push(target.index); });
    expect(await router.upload(input)).toEqual({ key: "products/photo.jpg", storage: 1 });
    await router.upload(input); expect(calls).toEqual([1, 1]);
  });
  it.each([402, 507])("rotates forward on quota status %s and remembers bucket 2", async (status) => {
    const store = state(); const calls: number[] = [];
    const router = new StorageRouter(targets, store, async (target) => { calls.push(target.index); if (target.index === 1) throw { status }; });
    expect((await router.upload(input)).storage).toBe(2);
    await router.upload(input); expect(calls).toEqual([1, 2, 2]); expect(await store.get()).toBe(2);
  });
  it.each([403, 500])("does not rotate on real failure %s", async (status) => {
    const store = state(); const calls: number[] = [];
    const router = new StorageRouter(targets, store, async (target) => { calls.push(target.index); throw { status }; });
    await expect(router.upload(input)).rejects.toEqual({ status }); expect(calls).toEqual([1]); expect(await store.get()).toBe(1);
  });
  it("never retries a prior bucket and reports all remaining buckets full", async () => {
    const calls: number[] = []; const router = new StorageRouter(targets, state(2), async (target) => { calls.push(target.index); throw { code: "QuotaExceeded" }; });
    await expect(router.upload(input)).rejects.toBeInstanceOf(AllStoragesFullError); expect(calls).toEqual([2]);
  });
});