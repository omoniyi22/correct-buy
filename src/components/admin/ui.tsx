import type { ReactNode } from "react";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const input = "min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
export const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
export const btnGhost = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50";
export const th = "p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground";
export const td = "p-3 align-middle";

export function AdminHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 grid min-w-0 gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-lg border border-border bg-card p-4 sm:p-5", className)}>{children}</div>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-border bg-card" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

export function States({ q, empty, children }: { q: { isPending: boolean; isError: boolean; data?: unknown[] | null | undefined }; empty: string; children: ReactNode }) {
  if (q.isPending) return <ListSkeleton rows={6} />;
  if (q.isError) return <p className="p-6 text-sm text-destructive">Couldn't load this. Please refresh.</p>;
  if (!q.data?.length) return <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
    </label>
  );
}

/** Download rows as CSV. */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Minimal CSV parser (quotes supported). First row = headers. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), (r[i] ?? "").trim()])));
}
