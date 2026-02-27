import type { TurnDirection } from "../logic/State";
import { useGlobalContext } from "../logic/State";
import Inventory from "./Inventory";
import Productions from "./Productions";
import Resources from "./Resources";
import RotationSelector from "./RotationSelector";
import Store from "./Store";
import Turn from "./Turn";

export default function Controls() {
	const { state, dispatch } = useGlobalContext();

	const user = state.game.users[state.game.turn];

	return (
		<div id="controls">
			<Turn turn={state.game.turn} />
			<div style={{ display: "flex", gap: "10px" }}>
				<button type="button" onClick={() => dispatch({ type: "END_TURN" })}>
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
			<Resources resources={user.resources} />
			<Productions productions={user.production} />
			<Store resources={user.resources} />
		</div>
	);
}
