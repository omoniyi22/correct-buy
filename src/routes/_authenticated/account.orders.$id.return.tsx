import { useState } from "react";
import { cdnImage } from "@/lib/storage";
import { ListSkeleton, CardsSkeleton, FormSkeleton, PageSkeleton } from "@/components/Skeletons";
import { uploadReturnPhoto } from "@/lib/uploads.functions";
import { fileToBase64 } from "@/lib/file-to-base64";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { myOrderQuery } from "@/lib/account";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/account/orders/$id/return")({
  head: () => ({"meta": [{"title": "Request a return \u2014 CorrectBuy"}, {"name": "description", "content": "Request a return for your CorrectBuy order."}, {"property": "og:title", "content": "Request a return \u2014 CorrectBuy"}, {"property": "og:description", "content": "Request a return for your CorrectBuy order."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: ReturnPage,
});

const REASONS = ["Damaged or faulty", "Wrong item sent", "Doesn't fit", "Not as described", "Changed my mind"];

function ReturnPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const o = useQuery(myOrderQuery(id));
  const [items, setItems] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (o.isPending) return <FormSkeleton fields={4} />;
  const d = o.data;
  if (!d) return <p>Order not found.</p>;
  if (d.status !== "DELIVERED") return <p>Returns open once your order is delivered. <Link to="/account/orders/$id" params={{ id }} className="font-semibold text-primary">Back to order</Link></p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) return void toast.error("Choose at least one item");
    if (!reason) return void toast.error("Choose a reason");
    setBusy(true);
    let photoPath: string | null = null;
    if (photo && user) {
      if (photo.size > 5 * 1024 * 1024) {
        setBusy(false);
        return void toast.error("Photo must be under 5 MB");
      }
      try {
        photoPath = (await uploadReturnPhoto({ data: { name: photo.name, type: photo.type, data: await fileToBase64(photo) } })).key;
      } catch (err) {
        setBusy(false);
        return void toast.error(err instanceof Error ? err.message : "Photo upload failed");
      }
    }
    const { error } = await supabase.rpc("request_return", { _order: d.id, _items: items, _reason: reason, _comments: comments, _photo: photoPath as string });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Return requested — we'll be in touch within one working day.");
    qc.invalidateQueries({ queryKey: ["my-order", id] });
    navigate({ to: "/account/orders/$id", params: { id } });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <Link to="/account/orders/$id" params={{ id }} className="text-sm text-muted-foreground">← Order {d.order_number}</Link>
        <h1 className="mt-1 text-3xl font-extrabold">Request a return</h1>
      </div>
      <fieldset className="rounded-3xl border border-border p-6">
        <legend className="px-1 font-bold">Which items?</legend>
        {d.order_items.map((i) => (
          <label key={i.id} className="flex items-center gap-3 py-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={items.includes(i.id)} onChange={(e) => setItems(e.target.checked ? [...items, i.id] : items.filter((x) => x !== i.id))} />
            <img src={cdnImage(i.image_url)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            {i.product_name} · {i.variant_name} × {i.qty}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="rr-reason" className="text-sm font-semibold">Reason</label>
        <select id="rr-reason" required value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm">
          <option value="">Choose…</option>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="rr-comments" className="text-sm font-semibold">Comments (optional)</label>
        <textarea id="rr-comments" rows={3} maxLength={2000} value={comments} onChange={(e) => setComments(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
      </div>
      <div>
        <label htmlFor="rr-photo" className="text-sm font-semibold">Photo (optional)</label>
        <input id="rr-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full min-w-0 text-sm" />
      </div>
      <button disabled={busy} className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit return request</button>
    </form>
  );
}
