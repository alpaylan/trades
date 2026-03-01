import type { Action, State } from "../logic/engine";
import type { TileOwner } from "../logic/Game";

export type ActorId = string;

export type RoomPlayer = {
	actorId: ActorId;
	name: string;
	color: TileOwner;
	isHost: boolean;
	connected: boolean;
};

export type RoomSnapshot = {
	code: string;
	players: RoomPlayer[];
	started: boolean;
};

export type ActionEnvelope = {
	action: Action;
	actorId: ActorId;
	expectedVersion: number;
};

export type ClientMessage =
	| { type: "create_room"; name: string }
	| { type: "join_room"; code: string; name: string }
	| { type: "start_game"; actorId: ActorId }
	| { type: "submit_action"; payload: ActionEnvelope }
	| { type: "leave_room"; actorId: ActorId }
	| { type: "ping" };

export type ServerMessage =
	| {
			type: "room_created";
			actorId: ActorId;
			room: RoomSnapshot;
			version: number;
			state: State;
	  }
	| {
			type: "room_joined";
			actorId: ActorId;
			room: RoomSnapshot;
			version: number;
			state: State;
	  }
	| { type: "room_state"; room: RoomSnapshot }
	| { type: "game_state"; state: State; version: number; actorId: ActorId; action: Action }
	| { type: "action_rejected"; reason: string; expectedVersion: number }
	| { type: "error"; message: string }
	| { type: "pong" };

export const isClientMessage = (value: unknown): value is ClientMessage => {
	if (!value || typeof value !== "object") {
		return false;
	}
	return "type" in value && typeof value.type === "string";
};

export const isServerMessage = (value: unknown): value is ServerMessage => {
	if (!value || typeof value !== "object") {
		return false;
	}
	return "type" in value && typeof value.type === "string";
};
