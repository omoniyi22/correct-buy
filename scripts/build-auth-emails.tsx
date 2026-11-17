// Renders the Supabase Auth email templates to supabase/email-templates/*.html
// Run: bun scripts/build-auth-emails.tsx
import { mkdir, writeFile } from "node:fs/promises";
import { AUTH_EMAILS, renderAuthEmail, type AuthEmailKey } from "../src/lib/auth-email-templates";

await mkdir("supabase/email-templates", { recursive: true });
const keys: AuthEmailKey[] = [...(Object.keys(AUTH_EMAILS) as AuthEmailKey[]), "reauthentication"];
for (const k of keys) {
  await writeFile(`supabase/email-templates/${k}.html`, await renderAuthEmail(k));
  console.log("wrote", k);
}
