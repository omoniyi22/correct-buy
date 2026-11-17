import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStorage, loadTargets, objectRequest } from "@/lib/storage.server";
import { storage } from "@/lib/storage";
import { setResponseHeader } from "@tanstack/react-start/server";

// Tigris credentials remain inside authenticated server handlers.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const fileInput = z.object({
  name: z.string().min(1).max(200),
  type: z.string().refine((t) => IMAGE_TYPES.includes(t), "Only image files can be uploaded"),
  data: z.string().min(1).max(Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8, "Images must be under 5 MB"),
});

function decode(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const ext = (name: string) => (name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";

/** Staff-only: product photos, blog covers, hero promotion images. Returns the public URL. */
export const uploadStoreImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fileInput.extend({ folder: z.enum(["products", "blog", "hero"]).default("products") }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Not allowed");
    const bytes = decode(data.data);
    if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Images must be under 5 MB");
    const router = await createStorage(loadTargets(process.env));
    const res = await router.upload({ key: `${data.folder}/${crypto.randomUUID()}.${ext(data.name)}`, body: bytes, contentType: data.type });
    return { ...res, url: storage.urlFor(res.storage, res.key) };
  });

/** Signed-in customer: a photo for their own return request. Returns the stored key. */
export const uploadReturnPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fileInput.parse(d))
  .handler(async ({ data, context }) => {
    const bytes = decode(data.data);
    if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("Photo must be under 5 MB");
    const router = await createStorage(loadTargets(process.env));
    const res = await router.upload({ key: `returns/${context.userId}/${crypto.randomUUID()}.${ext(data.name)}`, body: bytes, contentType: data.type, private: true });
    return { key: `tigris:${res.storage}:${res.key}` };
  });

/** Staff-only: open a return photo. */
export const returnPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Not allowed");
    const match = data.key.match(/^tigris:(\d+):(returns\/[^:]+)$/);
    if (!match) throw new Error("Invalid return photo");
    const target = loadTargets(process.env).find((t) => t.index === Number(match[1]));
    if (!target || !match[2]) throw new Error("Photo unavailable");
    const response = await objectRequest(target, match[2], { method: "GET" });
    if (!response.ok) throw new Error("Photo unavailable");
    setResponseHeader("Cache-Control", "private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { url: `data:${response.headers.get("content-type") ?? "image/jpeg"};base64,${btoa(binary)}` };
  });
