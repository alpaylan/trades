import { useGlobalContext } from "../logic/State";

const SQUARE_COLORS = ["#43a047", "#e53935", "#ffc107", "#1e88e5"];
const SQUARE_GRID = [
	[0, 1],
	[2, 3],
];

export default function EventDeck() {
	const { state } = useGlobalContext();
	const remaining = state.eventCardsRemaining;
	const isLow = remaining <= 5 && remaining > 0;

	return (
		<div
			id="event-deck-wrapper"
			style={{
				position: "fixed",
				bottom: "1rem",
				right: "1rem",
				zIndex: 10,
			}}
		>
			{isLow && (
				<div
					className="event-deck-flame"
					aria-hidden="true"
					style={{
						position: "absolute",
						inset: -6,
						borderRadius: 12,
						pointerEvents: "none",
					}}
				/>
			)}
			<div
				id="event-deck"
				className={isLow ? "event-deck event-deck--low" : "event-deck"}
				style={{
					position: "relative",
					width: 56,
					height: 80,
					borderRadius: 6,
					background: "#f5f5f5",
					boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
					border: "1px solid rgba(0,0,0,0.12)",
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "flex-end",
					padding: 4,
					overflow: "hidden",
				}}
				title={`Event cards: ${remaining} remaining`}
			>
				{/* Colored squares background - mixed order like board game */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gridTemplateRows: "1fr 1fr",
						gap: 3,
						padding: 5,
					}}
				>
					{SQUARE_GRID.flat().map((idx, i) => (
						<div
							key={i}
							style={{
								backgroundColor: SQUARE_COLORS[idx],
								borderRadius: 3,
								opacity: 0.9,
							}}
						/>
					))}
				</div>
				<span
					style={{
						position: "relative",
						fontSize: 13,
						fontWeight: 700,
						color: "#1a1a1a",
						backgroundColor: "rgba(255,255,255,0.95)",
						padding: "2px 6px",
						borderRadius: 4,
						lineHeight: 1,
						boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
					}}
				>
					{remaining}
				</span>
			</div>
		</div>
	);
}
