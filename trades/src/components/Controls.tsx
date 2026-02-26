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
			<Resources resources={user.resources} />
			<Productions productions={user.production} />
			<Store resources={user.resources} />
		</div>
	);
}
