import { AwsClient } from "aws4fetch";
import { StorageRouter, type StorageTarget, type UploadInput } from "./storage-router";

export function loadTargets(env: Record<string, string | undefined>): StorageTarget[] {
  const required = (name: string) => { const value = env[name]?.trim(); if (!value) throw new Error(`Missing storage setting: ${name}`); return value; };
  const count = Number(env["AMOUNT_OF_DB"] ?? "1");
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Invalid storage count");
  return Array.from({ length: count }, (_, n) => ({ index: n + 1, accessKeyId: required(`TIGRIS_STORAGE_ACCESS_KEY_ID_${n + 1}`), secretAccessKey: required(`TIGRIS_STORAGE_SECRET_ACCESS_KEY_${n + 1}`), endpoint: required(`TIGRIS_STORAGE_ENDPOINT_${n + 1}`).replace(/\/+$/, ""), baseUrl: required(`BASE_${n + 1}`).replace(/\/+$/, ""), bucket: required(`BUCKET_${n + 1}`) }));
}
export async function objectRequest(target: StorageTarget, key: string, init: RequestInit) {
  if (!key || key.startsWith("/") || key.split("/").includes("..")) throw new Error("Invalid object key");
  const client = new AwsClient({ accessKeyId: target.accessKeyId, secretAccessKey: target.secretAccessKey, service: "s3", region: "auto" });
  return client.fetch(`${target.endpoint}/${encodeURIComponent(target.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`, init);
}
export async function putObject(target: StorageTarget, input: UploadInput) {
  const response = await objectRequest(target, input.key, { method: "PUT", body: input.body as BodyInit, headers: { "content-type": input.contentType ?? "application/octet-stream", "cache-control": input.private ? "private, no-store" : "public, max-age=31536000, immutable", "x-amz-acl": input.private ? "private" : "public-read" } });
  if (!response.ok) {
    const xml = await response.text();
    const error = Object.assign(new Error(`Photo upload failed (${response.status})`), { status: response.status, code: xml.match(/<Code>([^<]+)<\/Code>/)?.[1] });
    throw error;
  }
}
export async function createStorage(targets: StorageTarget[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return new StorageRouter(targets, {
    async get() { const { data, error } = await supabaseAdmin.from("storage_state").select("active_index").eq("id", 1).single(); if (error) throw new Error("Could not read storage state"); return data.active_index; },
    async set(index) { const { error } = await supabaseAdmin.from("storage_state").update({ active_index: index }).eq("id", 1).lt("active_index", index); if (error) throw new Error("Could not save storage state"); },
  }, putObject);
}