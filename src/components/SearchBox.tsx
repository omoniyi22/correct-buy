import { formatMoney } from "@/lib/money";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, Search, X } from "lucide-react";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/search";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SearchBox({ autoFocus = false, onDone, prominent = false }: { autoFocus?: boolean; onDone?: () => void; prominent?: boolean }) {
  const navigate = useNavigate();
  const urlQuery = useSearch({ strict: false }).q;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Keep the box in step with the address bar (back button, shared link, shop filters).
  useEffect(() => {
    if (typeof urlQuery === "string") setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  // Press "/" anywhere to jump into search (only the copy the user can actually see).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      if (!input.current || input.current.offsetParent === null) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      input.current?.focus();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const query = value.trim();
  const results = useMemo(() => searchProducts(query, "All", 5), [query]);

  const runSearch = (term: string) => {
    setOpen(false);
    setActive(-1);
    onDone?.();
    navigate({ to: "/search", search: { q: term.trim() } });
  };

  const openProduct = (id: string) => {
    setOpen(false);
    setActive(-1);
    onDone?.();
    navigate({ to: "/p/$slug", params: { slug: id } });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      input.current?.blur();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      setOpen(true);
      const n = results.length;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) openProduct(results[active].id);
      else runSearch(query);
    }
  };

  return (
    <div ref={wrap} className="relative w-full">
      <form
        role="search"
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          aria-label="Search products"
          placeholder={prominent ? "Search products, brands and categories" : "Search products…"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-11 w-full rounded-full border border-border bg-muted/50 py-2.5 pl-10 text-sm outline-none transition-all placeholder:text-muted-foreground hover:bg-muted/70 focus:border-primary/50 focus:bg-background focus:shadow-sm focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden",
            prominent ? "pr-20 lg:rounded-md lg:bg-background lg:pr-8 lg:hover:bg-background" : "pr-9",
          )}
        />
        {value && (
          <Button variant="ghost" size="icon"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              setActive(-1);
              input.current?.focus();
            }}
            className={cn("absolute top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground", prominent ? "right-11 lg:right-2" : "right-2")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {prominent && (
          <Button type="submit" size="icon" aria-label="Search" className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full shadow-sm lg:hidden">
            <Search className="h-4 w-4" />
          </Button>
        )}
        </div>
        {prominent && <Button type="submit" className="hidden h-11 shrink-0 px-5 font-bold uppercase lg:inline-flex">Search</Button>}
      </form>

      {open && (
        <div
          id="search-suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl md:right-auto md:w-[min(26rem,88vw)]"
        >
          {!query && (
            <div className="p-3">
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Popular searches
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                    <Button variant="outline"
                    key={term}
                    type="button"
                    onClick={() => runSearch(term)}
                    className="rounded-full border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {query && results.length > 0 && (
            <ul role="listbox" aria-label="Product suggestions" className="p-1.5">
              {results.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <Button variant="ghost"
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => openProduct(p.id)}
                    className={cn(
                      "flex h-auto w-full items-center justify-start gap-3 rounded-lg p-2 text-left whitespace-normal transition-colors",
                      i === active ? "bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <img
                      src={p.image}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{p.category}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold">{formatMoney(p.price)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {query && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing matches <span className="font-semibold text-foreground">“{query}”</span>.
            </p>
          )}

          {query && (
            <Link
              to="/search"
              search={{ q: query }}
              onClick={() => {
                setOpen(false);
                onDone?.();
              }}
              className="flex items-center justify-between gap-2 border-t border-border bg-secondary/60 px-4 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary"
            >
              See all results for “{query}”
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
