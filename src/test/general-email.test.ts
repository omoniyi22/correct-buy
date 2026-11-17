import { describe, expect, it } from "vitest";
import { composeGeneralEmail, GENERAL_EMAIL_EVENTS } from "@/lib/general-email-templates";

describe("general emails", () => {
  it("renders html and text for every event", async () => {
    expect(GENERAL_EMAIL_EVENTS).toHaveLength(4);
    for (const event of GENERAL_EMAIL_EVENTS) {
      const r = await composeGeneralEmail(event, { name: "Ada", email: "ada@example.com", message: "Hello there" }, "https://example.test");
      expect(r?.html.length).toBeGreaterThan(500);
      expect(r?.text.length).toBeGreaterThan(50);
    }
  });
  it("ignores unknown events and tolerates a missing payload", async () => {
    expect(await composeGeneralEmail("nope", {}, "https://example.test")).toBeNull();
    expect((await composeGeneralEmail("welcome", null, "https://example.test"))?.subject).toBe("Welcome to CorrectBuy");
  });
  it("escapes visitor-supplied content in the staff alert", async () => {
    const r = await composeGeneralEmail("admin_contact_message", { name: "<b>x</b>", email: "a@b.co", message: "<script>alert(1)</script>" }, "https://example.test");
    expect(r?.html).not.toContain("<script>alert(1)</script>");
    expect(r?.html).not.toContain("<b>x</b>");
  });
});
