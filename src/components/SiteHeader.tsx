import media from "@/lib/media";
import { useEffect, useState, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, RotateCcw, ShieldCheck, ShoppingBag, ShoppingCart, PackagePlus, Truck, Bus, User, X, Lock, CreditCard, ChevronDown, CircleHelp, Package, MessageCircle, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { useCart, cart } from "@/lib/cart";
import { onProductDrag, carriesProduct, droppedProductId, endProductDrag } from "@/lib/drag";
import { getProduct, getVariant, categories } from "@/lib/products";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { NewsletterForm } from "@/components/NewsletterForm";
import { cn } from "@/lib/utils";
import { SearchBox } from "@/components/SearchBox";
import { Button } from "@/components/ui/button";
import { getCollection } from "@/lib/collections";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const logo = media["correctbuy-logo-full.png"];
const logoIcon = media["correctbuy-logo-icon.png"];

export function SiteHeader() {
  const count = useCart().reduce((s, l) => s + l.qty, 0);
  const [dragActive, setDragActive] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const [popped, setPopped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, isStaff } = useAuth();
  const arrivals = getCollection("new-arrivals");

  useEffect(() => onProductDrag((id) => setDragActive(id !== null)), []);


  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const id = droppedProductId(e);
    endProductDrag();
    if (!id) return;
    cart.add(id);
    const product = getProduct(id) ?? getVariant(id)?.product;
    if (product) toast.success(`${product.name} added to your cart`);
    setPopped(true);
  };

  const onDragOver = (e: DragEvent) => {
    if (!carriesProduct(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropHover(true);
  };

  const onDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropHover(false);
  };

  const closeMenu = () => setMenuOpen(false);
  const linkCls = "shrink-0 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary";

  return (
    <header className="sticky top-0 z-20 lg:animate-nav-drop">
      <div className="border-b border-border bg-muted text-foreground">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-1.5 sm:flex sm:justify-between sm:gap-4 sm:px-6">
          <Link to={arrivals ? "/collections/$slug" : "/search"} params={{ slug: "new-arrivals" }} search={arrivals ? {} : { sort: "newest" }} className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <PackagePlus className="h-3.5 w-3.5 shrink-0 text-accent-foreground" /><span className="truncate">Discover new arrivals</span>
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Bus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent-foreground sm:hidden" /><Truck aria-hidden="true" className="hidden h-3.5 w-3.5 shrink-0 text-accent-foreground sm:block" /> Nationwide delivery</span>
          <Link to="/track" className="hidden items-center gap-1.5 text-xs font-semibold text-accent-foreground sm:inline-flex"><Package className="h-3.5 w-3.5" /> Track your order</Link>
        </div>
      </div>
      <div className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-6 lg:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="store-menu" onClick={() => setMenuOpen((o) => !o)} className="h-10 w-9 shrink-0 lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/" className="min-w-0" onClick={closeMenu}>
              <img src={logo} alt="CorrectBuy" width={1298} height={299} className="h-auto w-36 sm:w-44 lg:w-48" />
            </Link>
          </div>
          <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
            <SearchBox prominent onDone={closeMenu} />
          </div>
          <nav aria-label="Account and cart" className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 lg:col-start-3 lg:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label="Account menu" className="h-11 px-2 font-semibold sm:px-3">
                  <User className="h-5 w-5" /><span className="hidden md:inline">Account</span><ChevronDown className="hidden h-4 w-4 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                {!user && <><DropdownMenuItem asChild><Button className="my-1 w-full" onClick={() => setAuthOpen(true)}>Sign in</Button></DropdownMenuItem><DropdownMenuSeparator /></>}
                <DropdownMenuItem asChild><Link to={isStaff ? "/admin" : "/account"}><User />{isStaff ? "Admin dashboard" : "My account"}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/track"><Package />Track an order</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="ghost" className={cn("relative h-auto shrink-0 gap-1.5 rounded-full bg-transparent px-3 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground sm:gap-2", dragActive && "scale-110 outline outline-2 outline-dashed outline-primary/50", dropHover && "scale-125 bg-primary/15 outline-solid outline-primary", popped && "animate-cart-pop")}>
              <Link to="/cart" aria-label="Cart — drop a product here to add it" onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} onClick={closeMenu} onAnimationEnd={() => setPopped(false)}>
                <ShoppingBag className="h-4 w-4 lg:hidden" />
                <ShoppingCart className="hidden h-4 w-4 lg:block" />
                <span className="hidden sm:inline">Cart</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
                {dragActive && <span className="can-drag pointer-events-none absolute right-0 top-full mt-3 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-cart">Drop it here to add</span>}
              </Link>
            </Button>
          </nav>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        <div className="hidden border-t border-border bg-card lg:block">
          <nav aria-label="Shop navigation" className="mx-auto flex max-w-6xl items-center gap-6 px-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-11 gap-2 px-0 font-semibold text-accent-foreground"><LayoutGrid className="h-4 w-4" />All categories<ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 p-2">
                <DropdownMenuItem asChild><Link to="/categories">Browse all categories<ArrowRight /></Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((c) => <DropdownMenuItem key={c.slug} asChild className="font-semibold"><Link to="/c/$slug" params={{ slug: c.slug }}>{c.name}</Link></DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/search" className={linkCls} activeProps={{ className: "text-primary" }}>All products</Link>
            <Link to="/collections/$slug" params={{ slug: "new-arrivals" }} className={linkCls}>New arrivals</Link>
            <Link to="/collections" className={linkCls} activeProps={{ className: "text-primary" }}>Collections</Link>
            <Link to="/contact" className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground"><MessageCircle className="h-4 w-4" />Need help?</Link>
          </nav>
        </div>
        {menuOpen && (
          <nav id="store-menu" aria-label="Mobile shopping menu" className="max-h-[65dvh] overflow-y-auto border-t border-border bg-card px-4 py-3 lg:hidden">
            <Link to="/categories" onClick={closeMenu} className="flex items-center gap-3 rounded-md px-3 py-3 font-semibold hover:bg-muted"><LayoutGrid className="h-4 w-4" />All categories</Link>
            <div className="grid grid-cols-2 gap-1 border-b border-border pb-3">
              {categories.map((c) => <Link key={c.slug} to="/c/$slug" params={{ slug: c.slug }} onClick={closeMenu} className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:text-primary">{c.name}</Link>)}
            </div>
            <Link to="/search" onClick={closeMenu} className="flex items-center gap-3 rounded-md px-3 py-3 font-semibold hover:bg-muted">All products</Link>
            <Link to="/collections" onClick={closeMenu} className="block px-3 py-3 font-semibold">Collections</Link>
            <Link to="/collections/$slug" params={{ slug: "new-arrivals" }} onClick={closeMenu} className="block px-3 py-3 font-semibold">New arrivals</Link>
            <Link to="/track" onClick={closeMenu} className="flex items-center gap-3 px-3 py-3 font-semibold"><Package className="h-4 w-4" />Track your order</Link>
            <Link to="/faq" onClick={closeMenu} className="flex items-center gap-3 px-3 py-3 font-semibold"><CircleHelp className="h-4 w-4" />Help centre</Link>
            <Link to="/contact" onClick={closeMenu} className="flex items-center gap-3 px-3 py-3 font-semibold"><MessageCircle className="h-4 w-4" />Contact us</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const col = "space-y-2 text-sm";
  const a = "block opacity-70 hover:opacity-100";
  return (
    <footer className="mt-24 bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="inline-flex items-center gap-2 font-display text-2xl font-extrabold"><img src={logoIcon} alt="" width={348} height={299} loading="lazy" className="h-9 w-auto" />Correct<span className="text-primary">Buy</span></p>
          <p className="mt-3 max-w-sm text-sm opacity-70">Buy right, the first time. Hand-picked gear, honestly reviewed.</p>
          <div className="mt-6 max-w-sm">
            <p className="text-sm font-semibold">Get new drops first</p>
            <NewsletterForm />
          </div>
        </div>
        <div className={col}>
          <p className="font-semibold">Shop</p>
          <Link to="/search" className={a}>All products</Link>
          <Link to="/categories" className={a}>Categories</Link>
          <Link to="/collections" className={a}>Collections</Link>
          {categories.map((c) => (
            <Link key={c.slug} to="/c/$slug" params={{ slug: c.slug }} className={a}>{c.name}</Link>
          ))}
        </div>
        <div className={col}>
          <p className="font-semibold">Help</p>
          <Link to="/track" className={a}>Track your order</Link>
          <Link to="/shipping-policy" className={a}>Delivery</Link>
          <Link to="/returns-policy" className={a}>Returns</Link>
          <Link to="/faq" className={a}>FAQ</Link>
          <Link to="/contact" className={a}>Contact us</Link>
        </div>
        <div className={col}>
          <p className="font-semibold">Company</p>
          <Link to="/about" className={a}>About</Link>
          <Link to="/blog" className={a}>Blog</Link>
          <Link to="/privacy" className={a}>Privacy</Link>
          <Link to="/terms" className={a}>Terms</Link>
          <Link to="/account" className={a}>Your account</Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 pb-8 text-xs opacity-70">
        <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Secure checkout</span>
        <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Cards, bank transfer & USSD</span>
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> 2-year warranty</span>
        <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Nationwide delivery</span>
      </div>
      <p className="border-t border-secondary-foreground/10 py-6 text-center text-xs opacity-60">© 2026 CorrectBuy</p>
    </footer>
  );
}
