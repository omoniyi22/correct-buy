import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared loading placeholders so every page and section loads the same way. */

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4", className)} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function SectionSkeleton({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <section className={cn("mx-auto max-w-6xl px-5 pt-16 sm:px-6", className)} aria-hidden="true">
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-8 w-56 sm:h-10" />
        <Skeleton className="h-4 w-16" />
      </div>
      <ProductGridSkeleton count={cards} className="mt-8" />
    </section>
  );
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 p-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-11 w-40 rounded-full" />
    </div>
  );
}

/** Full page placeholder: header bar, title and a product grid. */
export function PageSkeleton() {
  return (
    <div className="min-h-screen" role="status" aria-label="Loading page">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="hidden h-11 flex-1 rounded-full sm:block" />
          <Skeleton className="ml-auto h-9 w-20 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-md" />
        <Skeleton className="mt-8 h-56 w-full rounded-3xl" />
        <ProductGridSkeleton count={8} className="mt-10" />
      </div>
    </div>
  );
}
