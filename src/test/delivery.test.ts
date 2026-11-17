import { describe, expect, it } from "vitest";
import { deliveryFee, visibleCities } from "@/lib/delivery";
const state = { id: "lagos", name: "Lagos", fee: 250000, active: true };
const city = { id: "ikeja", state_id: "lagos", name: "Ikeja", fee: null, active: true };
describe("delivery location rules", () => {
  it("hides all cities when their state is inactive", () => { expect(visibleCities([{ ...state, active: false }], [city], "Lagos")).toEqual([]); });
  it("hides an independently inactive city", () => { expect(visibleCities([state], [{ ...city, active: false }], "Lagos")).toEqual([]); });
  it("preserves city activity when a state is reactivated", () => { const cities = [city, { ...city, id: "hidden", active: false }]; expect(visibleCities([{ ...state, active: false }], cities, "Lagos")).toHaveLength(0); expect(visibleCities([state], cities, "Lagos")).toEqual([city]); });
  it("uses the custom city amount", () => { expect(deliveryFee(state, { ...city, fee: 175000 })).toBe(175000); });
  it("inherits the state amount when the city amount is unset", () => { expect(deliveryFee(state, city)).toBe(250000); expect(deliveryFee({ ...state, fee: 350000 }, city)).toBe(350000); });
  it("keeps a zero city amount instead of inheriting", () => { expect(deliveryFee(state, { ...city, fee: 0 })).toBe(0); });
  it("only lists cities belonging to the selected state", () => { expect(visibleCities([state], [{ ...city, state_id: "oyo" }], "Lagos")).toEqual([]); });
});