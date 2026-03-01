import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./engine";

describe("engine reducer", () => {
	it("advances turn on END_TURN", () => {
		const state = initialState();
		const next = reducer(state, { type: "END_TURN" });
		expect(next.game.turn).toBe("orange");
		expect(next.game.turns).toBe(1);
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
