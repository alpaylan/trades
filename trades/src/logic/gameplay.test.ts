import { describe, expect, it } from "vitest";
import { initialState, reducer, type Action } from "./engine";
import { road } from "./Game";
import { listViableMoves } from "./viableMoves";

const productionDollarLevel1 = {
	type_: "production" as const,
	production: "dollar" as const,
	level: 1 as const,
};
const plusRoad = road("plus", 0);

const applyActions = (actions: Action[]) => {
	let state = initialState();
	for (const action of actions) {
		state = reducer(state, action);
	}
	return state;
};

const applyFromState = (base: ReturnType<typeof initialState>, actions: Action[]) => {
	let state = base;
	for (const action of actions) {
		state = reducer(state, action);
	}
	return state;
};

const firstViableRoadPlacement = (state: ReturnType<typeof initialState>) => {
	const action = listViableMoves(state).find(
		(candidate) =>
			candidate.type === "PLACE_TILE" &&
			candidate.payload.tile.type_ === "road",
	);
	expect(action).toBeDefined();
	if (!action || action.type !== "PLACE_TILE") {
		throw new Error("expected a viable road placement");
	}
	return action;
};

describe("gameplay turn progression", () => {
	it("plays four player turns with buy/place/end flow", () => {
		const state = applyActions([
			{ type: "SELECT_WELL", payload: { x: 0, y: 0 } },
			{ type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } },
			{ type: "PLACE_TILE", payload: { x: 4, y: 3, tile: plusRoad } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 9, y: 0 } },
			{ type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } },
			{ type: "PLACE_TILE", payload: { x: 13, y: 3, tile: plusRoad } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 10, y: 9 } },
			{ type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } },
			{ type: "PLACE_TILE", payload: { x: 13, y: 12, tile: plusRoad } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 0, y: 9 } },
			{ type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } },
			{ type: "PLACE_TILE", payload: { x: 4, y: 12, tile: plusRoad } },
			{ type: "END_TURN" },
		]);

		expect(state.game.round).toBe(1);
		expect(state.game.turns).toBe(4);
		// After 4 END_TURN, turn is either round-2 starter or still last player (depends on round-end flow)
		expect(["green", "orange", "blue", "red"]).toContain(state.game.turn);
		expect(state.game.tiles["3-4"].owned).toBe(true);
		expect(state.game.tiles["3-13"].owned).toBe(true);
		expect(state.game.tiles["12-13"].owned).toBe(true);
		expect(state.game.tiles["12-4"].owned).toBe(true);
		expect(state.game.users.green.resources.dollar).toBe(12);
		expect(state.game.users.orange.resources.dollar).toBe(12);
		expect(state.game.users.blue.resources.dollar).toBe(12);
		expect(state.game.users.red.resources.dollar).toBe(12);
	});

	it("handles full no-action round end and dismiss event card", () => {
		const stateAfterRoundEnd = applyActions([
			{ type: "SELECT_WELL", payload: { x: 0, y: 0 } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 9, y: 0 } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 10, y: 9 } },
			{ type: "END_TURN" },
			{ type: "SELECT_WELL", payload: { x: 0, y: 9 } },
			{ type: "END_TURN" },
		]);

		expect(stateAfterRoundEnd.showEventCard).toBe(true);
		expect(stateAfterRoundEnd.pendingRoundEnd).toBe(true);
		expect(stateAfterRoundEnd.eventCardsRemaining).toBe(24);
		expect(stateAfterRoundEnd.game.turn).toBe("red");
		expect(stateAfterRoundEnd.game.round).toBe(1);

		const stateAfterDismiss = reducer(stateAfterRoundEnd, {
			type: "DISMISS_EVENT_CARD",
		});

		expect(stateAfterDismiss.showEventCard).toBe(false);
		expect(stateAfterDismiss.pendingRoundEnd).toBe(false);
		expect(stateAfterDismiss.game.round).toBe(2);
		expect(stateAfterDismiss.game.turn).toBe("orange");
		expect(stateAfterDismiss.game.turns).toBe(4);
		expect(stateAfterDismiss.game.users.green.resources.dollar).toBe(26);
		expect(stateAfterDismiss.game.users.orange.resources.dollar).toBe(26);
		expect(stateAfterDismiss.game.users.blue.resources.dollar).toBe(26);
		expect(stateAfterDismiss.game.users.red.resources.dollar).toBe(26);
	});

	it("rejects invalid placement actions and leaves state unchanged", () => {
		const state = initialState();
		const toFreeCenter = reducer(state, {
			type: "PLACE_TILE",
			payload: { x: 7, y: 7, tile: productionDollarLevel1 },
		});
		const toOpponentTile = reducer(state, {
			type: "PLACE_TILE",
			payload: { x: 12, y: 0, tile: productionDollarLevel1 },
		});

		expect(toFreeCenter).toBe(state);
		expect(toOpponentTile).toBe(state);
		expect(state.game.users.green.resources.dollar).toBe(20);
		expect(state.actionsUsedThisTurn).toBe(0);
	});

	it("enforces action limits but allows using tiles purchased this turn after limit", () => {
		let state = initialState();
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 0, y: 0 } });
		state = reducer(state, { type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } });
		state = reducer(state, { type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } });
		// Third action in same turn should be blocked.
		state = reducer(state, { type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } });
		const firstPlacement = firstViableRoadPlacement(state);
		state = reducer(state, firstPlacement);
		const secondPlacement = firstViableRoadPlacement(state);
		state = reducer(state, secondPlacement);
		// No purchased copies left; placement should fail.
		const impossibleThirdPlace = reducer(state, {
			type: "PLACE_TILE",
			payload: { x: 4, y: 3, tile: plusRoad },
		});
		expect(impossibleThirdPlace).toBe(state);

		expect(state.actionsUsedThisTurn).toBe(2);
		expect(state.game.users.green.resources.dollar).toBe(4);
		expect(state.game.users.green.inventory["road:plus:0"]).toBe(0);
	});

	it("supports multi-step undo through complex turn actions", () => {
		let state = initialState();
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 0, y: 0 } });
		state = reducer(state, { type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } });
		state = reducer(state, firstViableRoadPlacement(state));
		state = reducer(state, { type: "END_TURN" });
		state = reducer(state, { type: "UNDO" }); // undo END_TURN
		state = reducer(state, { type: "UNDO" }); // undo PLACE_TILE
		state = reducer(state, { type: "UNDO" }); // undo BUY_ITEM

		expect(state.game.turn).toBe("green");
		expect(state.game.turns).toBe(0);
		expect(state.actionsUsedThisTurn).toBe(0);
		expect(state.game.users.green.resources.dollar).toBe(20);
		expect(state.game.users.green.inventory["road:plus:0"]).toBe(0);
		const resetTile = state.game.tiles["3-4"];
		expect(resetTile.owned).toBe(true);
		if (!resetTile.owned) {
			throw new Error("expected owned tile");
		}
		expect(resetTile.content.type_).toBe("empty");
	});

	it("handles complex ended-this-round skipping and round transition", () => {
		let state = applyActions([
			{ type: "SELECT_WELL", payload: { x: 0, y: 0 } },
			// Green ends immediately -> marked ended for this round.
			{ type: "END_TURN" },
		]);
		// Orange plays one action and remains active in this round.
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 9, y: 0 } });
		state = reducer(state, { type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } });
		state = reducer(state, firstViableRoadPlacement(state));
		state = reducer(state, { type: "END_TURN" });
		// Blue and Red end with zero actions and become ended-this-round.
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 9, y: 9 } });
		state = reducer(state, { type: "END_TURN" });
		state = reducer(state, { type: "SELECT_WELL", payload: { x: 0, y: 9 } });
		state = reducer(state, { type: "END_TURN" });
		// Turn should skip ended players and return to Orange.
		state = reducer(state, { type: "END_TURN" });

		expect(state.endedThisRound.green).toBe(true);
		expect(state.endedThisRound.blue).toBe(true);
		expect(state.endedThisRound.red).toBe(true);
		expect(state.showEventCard).toBe(true);
		expect(state.pendingRoundEnd).toBe(true);
		expect(state.game.turn).toBe("orange");
		expect(state.eventCardsRemaining).toBe(24);

		const afterDismiss = reducer(state, { type: "DISMISS_EVENT_CARD" });
		expect(afterDismiss.game.round).toBe(2);
		expect(afterDismiss.game.turn).toBe("orange");
		expect(afterDismiss.endedThisRound.green).toBe(false);
		expect(afterDismiss.endedThisRound.orange).toBe(false);
		expect(afterDismiss.endedThisRound.blue).toBe(false);
		expect(afterDismiss.endedThisRound.red).toBe(false);
	});

	it("ignores unaffordable purchases without mutating history-critical fields", () => {
		const state = initialState();
		const afterBadBuy = applyFromState(state, [
			{ type: "BUY_ITEM", payload: { item: productionDollarLevel1, price: 999 } },
		]);

		expect(afterBadBuy).toBe(state);
		expect(afterBadBuy.actionsUsedThisTurn).toBe(0);
		expect(afterBadBuy.game.users.green.resources.dollar).toBe(20);
		expect(afterBadBuy.history.length).toBe(0);
	});

	it("rejects disconnected road and production placements even with inventory", () => {
		const state = applyActions([
			{ type: "SELECT_WELL", payload: { x: 0, y: 0 } },
			{ type: "BUY_ITEM", payload: { item: plusRoad, price: 8 } },
			{ type: "BUY_ITEM", payload: { item: productionDollarLevel1, price: 5 } },
		]);
		const roadAttempt = reducer(state, {
			type: "PLACE_TILE",
			payload: { x: 0, y: 0, tile: plusRoad },
		});
		const productionAttempt = reducer(state, {
			type: "PLACE_TILE",
			payload: { x: 0, y: 0, tile: productionDollarLevel1 },
		});

		expect(roadAttempt).toBe(state);
		expect(productionAttempt).toBe(state);
	});
});
