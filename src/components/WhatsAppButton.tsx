import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { storeConfigQuery } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Floating WhatsApp chat button, pinned bottom-right on every shopper page. */
export function WhatsAppButton() {
  const { data } = useSuspenseQuery(storeConfigQuery);
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/admin")) return null;
  const digits = (data.settings.support_phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(`Hi ${data.settings.store_name}, I need help with an order.`);
  // Product pages have a sticky add-to-cart bar on phones, so lift the button above it.
  const lifted = path.startsWith("/p/");
  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-xl ring-4 ring-background/70 transition-transform hover:scale-110 sm:right-6 sm:bottom-6",
        lifted ? "bottom-24 md:bottom-6" : "bottom-4",
      )}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 fill-current">
        <path d="M16.004 3C8.82 3 3 8.82 3 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.71A12.95 12.95 0 0 0 16.004 29C23.18 29 29 23.18 29 16S23.18 3 16.004 3Zm0 23.67c-2.04 0-4.04-.55-5.78-1.6l-.41-.25-3.97 1.02 1.06-3.86-.27-.43A10.6 10.6 0 0 1 5.33 16c0-5.88 4.79-10.67 10.67-10.67S26.67 10.12 26.67 16 21.88 26.67 16 26.67Zm5.85-7.99c-.32-.16-1.9-.94-2.19-1.04-.3-.11-.51-.16-.73.16-.21.32-.83 1.04-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.33c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.25 1.48.21 2.03.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
