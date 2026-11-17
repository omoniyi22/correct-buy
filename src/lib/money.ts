/** Format integer minor units (kobo) as Naira. */
export function formatMoney(minor: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

/** Parse a "₦12,500.50"-ish user input into minor units. */
export function toMinor(major: string | number) {
  const n = typeof major === "number" ? major : Number(String(major).replace(/[^0-9.]/g, ""));
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}
