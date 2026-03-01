import { WebSocketServer, type WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "../../trades/src/multiplayer/protocol";
import { isClientMessage } from "../../trades/src/multiplayer/protocol";
import { RoomManager } from "./roomManager";

const PORT = Number.parseInt(process.env.PORT ?? "8787", 10);
const roomManager = new RoomManager();
const actorSockets = new Map<string, WebSocket>();

const send = (socket: WebSocket, message: ServerMessage) => {
	socket.send(JSON.stringify(message));
};

const broadcastRoom = (actorId: string, message: ServerMessage) => {
	const room = roomManager.getRoomForActor(actorId);
	if (!room) {
		return;
	}
	for (const player of room.players) {
		const playerSocket = actorSockets.get(player.actorId);
		if (playerSocket && playerSocket.readyState === playerSocket.OPEN) {
			send(playerSocket, message);
		}
	}
};

const server = new WebSocketServer({ port: PORT });

server.on("connection", (socket) => {
	let connectionActorId: string | null = null;

	socket.on("message", (raw) => {
		let message: ClientMessage | null = null;
		try {
			const parsed: unknown = JSON.parse(raw.toString());
			if (isClientMessage(parsed)) {
				message = parsed;
			}
		} catch {
			send(socket, { type: "error", message: "Invalid payload." });
			return;
		}
		if (!message) {
			send(socket, { type: "error", message: "Invalid message type." });
			return;
		}

		switch (message.type) {
			case "ping":
				send(socket, { type: "pong" });
				return;
			case "create_room": {
				const result = roomManager.createRoom(message.name);
				connectionActorId = result.actorId;
				actorSockets.set(result.actorId, socket);
				send(socket, {
					type: "room_created",
					actorId: result.actorId,
					room: result.room,
					version: result.version,
					state: result.state,
				});
				return;
			}
			case "join_room": {
				const result = roomManager.joinRoom(message.code, message.name);
				if (!result.ok) {
					send(socket, { type: "error", message: result.reason });
					return;
				}
				connectionActorId = result.value.actorId;
				actorSockets.set(result.value.actorId, socket);
				send(socket, {
					type: "room_joined",
					actorId: result.value.actorId,
					room: result.value.room,
					version: result.value.version,
					state: result.value.state,
				});
				broadcastRoom(result.value.actorId, { type: "room_state", room: result.value.room });
				return;
			}
			case "start_game": {
				const result = roomManager.startGame(message.actorId);
				if (!result.ok) {
					send(socket, { type: "error", message: result.reason });
					return;
				}
				broadcastRoom(message.actorId, { type: "room_state", room: result.value });
				return;
			}
			case "submit_action": {
				const { actorId, expectedVersion, action } = message.payload;
				const result = roomManager.submitAction(actorId, expectedVersion, action);
				if (!result.ok) {
					send(socket, {
						type: "action_rejected",
						reason: result.reason,
						expectedVersion: roomManager.getRoomForActor(actorId)?.version ?? expectedVersion,
					});
					return;
				}
				broadcastRoom(actorId, {
					type: "game_state",
					state: result.value.state,
					version: result.value.version,
					actorId,
					action,
				});
				broadcastRoom(actorId, { type: "room_state", room: result.value.room });
				return;
			}
			case "leave_room": {
				const snapshot = roomManager.leaveRoom(message.actorId);
				actorSockets.delete(message.actorId);
				if (snapshot) {
					broadcastRoom(snapshot.players[0]?.actorId ?? "", { type: "room_state", room: snapshot });
				}
				return;
			}
		}
	});

	socket.on("close", () => {
		if (!connectionActorId) {
			return;
		}
		actorSockets.delete(connectionActorId);
		const snapshot = roomManager.leaveRoom(connectionActorId);
		if (snapshot) {
			const actor = snapshot.players[0];
			if (actor) {
				broadcastRoom(actor.actorId, { type: "room_state", room: snapshot });
			}
		}
	});
});

console.log(`Multiplayer server listening on ws://localhost:${PORT}`);
