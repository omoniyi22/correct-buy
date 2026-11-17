export type StorageTarget = { index: number; accessKeyId: string; secretAccessKey: string; endpoint: string; baseUrl: string; bucket: string };
export interface ActiveIndexStore { get(): Promise<number>; set(index: number): Promise<void> }
export type UploadInput = { key: string; body: Uint8Array; contentType?: string; private?: boolean };
export class AllStoragesFullError extends Error {
  constructor() { super("Image storage is full, contact admin"); this.name = "AllStoragesFullError"; }
}
export function isStorageFullError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string };
  return e.status === 402 || e.status === 507 || /^(QuotaExceeded|StorageQuotaExceeded|StorageFull|InsufficientStorage|PaymentRequired)$/.test(e.code ?? "");
}
export class StorageRouter {
  constructor(private targets: StorageTarget[], private state: ActiveIndexStore, private put: (target: StorageTarget, input: UploadInput) => Promise<void>) {}
  async upload(input: UploadInput) {
    const start = await this.state.get();
    for (const target of this.targets.filter((t) => t.index >= start)) {
      try {
        await this.put(target, input);
        if (target.index !== start) await this.state.set(target.index);
        return { key: input.key, storage: target.index };
      } catch (error) {
        if (!isStorageFullError(error)) throw error;
        await this.state.set(Math.min(target.index + 1, this.targets.length));
      }
    }
    throw new AllStoragesFullError();
  }
}