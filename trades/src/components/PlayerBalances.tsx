import type { TileOwner } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

const PLAYER_ORDER: TileOwner[] = ["green", "orange", "blue", "red"];

export default function PlayerBalances() {
	const { state } = useGlobalContext();
	const { game } = state;
	const roundStarter =
		PLAYER_ORDER[(game.round - 1) % PLAYER_ORDER.length];

	return (
		<div id="player-balances">
			<div className="player-balances-title">Player balances</div>
			<ul className="player-balances-list">
				{PLAYER_ORDER.map((color) => {
					const user = game.users[color];
					const isCurrentTurn = game.turn === color;
					const isRoundStarter = roundStarter === color;
					return (
						<li
							key={color}
							className={`player-balance-item turn-${color} ${isCurrentTurn ? "player-balance-current" : ""} ${isRoundStarter ? "player-balance-round-starter" : ""}`}
						>
							<span className={`turn-indicator turn-${color}`} aria-hidden="true" />
							<span className="player-balance-label">
								{color}
								{isRoundStarter && (
									<span
										className="round-starter-badge"
										title="Starts this round"
										aria-label="Starts this round"
									>
										▶
									</span>
								)}
							</span>
							<span className="player-balance-amount">
								<img
									src="src/assets/gold-bar.svg"
									alt=""
									className="player-balance-gold-icon"
									aria-hidden="true"
								/>
								{user.resources.dollar}
								<span className="player-balance-production">
									{" "}
									(+{user.production.dollar})
								</span>
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
