import { useGlobalContext } from "../logic/State";

const SQUARE_COLORS = ["#43a047", "#e53935", "#ffc107", "#1e88e5"];
const SQUARE_GRID = [
	[0, 1],
	[2, 3],
];

const EVENT_CARD_IMAGES: Record<
	"end_of_phase_1" | "no_road" | "black_friday" | "gift",
	string
> = {
	end_of_phase_1: "src/assets/event-card-end-of-phase-1.png",
	no_road: "src/assets/event-card-no-road.png",
	black_friday: "src/assets/event-card-black-friday.png",
	gift: "src/assets/event-card-gift.png",
};

export default function EventDeck() {
	const { state, dispatch } = useGlobalContext();
	const remaining = state.eventCardsRemaining;
	const isLow = remaining <= 5 && remaining > 0;
	const lastDrawn = state.lastDrawnEventCard;
	const showLastCard =
		lastDrawn && lastDrawn !== "blank" && lastDrawn in EVENT_CARD_IMAGES;

	return (
		<div
			id="event-deck-wrapper"
			style={{
				position: "fixed",
				bottom: "1rem",
				right: "1rem",
				zIndex: 10,
				display: "flex",
				flexDirection: "row-reverse",
				alignItems: "flex-end",
				gap: 8,
			}}
		>
			{showLastCard && (
				<button
					type="button"
					onClick={() => dispatch({ type: "SHOW_EVENT_CARD_PREVIEW" })}
					title="Click to view card"
					style={{
						width: 64,
						height: 88,
						padding: 0,
						border: "1px solid rgba(0,0,0,0.2)",
						borderRadius: 6,
						background: "#fff",
						boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
						cursor: "pointer",
						overflow: "hidden",
						flexShrink: 0,
					}}
				>
					<img
						src={EVENT_CARD_IMAGES[lastDrawn as keyof typeof EVENT_CARD_IMAGES]}
						alt={`Event card: ${lastDrawn.replace(/_/g, " ")}`}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
						}}
					/>
				</button>
			)}
			<div style={{ position: "relative" }}>
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
		</div>
	);
}
