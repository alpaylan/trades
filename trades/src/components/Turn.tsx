import type { TileOwner } from "../logic/Game";

export default function Turn({
	turn,
	round,
	actionsLeft,
}: {
	turn: TileOwner;
	round: number;
	actionsLeft: number;
}) {
	return (
		<div id="turn" className={`turn turn-${turn}`}>
			<div className="turn-label">
				<span
					className={`turn-indicator turn-${turn}`}
					aria-hidden="true"
				/>
				<span>
					Round {round} – Turn: {turn}
				</span>
				<span style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>
					Actions left: {actionsLeft}
				</span>
			</div>
		</div>
	);
}
