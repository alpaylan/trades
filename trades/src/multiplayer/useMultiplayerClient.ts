import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Action, State } from "../logic/engine";
import {
	type ActorId,
	type ClientMessage,
	isServerMessage,
	type RoomSnapshot,
	type ServerMessage,
} from "./protocol";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const DEFAULT_REMOTE_WS_URL = "wss://trades-ws-3703.fly.dev";
const PING_INTERVAL_MS = 25_000;

const toWsUrl = (): string => {
	const configured = import.meta.env.VITE_MULTIPLAYER_WS_URL?.trim();
	const url = configured && configured.length > 0 ? configured : DEFAULT_REMOTE_WS_URL;
	if (!/^wss?:\/\//.test(url)) {
		throw new Error("VITE_MULTIPLAYER_WS_URL must start with ws:// or wss://");
	}
	if (/ws:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
		throw new Error("Localhost websocket URLs are disabled. Use a remote wss:// endpoint.");
	}
	if (window.location.protocol === "https:" && url.startsWith("ws://")) {
		throw new Error("Insecure ws:// is blocked on HTTPS pages. Use wss://.");
	}
	return url;
};

export function useMultiplayerClient() {
	const socketRef = useRef<WebSocket | null>(null);
	const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const queueRef = useRef<string[]>([]);
	const versionRef = useRef(0);
	const actorIdRef = useRef<ActorId | null>(null);

	const [status, setStatus] = useState<ConnectionStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [actorId, setActorId] = useState<ActorId | null>(null);
	const [room, setRoom] = useState<RoomSnapshot | null>(null);
	const [version, setVersion] = useState(0);
	const [authoritativeState, setAuthoritativeState] = useState<State | null>(null);

	const updateActorId = useCallback((id: ActorId | null) => {
		actorIdRef.current = id;
		setActorId(id);
	}, []);

	const updateVersion = useCallback((v: number) => {
		versionRef.current = v;
		setVersion(v);
	}, []);

	const sendRaw = useCallback((serialized: string) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			queueRef.current.push(serialized);
			return;
		}
		socket.send(serialized);
	}, []);

	const send = useCallback(
		(message: ClientMessage) => {
			sendRaw(JSON.stringify(message));
		},
		[sendRaw],
	);

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

	const startPing = useCallback(() => {
		if (pingRef.current) {
			clearInterval(pingRef.current);
		}
		pingRef.current = setInterval(() => {
			const socket = socketRef.current;
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify({ type: "ping" }));
			}
		}, PING_INTERVAL_MS);
	}, []);

	const stopPing = useCallback(() => {
		if (pingRef.current) {
			clearInterval(pingRef.current);
			pingRef.current = null;
		}
	}, []);

	const handleServerMessage = useCallback(
		(message: ServerMessage) => {
			switch (message.type) {
				case "room_created":
				case "room_joined":
					updateActorId(message.actorId);
					setRoom(message.room);
					updateVersion(message.version);
					setAuthoritativeState(message.state);
					setError(null);
					break;
				case "room_state":
					setRoom(message.room);
					break;
				case "game_state":
					updateVersion(message.version);
					setAuthoritativeState(message.state);
					setError(null);
					break;
				case "action_rejected":
					setError(message.reason);
					updateVersion(message.expectedVersion);
					break;
				case "error":
					setError(message.message);
					break;
				case "pong":
					break;
			}
		},
		[updateActorId, updateVersion],
	);

	const connect = useCallback(() => {
		if (
			socketRef.current &&
			(socketRef.current.readyState === WebSocket.OPEN ||
				socketRef.current.readyState === WebSocket.CONNECTING)
		) {
			return;
		}
		let wsUrl: string;
		try {
			wsUrl = toWsUrl();
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Invalid websocket URL configuration.");
			return;
		}
		const socket = new WebSocket(wsUrl);
		socketRef.current = socket;
		setStatus("connecting");
		setError(null);
		socket.addEventListener("open", () => {
			setStatus("connected");
			startPing();
			flushQueue();
		});
		socket.addEventListener("close", () => {
			setStatus("idle");
			stopPing();
		});
		socket.addEventListener("error", () => {
			setStatus("error");
			setError("Connection failed.");
			stopPing();
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
	}, [flushQueue, handleServerMessage, startPing, stopPing]);

	useEffect(() => {
		return () => {
			stopPing();
		};
	}, [stopPing]);

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
		const id = actorIdRef.current;
		if (!id) {
			return;
		}
		send({ type: "start_game", actorId: id });
	}, [send]);

	const leaveRoom = useCallback(() => {
		const id = actorIdRef.current;
		if (id) {
			send({ type: "leave_room", actorId: id });
		}
		socketRef.current?.close();
		socketRef.current = null;
		stopPing();
		setStatus("idle");
		updateActorId(null);
		setRoom(null);
		updateVersion(0);
		setAuthoritativeState(null);
		setError(null);
	}, [send, stopPing, updateActorId, updateVersion]);

	const sendAuthoritativeAction = useCallback(
		(action: Action) => {
			const id = actorIdRef.current;
			if (!id) {
				return;
			}
			send({
				type: "submit_action",
				payload: {
					action,
					actorId: id,
					expectedVersion: versionRef.current,
				},
			});
		},
		[send],
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
