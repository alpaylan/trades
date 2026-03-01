import { useState } from "react";
import { useGlobalContext } from "../logic/State";
import Inventory from "./Inventory";
import RotationSelector from "./RotationSelector";
import Store from "./Store";
import Turn from "./Turn";

export default function Controls() {
	const { state, dispatch } = useGlobalContext();
	const [hoveredRotation, setHoveredRotation] = useState<90 | 180 | 270 | null>(null);

	const user = state.game.users[state.game.turn];
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const actionsLeft = Math.max(0, 2 - actionsUsed);
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[state.game.turn];

	const pt = state.pendingTurn;
	const tile = pt ? state.game.tiles[`${pt.y}-${pt.x}`] : null;
	const content = tile && "content" in tile ? tile.content : null;
	const road = content?.type_ === "road" ? content.road : null;
	const isLOrT = road === "l" || road === "t";
	const currentRotation = content?.type_ === "road" ? content.rotation : 0;
	const previewRotation = hoveredRotation ?? currentRotation;

	return (
		<div id="controls">
			<Turn
				turn={state.game.turn}
				round={state.game.round ?? 1}
				actionsLeft={actionsLeft}
			/>
			<div style={{ display: "flex", gap: "10px" }}>
				<button
					type="button"
					onClick={() => dispatch({ type: "END_TURN" })}
					disabled={giftPending}
					title={giftPending ? "Take your free action tile first" : undefined}
					style={{
						backgroundColor: actionsLeft === 0 ? "#ffb300" : "#e0e0e0",
						borderRadius: "4px",
						border: "1px solid rgba(0,0,0,0.2)",
					}}
				>
					End Turn
				</button>
				<button 
					type="button" 
					onClick={() => dispatch({ type: "UNDO" })}
					disabled={state.history.length === 0}
					title="Undo last action"
				>
					Undo
				</button>
			</div>
			<Inventory inventory={user.inventory} />
			<RotationSelector />
			{state.pendingTurn && isLOrT && road && (
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px 6px",
						borderRadius: "999px",
						backgroundColor: "#f0f0f0",
						marginTop: "6px",
						fontSize: "11px",
					}}
				>
					<span style={{ fontWeight: "bold" }}>Rotate to:</span>
					<span
						style={{
							width: 20,
							height: 20,
							borderRadius: 4,
							border: "1px solid rgba(0,0,0,0.2)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "white",
						}}
						aria-hidden="true"
					>
						<img
							src={`src/assets/road-${road}.svg`}
							alt=""
							style={{
								width: 14,
								height: 14,
								transform: `rotate(${previewRotation}deg)`,
							}}
						/>
					</span>
					<div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
						{([90, 180, 270] as const).map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => {
									dispatch({
										type: "TURN_TILE",
										payload: { x: pt!.x, y: pt!.y, rotation: r },
									});
									setHoveredRotation(null);
								}}
								onMouseEnter={() => setHoveredRotation(r)}
								onMouseLeave={() => setHoveredRotation(null)}
								style={{
									width: 26,
									height: 26,
									borderRadius: "999px",
									border: "1px solid",
									borderColor: previewRotation === r ? "#1976d2" : "#ccc",
									backgroundColor: previewRotation === r ? "#1976d2" : "white",
									color: previewRotation === r ? "white" : "#333",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "10px",
									cursor: "pointer",
									padding: 0,
								}}
								title={`Rotate to ${r}°`}
							>
								{r}°
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => {
							dispatch({ type: "CLEAR_PENDING_TURN" });
							setHoveredRotation(null);
						}}
						style={{
							padding: "2px 8px",
							fontSize: "10px",
							borderRadius: "999px",
							border: "1px solid #ccc",
							backgroundColor: "white",
							cursor: "pointer",
						}}
						title="Cancel"
					>
						Cancel
					</button>
				</div>
			)}
			<Store resources={user.resources} />
		</div>
	);
}
