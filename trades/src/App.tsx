import "./App.css";
import { useMemo, useState } from "react";
import Board from "./components/Board";
import Controls from "./components/Controls";
import ErrorBoundary from "./components/ErrorBoundary";
import EventCardOverlay from "./components/EventCardOverlay";
import EventDeck from "./components/EventDeck";
import PlayerBalances from "./components/PlayerBalances";
import type { TileOwner } from "./logic/Game";
import { GlobalProvider, type MultiplayerBridge } from "./logic/State";
import { useMultiplayerClient } from "./multiplayer/useMultiplayerClient";

function GameLayout() {
	return (
		<>
			<div id="app-layout">
				<Controls />
				<div id="board-area">
					<Board />
				</div>
				<PlayerBalances />
			</div>
			<EventDeck />
			<EventCardOverlay />
		</>
	);
}

function App() {
	const [mode, setMode] = useState<"local" | "online">("local");
	const [name, setName] = useState("Player");
	const [code, setCode] = useState("");
	const multiplayer = useMultiplayerClient();

	const myColor: TileOwner | null = useMemo(() => {
		if (!multiplayer.room || !multiplayer.actorId) return null;
		const me = multiplayer.room.players.find((p) => p.actorId === multiplayer.actorId);
		return me?.color ?? null;
	}, [multiplayer.room, multiplayer.actorId]);

	const bridge: MultiplayerBridge | undefined = useMemo(() => {
		if (!multiplayer.room?.started || !myColor) return undefined;
		return {
			authoritativeState: multiplayer.authoritativeState,
			sendAuthoritativeAction: multiplayer.sendAuthoritativeAction,
			myColor,
		};
	}, [multiplayer.authoritativeState, multiplayer.sendAuthoritativeAction, multiplayer.room?.started, myColor]);

	const canStart =
		multiplayer.room &&
		!multiplayer.room.started &&
		multiplayer.room.players.length >= 2 &&
		multiplayer.isHost;

	if (mode === "local") {
		return (
			<>
				<div style={{ display: "flex", justifyContent: "center", padding: "0.75rem" }}>
					<button type="button" onClick={() => setMode("online")}>
						Switch To Online Multiplayer
					</button>
				</div>
				<GlobalProvider>
					<ErrorBoundary>
						<GameLayout />
					</ErrorBoundary>
				</GlobalProvider>
			</>
		);
	}

	return (
		<>
			<div
				style={{
					display: "flex",
					gap: "0.5rem",
					alignItems: "center",
					justifyContent: "center",
					padding: "0.75rem",
					flexWrap: "wrap",
				}}
			>
				<button type="button" onClick={() => setMode("local")}>
					Back To Local Game
				</button>
				{multiplayer.room ? (
					<>
						<strong>Room Code: {multiplayer.room.code}</strong>
						<span>{multiplayer.room.started ? "Game started" : "Waiting for players"}</span>
						<button type="button" onClick={multiplayer.leaveRoom}>
							Leave Room
						</button>
					</>
				) : (
					<>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Your name"
						/>
						<button
							type="button"
							onClick={() => multiplayer.createRoom(name.trim() || "Player")}
						>
							Create Room
						</button>
						<input
							value={code}
							onChange={(event) => setCode(event.target.value.toUpperCase())}
							placeholder="Invite code"
							maxLength={6}
						/>
						<button
							type="button"
							onClick={() => multiplayer.joinRoom(code, name.trim() || "Player")}
						>
							Join Room
						</button>
					</>
				)}
				{canStart ? (
					<button type="button" onClick={multiplayer.startGame}>
						Start Game
					</button>
				) : null}
				<span
				style={{
					fontSize: "0.75rem",
					padding: "2px 8px",
					borderRadius: "999px",
					backgroundColor:
						multiplayer.status === "connected"
							? "#e8f5e9"
							: multiplayer.status === "connecting"
								? "#fff3e0"
								: multiplayer.status === "error"
									? "#ffebee"
									: "#f5f5f5",
					color:
						multiplayer.status === "connected"
							? "#2e7d32"
							: multiplayer.status === "error"
								? "#c62828"
								: "#616161",
				}}
			>
				{multiplayer.status === "connected"
					? `Connected (v${multiplayer.version})`
					: multiplayer.status === "connecting"
						? "Connecting..."
						: multiplayer.status === "error"
							? "Disconnected"
							: "Not connected"}
			</span>
			{multiplayer.error ? <span style={{ color: "#b00020", fontSize: "0.8rem" }}>{multiplayer.error}</span> : null}
			</div>
		{multiplayer.room && !multiplayer.room.started ? (
			<div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
				<div style={{ background: "#fff", padding: "0.75rem 1rem", borderRadius: 8 }}>
					<div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Players in lobby</div>
					{multiplayer.room.players.map((player) => (
						<div key={player.actorId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
							<span style={{
								display: "inline-block",
								width: 12,
								height: 12,
								borderRadius: "50%",
								backgroundColor: player.color,
								border: "1px solid rgba(0,0,0,0.2)",
							}} />
							<span>{player.name}</span>
							<span style={{ color: "#888", fontSize: "0.8rem" }}>
								({player.color})
								{player.isHost ? " - host" : ""}
								{player.connected ? "" : " - disconnected"}
							</span>
						</div>
					))}
					{multiplayer.room.players.length < 2 && (
						<p style={{ color: "#888", fontSize: "0.85rem", marginTop: 8 }}>
							Waiting for another player to join...
						</p>
					)}
				</div>
			</div>
		) : null}
		{multiplayer.room?.started && bridge ? (
			<GlobalProvider multiplayer={bridge}>
				<ErrorBoundary>
					<GameLayout />
				</ErrorBoundary>
			</GlobalProvider>
		) : null}
		</>
	);
}

export default App;
