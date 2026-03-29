import type { TileOwner } from "../logic/Game";

export default function Turn({
	turn,
	round,
	actionsLeft,
	myColor,
	isMyTurn,
}: {
	turn: TileOwner;
	round: number;
	actionsLeft: number;
	myColor: TileOwner | null;
	isMyTurn: boolean;
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
			{myColor && !isMyTurn && (
				<div style={{
					marginTop: 4,
					padding: "4px 12px",
					borderRadius: 6,
					backgroundColor: "rgba(0,0,0,0.08)",
					fontSize: "0.85rem",
					fontWeight: 600,
					textAlign: "center",
				}}>
					Waiting for <span style={{ color: turn }}>{turn}</span> to play — you are{" "}
					<span style={{ color: myColor }}>{myColor}</span>
				</div>
			)}
			{myColor && isMyTurn && (
				<div style={{
					marginTop: 4,
					padding: "4px 12px",
					borderRadius: 6,
					backgroundColor: "rgba(46,125,50,0.12)",
					fontSize: "0.85rem",
					fontWeight: 600,
					textAlign: "center",
					color: "#2e7d32",
				}}>
					Your turn! You are <span style={{ color: myColor }}>{myColor}</span>
				</div>
			)}
		</div>
	);
}
