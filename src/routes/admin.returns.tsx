import { returnPhotoUrl } from "@/lib/uploads.functions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/money";
import { AdminHeader, btn, btnGhost, Card, States } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/returns")({
  head: () => ({"meta": [{"title": "Manage returns \u2014 CorrectBuy"}, {"name": "description", "content": "Review CorrectBuy return and refund requests."}, {"property": "og:title", "content": "Manage returns \u2014 CorrectBuy"}, {"property": "og:description", "content": "Review CorrectBuy return and refund requests."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: Returns,
});

function Returns() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("return_requests").select("*, orders(id, order_number, email, total, order_items(id, product_name, variant_name, qty, unit_price))").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const act = async (id: string, action: "approve" | "reject" | "receive" | "refund", restock = true) => {
    if (action === "refund" && !confirm("Mark as refunded? Send the money back through your payment provider dashboard first.")) return;
    const { error } = await supabase.rpc("process_return", { _return: id, _action: action, _restock: restock });
    if (error) return void toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-returns"] });
  };

  const photoUrl = async (path: string) => {
    try {
      const { url } = await returnPhotoUrl({ data: { key: path } });
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open photo");
    }
  };

  return (
    <div>
      <AdminHeader title="Returns & refunds" sub="Approve → receive item → refund (restock is optional)" />
      <States q={list} empty="No return requests.">
        <div className="space-y-4">
          {list.data?.map((r) => {
            const o = r.orders as { id: string; order_number: string; email: string; order_items: { id: string; product_name: string; variant_name: string; qty: number; unit_price: number }[] };
            const items = o.order_items.filter((i) => r.item_ids.includes(i.id));
            const value = items.reduce((n, i) => n + i.unit_price * i.qty, 0);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold"><Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary">{o.order_number}</Link> · {o.email}</p>
                    <p className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString("en-NG")} · <span className="font-semibold text-foreground">{r.status}</span></p>
                  </div>
                  <p className="font-display text-lg font-bold">{formatMoney(value)}</p>
                </div>
                <ul className="mt-3 text-sm">{items.map((i) => <li key={i.id}>{i.qty} × {i.product_name} ({i.variant_name})</li>)}</ul>
                <p className="mt-2 text-sm"><span className="font-semibold">Reason:</span> {r.reason}{r.comments && <> — “{r.comments}”</>}</p>
                {r.photo_url && <button className="mt-1 text-sm font-semibold text-primary" onClick={() => photoUrl(r.photo_url!)}>View photo</button>}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {r.status === "REQUESTED" && <><button className={btn} onClick={() => act(r.id, "approve")}>Approve</button><button className={`${btnGhost} text-destructive`} onClick={() => act(r.id, "reject")}>Reject</button></>}
                  {r.status === "APPROVED" && <><button className={btn} onClick={() => act(r.id, "receive", true)}>Item received (restock)</button><button className={btnGhost} onClick={() => act(r.id, "receive", false)}>Received (don't restock)</button><button className={`${btnGhost} text-destructive`} onClick={() => act(r.id, "reject")}>Reject</button></>}
                  {(r.status === "APPROVED" || r.status === "RECEIVED") && <button className={btn} onClick={() => act(r.id, "refund", r.restock)}>Mark refunded{r.restock ? " & restock" : ""}</button>}
                </div>
              </Card>
            );
          })}
        </div>
      </States>
    </div>
  );
}
