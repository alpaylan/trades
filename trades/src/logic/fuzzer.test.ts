import { describe, expect, it } from "vitest";
import {
	initialState,
	reducer,
	type State,
} from "./engine";
import { listViableMoves } from "./viableMoves";

const OWNERS = ["green", "orange", "blue", "red"] as const;

function rng(seed: number) {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 0x100000000;
	};
}

function pick<T>(items: T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

function assertInvariants(state: State) {
	expect(OWNERS).toContain(state.game.turn);
	expect(state.game.round).toBeGreaterThanOrEqual(1);
	expect(state.game.turns).toBeGreaterThanOrEqual(0);
	expect(state.actionsUsedThisTurn).toBeGreaterThanOrEqual(0);
	expect(state.actionsUsedThisTurn).toBeLessThanOrEqual(2);
	expect(state.history.length).toBeLessThanOrEqual(20);
	expect(state.eventCardsRemaining).toBeGreaterThanOrEqual(0);

	for (const owner of OWNERS) {
		const user = state.game.users[owner];
		expect(user.resources.dollar).toBeGreaterThanOrEqual(0);
		expect(user.resources.wood).toBeGreaterThanOrEqual(0);
		expect(user.resources.steel).toBeGreaterThanOrEqual(0);
		expect(user.resources.stone).toBeGreaterThanOrEqual(0);
		expect(user.resources.coal).toBeGreaterThanOrEqual(0);
		for (const [invKey, count] of Object.entries(user.inventory)) {
			expect(Number.isInteger(count), `non-integer inventory ${owner}:${invKey}`).toBe(
				true,
			);
			expect(count, `negative inventory ${owner}:${invKey}`).toBeGreaterThanOrEqual(0);
		}
	}
}

describe("reducer fuzzer", () => {
	it(
		"survives long random viable-move sequences without invariant violations",
		() => {
		const seeds = [3, 11, 29, 47, 91, 1337];

		for (const seed of seeds) {
			const random = rng(seed);
			let state = initialState();
			for (let step = 0; step < 200; step += 1) {
				const viable = listViableMoves(state);
				expect(viable.length, `no viable moves at step ${step}, seed ${seed}`).toBeGreaterThan(0);
				const action = pick(viable, random);
				const next = reducer(state, action);
				expect(next, `viable action should mutate state at step ${step}, seed ${seed}`).not.toBe(state);
				state = next;
				assertInvariants(state);
			}
		}
		},
		20_000,
	);
});
