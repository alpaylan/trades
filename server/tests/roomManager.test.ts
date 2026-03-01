import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "../src/roomManager";
import type { Action } from "../../trades/src/logic/engine";

test("create/join/start room lifecycle", () => {
	const manager = new RoomManager();
	const host = manager.createRoom("Host");
	assert.equal(host.room.players.length, 1);
	assert.equal(host.room.players[0].isHost, true);

	const join = manager.joinRoom(host.room.code, "Guest");
	assert.equal(join.ok, true);
	if (!join.ok) {
		return;
	}
	assert.equal(join.value.room.players.length, 2);
	assert.equal(join.value.room.players[1].isHost, false);

	const start = manager.startGame(host.actorId);
	assert.equal(start.ok, true);
	if (!start.ok) {
		return;
	}
	assert.equal(start.value.started, true);
});

test("submit action validates versions and turns", () => {
	const manager = new RoomManager();
	const host = manager.createRoom("Host");
	const guest = manager.joinRoom(host.room.code, "Guest");
	assert.equal(guest.ok, true);
	if (!guest.ok) {
		return;
	}
	assert.equal(manager.startGame(host.actorId).ok, true);

	const endTurn: Action = { type: "END_TURN" };
	const okAction = manager.submitAction(host.actorId, 0, endTurn);
	assert.equal(okAction.ok, true);
	if (!okAction.ok) {
		return;
	}
	assert.equal(okAction.value.version, 1);

	const staleVersion = manager.submitAction(guest.value.actorId, 0, endTurn);
	assert.equal(staleVersion.ok, false);
	if (staleVersion.ok) {
		return;
	}
	assert.match(staleVersion.reason, /Version mismatch/);
});

test("reject non-authoritative actions", () => {
	const manager = new RoomManager();
	const host = manager.createRoom("Host");
	assert.equal(manager.joinRoom(host.room.code, "Guest").ok, true);
	assert.equal(manager.startGame(host.actorId).ok, true);

	const invalid: Action = { type: "SELECT_TILE", payload: { type_: "action", action: "turn" } };
	const result = manager.submitAction(host.actorId, 0, invalid);
	assert.equal(result.ok, false);
	if (result.ok) {
		return;
	}
	assert.match(result.reason, /not allowed/);
});
