import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./engine";
import { listViableMoves } from "./viableMoves";

describe("viable move listing", () => {
	it("returns at least one viable move at game start", () => {
		const state = initialState();
		const viable = listViableMoves(state);
		expect(viable.length).toBeGreaterThan(0);
		expect(viable.some((move) => move.type === "END_TURN")).toBe(true);
	});

	it("all listed moves mutate state", () => {
		let state = initialState();
		for (let i = 0; i < 20; i += 1) {
			const viable = listViableMoves(state);
			expect(viable.length).toBeGreaterThan(0);
			for (const move of viable) {
				const next = reducer(state, move);
				expect(next).not.toBe(state);
			}
			state = reducer(state, viable[0]);
		}
	});

	it("includes dismiss when event card overlay is open", () => {
		const before = initialState();
		const stateWithOverlay = reducer(
			reducer(reducer(reducer(before, { type: "END_TURN" }), { type: "END_TURN" }), {
				type: "END_TURN",
			}),
			{ type: "END_TURN" },
		);
		expect(stateWithOverlay.showEventCard).toBe(true);
		const viable = listViableMoves(stateWithOverlay);
		expect(viable.some((move) => move.type === "DISMISS_EVENT_CARD")).toBe(true);
	});

	it("does not generate unimplemented steel/coal production buys", () => {
		const state = initialState();
		const viable = listViableMoves(state);
		const hasUnimplementedBuy = viable.some(
			(move) =>
				move.type === "BUY_ITEM" &&
				move.payload.item.type_ === "production" &&
				(move.payload.item.production === "steel" ||
					move.payload.item.production === "coal"),
		);
		expect(hasUnimplementedBuy).toBe(false);
	});
});
