import { randomUUID } from "node:crypto";
import {
	AUTHORITATIVE_ACTION_TYPES,
	type Action,
	initialState,
	reducer,
	type State,
} from "../../trades/src/logic/engine";
import type { ActorId, RoomPlayer, RoomSnapshot } from "../../trades/src/multiplayer/protocol";
import type { TileOwner } from "../../trades/src/logic/Game";

const SEAT_ORDER: TileOwner[] = ["green", "orange", "blue", "red"];

type Room = {
	code: string;
	version: number;
	started: boolean;
	state: State;
	players: RoomPlayer[];
};

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

const newRoomCode = () =>
	Math.random().toString(36).replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);

const toSnapshot = (room: Room): RoomSnapshot => ({
	code: room.code,
	players: room.players,
	started: room.started,
});

export class RoomManager {
	private roomsByCode = new Map<string, Room>();
	private roomByActor = new Map<ActorId, string>();

	createRoom(name: string): { actorId: ActorId; room: RoomSnapshot; state: State; version: number } {
		const code = newRoomCode();
		const actorId = randomUUID();
		const room: Room = {
			code,
			version: 0,
			started: false,
			state: initialState(),
			players: [
				{
					actorId,
					name: name.trim() || "Host",
					color: SEAT_ORDER[0],
					isHost: true,
					connected: true,
				},
			],
		};
		this.roomsByCode.set(code, room);
		this.roomByActor.set(actorId, code);
		return { actorId, room: toSnapshot(room), state: room.state, version: room.version };
	}

	joinRoom(code: string, name: string): Result<{ actorId: ActorId; room: RoomSnapshot; state: State; version: number }> {
		const room = this.roomsByCode.get(code.toUpperCase());
		if (!room) {
			return { ok: false, reason: "Room not found." };
		}
		if (room.players.length >= SEAT_ORDER.length) {
			return { ok: false, reason: "Room is full." };
		}
		const actorId = randomUUID();
		const color = SEAT_ORDER[room.players.length];
		room.players = [
			...room.players,
			{
				actorId,
				name: name.trim() || `Player ${room.players.length + 1}`,
				color,
				isHost: false,
				connected: true,
			},
		];
		this.roomByActor.set(actorId, room.code);
		return { ok: true, value: { actorId, room: toSnapshot(room), state: room.state, version: room.version } };
	}

	startGame(actorId: ActorId): Result<RoomSnapshot> {
		const room = this.getRoomForActor(actorId);
		if (!room) {
			return { ok: false, reason: "Room not found." };
		}
		const actor = room.players.find((player) => player.actorId === actorId);
		if (!actor?.isHost) {
			return { ok: false, reason: "Only the host can start the game." };
		}
		if (room.players.length < 2) {
			return { ok: false, reason: "At least two players are required." };
		}
		room.started = true;
		return { ok: true, value: toSnapshot(room) };
	}

	submitAction(actorId: ActorId, expectedVersion: number, action: Action): Result<{ room: RoomSnapshot; state: State; version: number }> {
		const room = this.getRoomForActor(actorId);
		if (!room) {
			return { ok: false, reason: "Room not found." };
		}
		if (!room.started) {
			return { ok: false, reason: "Game has not started yet." };
		}
		if (room.version !== expectedVersion) {
			return { ok: false, reason: `Version mismatch. Server is at ${room.version}.` };
		}
		if (!AUTHORITATIVE_ACTION_TYPES.includes(action.type)) {
			return { ok: false, reason: "Action is not allowed in multiplayer." };
		}
		const actor = room.players.find((player) => player.actorId === actorId);
		if (!actor) {
			return { ok: false, reason: "Player is not part of the room." };
		}
		if (room.state.game.turn !== actor.color) {
			return { ok: false, reason: "It is not your turn." };
		}
		const previousState = room.state;
		const nextState = reducer(previousState, action);
		if (previousState === nextState) {
			return { ok: false, reason: "Action was rejected by game rules." };
		}
		room.state = nextState;
		room.version += 1;
		return {
			ok: true,
			value: {
				room: toSnapshot(room),
				state: room.state,
				version: room.version,
			},
		};
	}

	leaveRoom(actorId: ActorId): RoomSnapshot | null {
		const room = this.getRoomForActor(actorId);
		if (!room) {
			return null;
		}
		room.players = room.players.filter((player) => player.actorId !== actorId);
		this.roomByActor.delete(actorId);
		if (room.players.length === 0) {
			this.roomsByCode.delete(room.code);
			return null;
		}
		if (!room.players.some((player) => player.isHost)) {
			room.players[0] = { ...room.players[0], isHost: true };
		}
		return toSnapshot(room);
	}

	getRoomForActor(actorId: ActorId): Room | null {
		const code = this.roomByActor.get(actorId);
		if (!code) {
			return null;
		}
		return this.roomsByCode.get(code) ?? null;
	}

	getRoomSnapshotByActor(actorId: ActorId): RoomSnapshot | null {
		const room = this.getRoomForActor(actorId);
		return room ? toSnapshot(room) : null;
	}
}
