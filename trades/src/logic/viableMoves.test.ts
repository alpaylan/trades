import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./engine";
import { listViableMoves } from "./viableMoves";

describe("viable move listing", () => {
	it("returns at least one viable move at game start", () => {
		const state = initialState();
		const viable = listViableMoves(state);
		expect(viable.length).toBeGreaterThan(0);
		// Round 1: SELECT_WELL is required before END_TURN
		expect(
			viable.some((move) => move.type === "END_TURN" || move.type === "SELECT_WELL"),
		).toBe(true);
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
		let state = initialState();
		// Round 1: each player must select well before END_TURN; then all 4 END_TURN to trigger round end
		for (const [x, y] of [[0, 0], [9, 0], [10, 9], [0, 9]]) {
			state = reducer(state, { type: "SELECT_WELL", payload: { x, y } });
			state = reducer(state, { type: "END_TURN" });
		}
		expect(state.showEventCard, "round end should show event card").toBe(true);
		const viable = listViableMoves(state);
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
