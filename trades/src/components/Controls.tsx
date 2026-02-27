import type { TurnDirection } from "../logic/State";
import { useGlobalContext } from "../logic/State";
import Inventory from "./Inventory";
import RotationSelector from "./RotationSelector";
import Store from "./Store";
import Turn from "./Turn";

export default function Controls() {
	const { state, dispatch } = useGlobalContext();

	const user = state.game.users[state.game.turn];
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const actionsLeft = Math.max(0, 2 - actionsUsed);
	const canStartAction =
		actionsLeft > 0 && !state.endedThisRound[state.game.turn];

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
			{state.pendingTurn && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "6px",
						padding: "8px",
						border: "2px solid #333",
						borderRadius: "8px",
						backgroundColor: "#f0f0f0",
					}}
				>
					<div style={{ fontWeight: "bold", fontSize: "12px" }}>
						Rotate road at ({state.pendingTurn.x}, {state.pendingTurn.y}) 90°:
					</div>
					<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
						<button
							type="button"
							onClick={() =>
								dispatch({
									type: "TURN_TILE",
									payload: {
										x: state.pendingTurn!.x,
										y: state.pendingTurn!.y,
										direction: "cw" as TurnDirection,
									},
								})
							}
							title="Rotate 90° clockwise"
						>
							CW
						</button>
						<button
							type="button"
							onClick={() =>
								dispatch({
									type: "TURN_TILE",
									payload: {
										x: state.pendingTurn!.x,
										y: state.pendingTurn!.y,
										direction: "ccw" as TurnDirection,
									},
								})
							}
							title="Rotate 90° counter-clockwise"
						>
							CCW
						</button>
						<button
							type="button"
							onClick={() => dispatch({ type: "CLEAR_PENDING_TURN" })}
							title="Cancel"
						>
							Cancel
						</button>
					</div>
				</div>
			)}
			<Store resources={user.resources} />
		</div>
	);
}
