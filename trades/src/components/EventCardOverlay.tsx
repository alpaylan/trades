import { useEffect, useState } from "react";
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
	market_holiday: { src: "/assets/event-card-market-holiday.png", alt: "Market Holiday" },
	material_surplus: { src: "/assets/event-card-material-surplus.png", alt: "Material Surplus" },
	supply_chain_shortage: { src: "/assets/event-card-supply-chain-shortage.png", alt: "Supply Chain Shortage" },
	speculative_investment: { src: "/assets/event-card-speculative-investment.png", alt: "Speculative Investment" },
	black_market_scams: { src: "/assets/event-card-black-market-scams.png", alt: "Black Market Scams" },
	merchants_lottery: { src: "/assets/event-card-merchants-lottery.png", alt: "Merchant's Lottery" },
	robin_hoods_toll: { src: "/assets/event-card-robin-hoods-toll.png", alt: "Robin Hood's Toll" },
	reversed_currents: { src: "/assets/event-card-reversed-currents.png", alt: "Reversed Currents" },
	time_skip: { src: "/assets/event-card-time-skip.png", alt: "Time Skip" },
	international_trade_treaty: {
		src: "/assets/event-card-international-trade-treaty.png",
		alt: "International Trade Treaty",
	},
	economic_isolation: {
		src: "/assets/event-card-economic-isolation.png",
		alt: "Economic Isolation",
	},
};

const EVENT_CARD_FALLBACK: Record<string, { title: string; rule: string }> = {
	international_trade_treaty: {
		title: "International Trade Treaty",
		rule: "Connectivity is the key to wealth! For each completed trade route you have with a neighbor (both sides have customs and roads facing each other), you receive 5 Gold at the start of this round.",
	},
	economic_isolation: {
		title: "Economic Isolation",
		rule: "Connectivity is mandatory! Any player who has not established at least one completed trade route with a neighbor must pay 3 Gold. If a player cannot afford the gold, their Gold production is reduced by 1.",
	},
};

export default function EventCardOverlay() {
	const { state, dispatch } = useGlobalContext();
	const [showTimeSkipConfirm, setShowTimeSkipConfirm] = useState(false);
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		setImageError(false);
	}, [state.eventCardContent]);

	if (!state.showEventCard) return null;

	const isPreview = !state.pendingRoundEnd;
	const cardInfo = CARD_IMAGES[state.eventCardContent];
	// #region agent log
	fetch("http://127.0.0.1:7580/ingest/bf122d7c-c5a4-46ee-a115-f97e4e7f2fd9", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Debug-Session-Id": "acabf9",
		},
		body: JSON.stringify({
			sessionId: "acabf9",
			runId: "pre-fix",
			hypothesisId: "H1",
			location: "EventCardOverlay.tsx:cardInfo",
			message: "Event card render",
			data: {
				eventCardContent: state.eventCardContent,
				hasCardInfo: !!cardInfo,
			},
			timestamp: Date.now(),
		}),
	}).catch(() => {});
	// #endregion
	const showExtendedStack = isPreview && state.lastDrawnWasExtendedTimeline;
	const extendedCardInfo = CARD_IMAGES["extended_timeline"];
	const cardKey = `${state.eventCardContent}-${isPreview ? "preview" : "draw"}`;

	const isTimeSkipRound = state.eventCardContent === "time_skip" && state.pendingRoundEnd;

	return (
		<div
			className="event-card-overlay"
			onClick={() => {
				if (isTimeSkipRound) {
					setShowTimeSkipConfirm(true);
					return;
				}
				dispatch({ type: "DISMISS_EVENT_CARD" });
			}}
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
																		: state.eventCardContent === "market_holiday"
																			? "Market Holiday event card"
													: state.eventCardContent === "supply_chain_shortage"
														? "Supply Chain Shortage event card"
														: state.eventCardContent === "material_surplus"
															? "Material Surplus event card"
															: state.eventCardContent === "black_market_scams"
																? "Black Market Scams event card"
																: state.eventCardContent === "merchants_lottery"
																	? "Merchant's Lottery event card"
																	: state.eventCardContent === "robin_hoods_toll"
																		? "Robin Hood's Toll event card"
																		: state.eventCardContent === "reversed_currents"
																			? "Reversed Currents event card"
																			: state.eventCardContent === "time_skip"
																				? "Time Skip event card"
																				: state.eventCardContent === "international_trade_treaty"
																					? "International Trade Treaty event card"
																					: state.eventCardContent === "economic_isolation"
																						? "Economic Isolation event card"
																						: "Event card"
			}
		>
			<div
				key={cardKey}
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
								EVENT_CARD_FALLBACK[state.eventCardContent] && imageError ? (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											padding: 24,
											height: "100%",
											textAlign: "center",
											background: "linear-gradient(180deg, #f5f0e6 0%, #e8e0d0 100%)",
											borderRadius: 8,
										}}
									>
										<p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
											{EVENT_CARD_FALLBACK[state.eventCardContent].title}
										</p>
										<p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.45 }}>
											{EVENT_CARD_FALLBACK[state.eventCardContent].rule}
										</p>
									</div>
								) : (
									<img
										src={cardInfo.src}
										alt={cardInfo.alt}
										onError={() => setImageError(true)}
										style={{
											width: "100%",
											height: "100%",
											objectFit: "contain",
										}}
									/>
								)
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
								EVENT_CARD_FALLBACK[state.eventCardContent] && imageError ? (
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											padding: 24,
											minHeight: "100%",
											textAlign: "center",
											background: "linear-gradient(180deg, #f5f0e6 0%, #e8e0d0 100%)",
											borderRadius: 8,
										}}
									>
										<p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
											{EVENT_CARD_FALLBACK[state.eventCardContent].title}
										</p>
										<p style={{ margin: 0, fontSize: 13, color: "#333", lineHeight: 1.45 }}>
											{EVENT_CARD_FALLBACK[state.eventCardContent].rule}
										</p>
									</div>
								) : (
									<img
										src={cardInfo.src}
										alt={cardInfo.alt}
										onError={() => setImageError(true)}
										style={{
											width: "100%",
											height: "100%",
											objectFit: "contain",
										}}
									/>
								)
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
			{isTimeSkipRound && showTimeSkipConfirm && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 10001,
						backgroundColor: "rgba(0,0,0,0.6)",
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 12,
							padding: "20px 28px",
							boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
							minWidth: 260,
							maxWidth: 340,
							textAlign: "center",
						}}
					>
						<p
							style={{
								margin: "0 0 10px",
								fontSize: 16,
								fontWeight: 700,
							}}
						>
							Time Skip
						</p>
						<p
							style={{
								margin: "0 0 16px",
								fontSize: 13,
								color: "#555",
							}}
						>
							A month passes in the blink of an eye. Move to the next round and draw a new event card.
						</p>
						<button
							type="button"
							onClick={() => {
								setShowTimeSkipConfirm(false);
								dispatch({ type: "DISMISS_EVENT_CARD" });
							}}
							style={{
								padding: "8px 20px",
								borderRadius: 8,
								border: "none",
								background: "#1976d2",
								color: "#fff",
								fontWeight: 600,
								cursor: "pointer",
								fontSize: 14,
							}}
						>
							Move to Next Round
						</button>
					</div>
				</div>
			)}
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
