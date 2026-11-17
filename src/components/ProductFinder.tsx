import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Search, UserRound, X } from "lucide-react";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/search";
import { beginProductDrag, carriesProduct, droppedProductId, endProductDrag, onProductDrag } from "@/lib/drag";
import { getProduct, products } from "@/lib/products";
import { requestSourcing } from "@/lib/sourcing";
import { cn } from "@/lib/utils";

export function ProductFinder() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const [unmatched, setUnmatched] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"request" | "email", string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => onProductDrag((id) => setDragging(id !== null)), []);

  const query = value.trim();
  const preview = useMemo(() => (query ? searchProducts(query, "All", 3) : []), [query]);

  const runSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    if (searchProducts(q).length > 0) {
      navigate({ to: "/search", search: { q } });
      return;
    }
    setUnmatched(q);
    setRequest(q);
    setStatus("idle");
    setFailure(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setHover(false);
    const id = droppedProductId(e);
    const p = id ? getProduct(id) : undefined;
    if (!p) return;
    setValue(p.name);
    runSearch(p.name);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setFailure(null);
    const r = await requestSourcing({ request, email });
    if (r.ok) return setStatus("sent");
    setStatus("idle");
    setErrors(r.fieldErrors ?? {});
    setFailure(r.message ?? null);
  };

  const reset = () => {
    setUnmatched(null);
    setStatus("idle");
    setRequest("");
    setEmail("");
    setValue("");
    setErrors({});
  };

  return (
    <section id="finder" className="mx-auto max-w-6xl px-5 pt-16 sm:px-6 md:pt-24">
      <div className="rounded-[2rem] bg-accent px-5 py-12 text-center text-accent-foreground sm:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Find what's yours</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Tell us what you want. We'll get it.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm opacity-75 sm:text-base">
          Search our shelf — and if it isn't there, a real person goes looking for you.
        </p>

        {/* Search / drop zone */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
          onDragOver={(e) => {
            if (!carriesProduct(e)) return;
            e.preventDefault();
            setHover(true);
          }}
          onDragLeave={() => setHover(false)}
          onDrop={onDrop}
          className={cn(
            "relative mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-full border-2 bg-background p-1.5 pl-5 text-foreground shadow-sm transition-all",
            hover ? "scale-[1.02] border-dashed border-primary ring-4 ring-primary/25" : dragging ? "border-dashed border-primary/70" : "border-transparent",
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            aria-label="What are you looking for?"
            placeholder={dragging ? "Drop the product here…" : "What are you looking for?"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
          />
          {value && (
            <button type="button" aria-label="Clear search" onClick={() => setValue("")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:px-6">
            <span className="hidden sm:inline">Find it</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Live preview */}
        {query && !unmatched && (
          <p className="mt-3 text-sm opacity-75">
            {preview.length > 0 ? `${preview.map((p) => p.name).join(", ")} on the shelf` : "Not on our shelf yet — press Find it and we'll hunt it down."}
          </p>
        )}

        {/* Popular */}
        {!unmatched && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map((t) => (
              <button key={t} type="button" onClick={() => runSearch(t)} className="rounded-full border border-foreground/15 bg-background/60 px-4 py-1.5 text-sm font-medium hover:border-primary">
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Draggable shelf */}
        {!unmatched && (
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              <span className="can-drag">Or drag one into the box</span>
              <span className="no-drag">Or tap one to see similar</span>
            </p>
            <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={(e) => beginProductDrag(e, p.id)}
                  onDragEnd={() => endProductDrag()}
                  onClick={() => runSearch(p.name)}
                  className="group cursor-grab overflow-hidden rounded-2xl bg-background text-left text-foreground transition-transform hover:-translate-y-1 active:cursor-grabbing"
                >
                  <img src={p.image} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" draggable={false} />
                  <span className="block truncate px-3 py-2 text-xs font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Human fallback */}
        {unmatched && (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-background p-6 text-left text-foreground sm:p-8">
            {status === "sent" ? (
              <div>
                <CheckCircle2 className="h-9 w-9 text-primary" />
                <h3 className="mt-3 text-2xl font-extrabold">On it.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Someone from our team is looking now. We'll email <span className="font-semibold text-foreground">{email}</span> when we find it.
                </p>
                <button type="button" onClick={reset} className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">
                  Search something else
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold">We don't have “{unmatched}” — yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Leave your email and a person on our team will find it for you.</p>
                  </div>
                </div>
                <label htmlFor="finder-request" className="mt-5 block text-sm font-semibold">What you're after</label>
                <textarea id="finder-request" rows={3} value={request} onChange={(e) => setRequest(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-muted/40 p-3 text-sm outline-none focus:border-primary/60" />
                {errors.request && <p className="mt-1 text-xs text-primary">{errors.request}</p>}
                <label htmlFor="finder-email" className="mt-4 block text-sm font-semibold">Where to reach you</label>
                <input id="finder-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mt-2 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:border-primary/60" />
                {errors.email && <p className="mt-1 text-xs text-primary">{errors.email}</p>}
                {failure && <p className="mt-3 text-sm text-primary">{failure}</p>}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={reset} className="rounded-full px-5 py-3 text-sm font-semibold hover:bg-muted">Back to search</button>
                  <button type="submit" disabled={status === "sending"} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {status === "sending" ? "Sending…" : "Ask a person to find it"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
