import { useGlobalContext } from "../logic/State";
import Inventory from "./Inventory";
import Productions from "./Productions";
import Resources from "./Resources";
import Store from "./Store";
import Turn from "./Turn";

export default function Controls() {
	const { state, dispatch } = useGlobalContext();

	const user = state.game.users[state.game.turn];

	return (
		<div id="controls">
			<Turn turn={state.game.turn} />
			<button type="button" onClick={() => dispatch({ type: "END_TURN" })}>
				End Turn
			</button>
			<Inventory inventory={user.inventory} />
			<Resources resources={user.resources} />
			<Productions productions={user.production} />
			<Store resources={user.resources} />
		</div>
	);
}
