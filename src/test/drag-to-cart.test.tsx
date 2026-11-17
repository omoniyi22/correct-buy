import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { cart } from "@/lib/cart";


// A stand-in for the browser's DataTransfer: jsdom does not implement it.
function makeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? "",
    get types() {
      return Array.from(store.keys());
    },
    effectAllowed: "",
    dropEffect: "",
  } as unknown as DataTransfer;
}

describe("Drag a product to the bag in the header", () => {
  beforeEach(() => {
    cart.clear();
    localStorage.clear();
  });

  it("adds the dragged product to the bag on drop", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/shop"] }),
      context: { queryClient: new QueryClient() },
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const bag = await screen.findByLabelText(/^Cart —/);
    expect(bag).toBeDefined();

    const card = document.querySelector("[draggable=\"true\"]") as HTMLElement;
    const transfer = makeDataTransfer();

    fireEvent.dragStart(card, { dataTransfer: transfer });
    fireEvent.dragOver(bag, { dataTransfer: transfer });
    fireEvent.drop(bag, { dataTransfer: transfer });

    // The shop page also has a "1" (its first page button), so look inside the bag only.
    expect(within(bag).getByText("1")).toBeDefined();
    expect(JSON.parse(localStorage.getItem("correctbuy-cart") || "[]")).toEqual([
      { id: expect.any(String), qty: 1 },
    ]);
  });

  it("ignores drops that do not carry a CorrectBuy product", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/shop"] }),
      context: { queryClient: new QueryClient() },
    });
    await router.load();
    render(<RouterProvider router={router} />);

    const bag = await screen.findByLabelText(/^Cart —/);
    fireEvent.drop(bag, { dataTransfer: makeDataTransfer() });

    expect(JSON.parse(localStorage.getItem("correctbuy-cart") || "[]")).toEqual([]);
  });
});
