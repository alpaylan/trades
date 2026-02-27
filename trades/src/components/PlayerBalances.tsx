import type { TileOwner } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

const PLAYER_ORDER: TileOwner[] = ["green", "orange", "blue", "red"];

export default function PlayerBalances() {
	const { state } = useGlobalContext();
	const { game } = state;

	return (
		<div id="player-balances">
			<div className="player-balances-title">Player balances</div>
			<ul className="player-balances-list">
				{PLAYER_ORDER.map((color) => {
					const user = game.users[color];
					const isCurrentTurn = game.turn === color;
					return (
						<li
							key={color}
							className={`player-balance-item turn-${color} ${isCurrentTurn ? "player-balance-current" : ""}`}
						>
							<span className={`turn-indicator turn-${color}`} aria-hidden="true" />
							<span className="player-balance-label">{color}</span>
							<span className="player-balance-amount">${user.resources.dollar}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
