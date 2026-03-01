import { useCallback, useMemo, useRef, useState } from "react";
import type { Action, State } from "../logic/engine";
import {
	type ActorId,
	type ClientMessage,
	isServerMessage,
	type RoomSnapshot,
	type ServerMessage,
} from "./protocol";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const DEFAULT_WS_URL = "ws://localhost:8787";

const toWsUrl = () => import.meta.env.VITE_MULTIPLAYER_WS_URL ?? DEFAULT_WS_URL;

export function useMultiplayerClient() {
	const socketRef = useRef<WebSocket | null>(null);
	const queueRef = useRef<string[]>([]);
	const [status, setStatus] = useState<ConnectionStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [actorId, setActorId] = useState<ActorId | null>(null);
	const [room, setRoom] = useState<RoomSnapshot | null>(null);
	const [version, setVersion] = useState(0);
	const [authoritativeState, setAuthoritativeState] = useState<State | null>(null);

	const flushQueue = useCallback(() => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}
		for (const message of queueRef.current) {
			socket.send(message);
		}
		queueRef.current = [];
	}, []);

	const send = useCallback(
		(message: ClientMessage) => {
			const serialized = JSON.stringify(message);
			const socket = socketRef.current;
			if (!socket || socket.readyState !== WebSocket.OPEN) {
				queueRef.current.push(serialized);
				return;
			}
			socket.send(serialized);
		},
		[],
	);

	const handleServerMessage = useCallback((message: ServerMessage) => {
		switch (message.type) {
			case "room_created":
			case "room_joined":
				setActorId(message.actorId);
				setRoom(message.room);
				setVersion(message.version);
				setAuthoritativeState(message.state);
				setError(null);
				break;
			case "room_state":
				setRoom(message.room);
				break;
			case "game_state":
				setVersion(message.version);
				setAuthoritativeState(message.state);
				break;
			case "action_rejected":
				setError(message.reason);
				setVersion(message.expectedVersion);
				break;
			case "error":
				setError(message.message);
				break;
			case "pong":
				break;
		}
	}, []);

	const connect = useCallback(() => {
		if (
			socketRef.current &&
			(socketRef.current.readyState === WebSocket.OPEN ||
				socketRef.current.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		const socket = new WebSocket(toWsUrl());
		socketRef.current = socket;
		setStatus("connecting");
		setError(null);
		socket.addEventListener("open", () => {
			setStatus("connected");
			flushQueue();
		});
		socket.addEventListener("close", () => {
			setStatus("idle");
		});
		socket.addEventListener("error", () => {
			setStatus("error");
			setError("Connection failed.");
		});
		socket.addEventListener("message", (event) => {
			try {
				const parsed: unknown = JSON.parse(event.data);
				if (isServerMessage(parsed)) {
					handleServerMessage(parsed);
				}
			} catch {
				setError("Received invalid server payload.");
			}
		});
	}, [flushQueue, handleServerMessage]);

	const createRoom = useCallback(
		(name: string) => {
			connect();
			send({ type: "create_room", name });
		},
		[connect, send],
	);

	const joinRoom = useCallback(
		(code: string, name: string) => {
			connect();
			send({ type: "join_room", code: code.trim().toUpperCase(), name });
		},
		[connect, send],
	);

	const startGame = useCallback(() => {
		if (!actorId) {
			return;
		}
		send({ type: "start_game", actorId });
	}, [actorId, send]);

	const leaveRoom = useCallback(() => {
		if (actorId) {
			send({ type: "leave_room", actorId });
		}
		socketRef.current?.close();
		socketRef.current = null;
		setStatus("idle");
		setActorId(null);
		setRoom(null);
		setVersion(0);
		setAuthoritativeState(null);
		setError(null);
	}, [actorId, send]);

	const sendAuthoritativeAction = useCallback(
		(action: Action) => {
			if (!actorId) {
				return;
			}
			send({
				type: "submit_action",
				payload: {
					action,
					actorId,
					expectedVersion: version,
				},
			});
		},
		[actorId, send, version],
	);

	const isHost = useMemo(() => {
		if (!room || !actorId) {
			return false;
		}
		return room.players.some((player) => player.actorId === actorId && player.isHost);
	}, [room, actorId]);

	return {
		status,
		error,
		actorId,
		room,
		version,
		authoritativeState,
		createRoom,
		joinRoom,
		startGame,
		leaveRoom,
		sendAuthoritativeAction,
		isHost,
	};
}
