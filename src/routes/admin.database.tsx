import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, btn, btnGhost } from "@/components/admin/ui";
import { FormSkeleton } from "@/components/Skeletons";

// Live schema export: the database builds the SQL itself every time, so it always matches the latest changes.
export const Route = createFileRoute("/admin/database")({
  head: () => ({ meta: [{ title: "Database — CorrectBuy" }, { name: "description", content: "Copy-ready SQL of the live CorrectBuy database." }, { property: "og:title", content: "Database — CorrectBuy" }, { property: "og:description", content: "Live database schema as SQL." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DatabasePage,
});

function DatabasePage() {
  const [copied, setCopied] = useState(false);
  const q = useQuery({
    queryKey: ["schema-sql"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("export_schema_sql" as never);
      if (error) throw error;
      // Functions are listed alphabetically and may call each other, so body checks wait until the end of the script.
      return `SET check_function_bodies = off;\n${data as unknown as string}\nSET check_function_bodies = on;\n`;
    },
    staleTime: 0,
  });
  const sql = q.data ?? "";
  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    toast.success("SQL copied — paste it into the Supabase SQL Editor");
    setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([sql], { type: "text/sql" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "correctbuy-schema.sql" });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <AdminHeader
        title="Database"
        sub="Every table, relationship, function, trigger, access rule and permission — generated fresh from the live database."
        actions={<>
          <button className={btnGhost} onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button className={btnGhost} onClick={download} disabled={!sql}><Download className="h-4 w-4" /> Download</button>
          <button className={btn} onClick={copy} disabled={!sql}><Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy SQL"}</button>
        </>}
      />
      {q.isPending ? <FormSkeleton fields={6} /> : q.isError ? (
        <p className="text-sm text-destructive">{(q.error as Error).message}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{sql.split("\n").length.toLocaleString()} lines · {(sql.match(/^CREATE TABLE/gm) ?? []).length} tables · {(sql.match(/^CREATE POLICY/gm) ?? []).length} access rules</p>
          <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed" tabIndex={0}><code>{sql}</code></pre>
        </>
      )}
    </div>
  );
}
