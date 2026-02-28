import { useGlobalContext } from "../logic/State";

const SQUARE_COLORS = ["#43a047", "#e53935", "#ffc107", "#1e88e5"];
const SQUARE_GRID = [
	[0, 1],
	[2, 3],
];

export default function EventCardOverlay() {
	const { state, dispatch } = useGlobalContext();

	if (!state.showEventCard) return null;

	return (
		<div
			className="event-card-overlay"
			onClick={() => dispatch({ type: "DISMISS_EVENT_CARD" })}
			role="dialog"
			aria-modal="true"
			aria-label={
				state.eventCardContent === "end_of_phase_1"
					? "End of Phase 1 event card"
					: "Event card"
			}
		>
			<div
				className="event-card-draw"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="event-card-inner">
					{/* Card back (face down) */}
					<div className="event-card-face event-card-back">
						<div
							style={{
								position: "absolute",
								inset: 0,
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gridTemplateRows: "1fr 1fr",
								gap: 8,
								padding: 12,
								borderRadius: 8,
							}}
						>
							{SQUARE_GRID.flat().map((idx, i) => (
								<div
									key={i}
									style={{
										backgroundColor: SQUARE_COLORS[idx],
										borderRadius: 4,
										opacity: 0.9,
									}}
								/>
							))}
						</div>
					</div>
					{/* Card front (face up) */}
					<div className="event-card-face event-card-front">
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								padding: 24,
								textAlign: "center",
								minHeight: "100%",
							}}
						>
							{state.eventCardContent === "end_of_phase_1" ? (
								<span
									style={{
										fontSize: 22,
										fontWeight: 700,
										color: "#1a1a1a",
										lineHeight: 1.3,
									}}
								>
									End of Phase 1
								</span>
							) : (
								<span
									style={{
										fontSize: 14,
										color: "rgba(0,0,0,0.35)",
									}}
								>
									—
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
			<div
				style={{
					marginTop: 16,
					fontSize: 12,
					color: "rgba(255,255,255,0.9)",
				}}
			>
				Click anywhere to continue
			</div>
		</div>
	);
}
