import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./engine";

describe("engine reducer", () => {
	it("advances turn on END_TURN", () => {
		let state = initialState();
		// Round 1: must select well before END_TURN
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 0, y: 0 } });
		state = reducer(state, { type: "END_TURN" });
		expect(state.game.turn).toBe("orange");
		expect(state.game.turns).toBe(1);
	});

	it("rejects BUY_ITEM when player cannot afford", () => {
		const state = initialState();
		const next = reducer(state, {
			type: "BUY_ITEM",
			payload: {
				item: { type_: "production", production: "dollar", level: 3 },
				price: 99,
			},
		});
		expect(next).toBe(state);
	});
});
