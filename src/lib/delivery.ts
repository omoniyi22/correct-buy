export type DeliveryState = { id: string; name: string; fee: number; active: boolean };
export type DeliveryCity = { id: string; state_id: string; name: string; fee: number | null; active: boolean };
export function visibleCities(states: DeliveryState[], cities: DeliveryCity[], stateName: string) {
  const state = states.find((s) => s.name === stateName && s.active);
  return state ? cities.filter((c) => c.state_id === state.id && c.active) : [];
}
export function deliveryFee(state: DeliveryState, city: DeliveryCity) { return city.fee ?? state.fee; }