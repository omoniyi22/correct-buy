import { expect, it } from "vitest";
import { isAllowedAdminEmail } from "@/lib/admin-owner";
it("permits only the owner's specified administrator email", () => {
  expect(isAllowedAdminEmail("omoniyioluwaseun22@gmail.com")).toBe(true);
  expect(isAllowedAdminEmail("omoniyioluwaseun318@gmail.com")).toBe(false);
  expect(isAllowedAdminEmail("someone@example.com")).toBe(false);
});