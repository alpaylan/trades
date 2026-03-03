import { useGlobalContext } from "../logic/State";

const SQUARE_COLORS = ["#43a047", "#e53935", "#ffc107", "#1e88e5"];
const SQUARE_GRID = [
	[0, 1],
	[2, 3],
];

const CARD_IMAGES: Record<string, { src: string; alt: string }> = {
	end_of_phase_1: {
		src: "/assets/event-card-end-of-phase-1.png",
		alt: "End of Phase 1",
	},
	no_road: { src: "/assets/event-card-no-road.png", alt: "No Road" },
	black_friday: {
		src: "/assets/event-card-black-friday.png",
		alt: "Black Friday",
	},
	gift: { src: "/assets/event-card-gift.png", alt: "Gift" },
	lucky_streak: { src: "/assets/event-card-lucky-streak.png", alt: "Lucky Streak" },
	labor_revolt: { src: "/assets/event-card-labor-revolt.png", alt: "Labor Revolt" },
	rapid_inflation: { src: "/assets/event-card-rapid-inflation.png", alt: "Rapid Inflation" },
	structural_collapse: { src: "/assets/event-card-structural-collapse.png", alt: "Structural Collapse" },
	safe_passage: { src: "/assets/event-card-safe-passage.png", alt: "Safe Passage" },
	broken_logistics: { src: "/assets/event-card-broken-logistics.png", alt: "Broken Logistics" },
	business_as_usual: { src: "/assets/event-card-business-as-usual.png", alt: "Business as Usual" },
	extended_timeline: { src: "/assets/event-card-extended-timeline.png", alt: "Extended Timeline" },
	bureaucratic_delay: { src: "/assets/event-card-bureaucratic-delay.png", alt: "Bureaucratic Delay" },
	logistic_breakthrough: { src: "/assets/event-card-logistic-breakthrough.png", alt: "Logistic Breakthrough" },
};

export default function EventCardOverlay() {
	const { state, dispatch } = useGlobalContext();

	if (!state.showEventCard) return null;

	const isPreview = !state.pendingRoundEnd;
	const cardInfo = CARD_IMAGES[state.eventCardContent];
	const showExtendedStack = isPreview && state.lastDrawnWasExtendedTimeline;
	const extendedCardInfo = CARD_IMAGES["extended_timeline"];

	return (
		<div
			className="event-card-overlay"
			onClick={() => dispatch({ type: "DISMISS_EVENT_CARD" })}
			role="dialog"
			aria-modal="true"
			aria-label={
				state.eventCardContent === "end_of_phase_1"
					? "End of Phase 1 event card"
					: state.eventCardContent === "no_road"
						? "No Road event card"
						: state.eventCardContent === "black_friday"
							? "Black Friday event card"
							: state.eventCardContent === "gift"
								? "Gift event card"
								: state.eventCardContent === "lucky_streak"
									? "Lucky Streak event card"
									: state.eventCardContent === "labor_revolt"
										? "Labor Revolt event card"
										: state.eventCardContent === "rapid_inflation"
											? "Rapid Inflation event card"
											: state.eventCardContent === "structural_collapse"
												? "Structural Collapse event card"
												: state.eventCardContent === "safe_passage"
													? "Safe Passage event card"
													: state.eventCardContent === "broken_logistics"
														? "Broken Logistics event card"
														: state.eventCardContent === "business_as_usual"
															? "Business as Usual event card"
															: state.eventCardContent === "extended_timeline"
																? "Extended Timeline event card"
																: state.eventCardContent === "bureaucratic_delay"
																	? "Bureaucratic Delay event card"
																	: state.eventCardContent === "logistic_breakthrough"
																		? "Logistic Breakthrough event card"
																		: "Event card"
			}
		>
			<div
				className={isPreview ? "event-card-preview" : "event-card-draw"}
				onClick={(e) => e.stopPropagation()}
			>
				{isPreview ? (
					<div style={{ position: "relative", width: 300, height: 420 }}>
						{showExtendedStack && (
							<div
								style={{
									position: "absolute",
									top: 0,
									left: -180,
									width: 300,
									height: 420,
									borderRadius: 10,
									boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
									border: "2px solid #1e1e1e",
									overflow: "hidden",
									background: "#fff",
									transform: "rotate(-45deg)",
									transformOrigin: "center center",
									zIndex: 1,
								}}
							>
								<img
									src={extendedCardInfo.src}
									alt={extendedCardInfo.alt}
									style={{ width: "100%", height: "100%", objectFit: "contain" }}
								/>
							</div>
						)}
						<div
							className="event-card-face"
							style={{
								position: "relative",
								width: "100%",
								height: "100%",
								borderRadius: 10,
								boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
								border: "2px solid #1e1e1e",
								overflow: "hidden",
								background: "#fff",
								zIndex: 2,
							}}
						>
							{cardInfo ? (
								<img
									src={cardInfo.src}
									alt={cardInfo.alt}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "contain",
									}}
								/>
							) : (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										minHeight: "100%",
										color: "rgba(0,0,0,0.35)",
									}}
								>
									—
								</div>
							)}
						</div>
					</div>
				) : (
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
							{cardInfo ? (
								<img
									src={cardInfo.src}
									alt={cardInfo.alt}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "contain",
									}}
								/>
							) : (
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										padding: 24,
										minHeight: "100%",
									}}
								>
									<span
										style={{
											fontSize: 14,
											color: "rgba(0,0,0,0.35)",
										}}
									>
										—
									</span>
								</div>
							)}
						</div>
					</div>
				)}
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
