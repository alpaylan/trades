import { useEffect, useState } from "react";
import type { OwnedTile } from "../logic/Game";
import type { State } from "../logic/engine";
import { useGlobalContext } from "../logic/State";

const SPEC_DOT_POSITIONS: Record<number, [number, number][]> = {
	1: [[50, 50]],
	2: [[25, 25], [75, 75]],
	3: [[25, 25], [50, 50], [75, 75]],
	4: [[25, 25], [75, 25], [25, 75], [75, 75]],
	5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
	6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function SpeculativeDiceFace({ value, size = 80 }: { value: number; size?: number }) {
	const dots = SPEC_DOT_POSITIONS[value] ?? [];
	const dotR = size * 0.09;
	return (
		<svg width={size} height={size} viewBox="0 0 100 100">
			<rect
				x={2}
				y={2}
				width={96}
				height={96}
				rx={14}
				ry={14}
				fill="#fff"
				stroke="#333"
				strokeWidth={2.5}
			/>
			{dots.map(([cx, cy], i) => (
				<circle key={i} cx={cx} cy={cy} r={dotR} fill="#222" />
			))}
		</svg>
	);
}

function SpeculativeDiceOverlay({ onDone }: { onDone: (roll: number) => void }) {
	const [phase, setPhase] = useState<"rolling" | "result">("rolling");
	const [value, setValue] = useState(1);

	// simple animation
	useEffect(() => {
		let rolling = true;
		let t = 0;
		const tick = () => {
			if (!rolling) return;
			setValue(Math.floor(Math.random() * 6) + 1);
			t += 1;
			if (t < 15) {
				setTimeout(tick, 80);
			} else {
				const finalRoll = Math.floor(Math.random() * 6) + 1;
				setValue(finalRoll);
				setPhase("result");
			}
		};
		setTimeout(tick, 80);
		return () => {
			rolling = false;
		};
	}, []);

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 10000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(0,0,0,0.55)",
			}}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: 14,
					padding: "24px 32px",
					boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
					textAlign: "center",
					minWidth: 260,
				}}
			>
				<p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 16 }}>
					{phase === "rolling" ? "Rolling..." : `You rolled ${value}`}
				</p>
				{phase === "result" && (
					<p style={{ margin: "0 0 12px", fontSize: 12, color: "#555" }}>
						{value === 1 || value === 2
							? "Outcome: downgrade one gold production (if you have any)."
							: value === 3 || value === 4
								? "Outcome: no change to your gold production."
								: "Outcome: upgrade a gold production or gain 1 free production tile (if possible)."}
					</p>
				)}
				<div
					style={{
						display: "inline-block",
						animation: phase === "rolling" ? "dice-shake 0.15s infinite alternate" : undefined,
						transition: "transform 0.3s",
						transform: phase === "rolling" ? undefined : "scale(1.05)",
					}}
				>
					<SpeculativeDiceFace value={value} size={90} />
				</div>
				{phase === "result" && (
					<div style={{ marginTop: 16 }}>
						<button
							type="button"
							onClick={() => onDone(value)}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							{value === 3 || value === 4 ? "OK" : "Choose outcome"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function SpeculativeChoiceBanner({
	state,
	dispatch,
}: {
	state: State;
	dispatch: (a: import("../logic/engine").Action) => void;
}) {
	const roll = state.speculativeInvestmentRoll;
	if (roll === null || roll === 3 || roll === 4) return null;

	const current = state.game.turn;
	const tiles = state.game.tiles;
	const dollarTiles = Object.entries(tiles).filter(
		(entry): entry is [string, OwnedTile & { content: { type_: "production"; production: "dollar"; level: 1 | 2 | 3 } }] =>
			entry[1].owned &&
			entry[1].owner === current &&
			entry[1].content.type_ === "production" &&
			entry[1].content.production === "dollar",
	);
	const isDowngrade = roll === 1 || roll === 2;
	const downgradeTiles = isDowngrade ? dollarTiles : [];
	const allMax = !isDowngrade && dollarTiles.length > 0 && dollarTiles.every(([, t]) => t.content.level === 3);
	const canTakeFree = !isDowngrade && (dollarTiles.length === 0 || allMax);

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				gap: 16,
				padding: "10px 16px",
				backgroundColor: "rgba(249, 168, 37, 0.95)",
				borderBottom: "2px solid #e65100",
				boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
				flexWrap: "wrap",
			}}
			role="status"
			aria-live="polite"
		>
			<span style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a" }}>
				Speculative Investment — {isDowngrade ? "Click a gold production tile on the board to downgrade or remove." : "Click a gold production tile on the board to upgrade, or use the button below for free +1."}
			</span>
			{isDowngrade && downgradeTiles.length === 0 && (
				<button
					type="button"
					onClick={() => dispatch({ type: "SPECULATIVE_APPLY_CHOICE", payload: { action: "skip" } })}
					style={{
						padding: "6px 16px",
						borderRadius: 8,
						border: "none",
						background: "#555",
						color: "#fff",
						cursor: "pointer",
						fontWeight: 600,
						fontSize: 13,
					}}
				>
					Skip (no gold production)
				</button>
			)}
			{!isDowngrade && canTakeFree && (
				<button
					type="button"
					onClick={() =>
						dispatch({ type: "SPECULATIVE_APPLY_CHOICE", payload: { action: "free_production" } })
					}
					style={{
						padding: "6px 16px",
						borderRadius: 8,
						border: "none",
						background: "#2e7d32",
						color: "#fff",
						cursor: "pointer",
						fontWeight: 600,
						fontSize: 13,
					}}
				>
					Receive free +1 gold production tile
				</button>
			)}
		</div>
	);
}

import { hasPlayerSelectedWell, type TileKey } from "../logic/Game";
import Inventory from "./Inventory";
import RotationSelector from "./RotationSelector";
import Store from "./Store";
import Turn from "./Turn";

function actionTileLabel(key: TileKey): string {
	if (typeof key === "string" && key.startsWith("action:")) {
		const a = key.slice(7);
		return a.charAt(0).toUpperCase() + a.slice(1);
	}
	return String(key);
}

export default function Controls() {
	const { state, dispatch } = useGlobalContext();
	const [hoveredRotation, setHoveredRotation] = useState<90 | 180 | 270 | null>(null);
	const [showSpeculativeDice, setShowSpeculativeDice] = useState(false);

	const user = state.game.users[state.game.turn];
	const turn = state.game.turn;
	const blackMarketRemoved = state.blackMarketScamsRemoved?.[turn] ?? [];
	const showBlackMarketPopup =
		blackMarketRemoved.length > 0 && !state.blackMarketScamsPopupShown?.[turn];
	const merchantsLotteryActive = state.activeEventEffects?.merchantsLottery ?? false;
	const merchantsLotteryAmount = state.merchantsLotteryResult?.[turn] ?? 0;
	const showMerchantsLotteryPopup =
		merchantsLotteryActive && !state.merchantsLotteryPopupShown?.[turn];
	const robinHoodsTollActive = state.activeEventEffects?.robinHoodsToll ?? false;
	const robinHoodDelta = state.robinHoodTollDelta?.[turn] ?? 0;
	const showRobinHoodsTollPopup =
		robinHoodsTollActive && !state.robinHoodTollPopupShown?.[turn] && robinHoodDelta !== 0;
	const tradeTreatyActive = state.activeEventEffects?.internationalTradeTreaty ?? false;
	const tradeTreatyBonus = state.internationalTradeTreatyBonus?.[turn] ?? 0;
	const tradeTreatyRoutes = tradeTreatyBonus > 0 ? tradeTreatyBonus / 5 : 0;
	const showTradeTreatyPopup =
		tradeTreatyActive &&
		tradeTreatyBonus > 0 &&
		!state.internationalTradeTreatyPopupShown?.[turn];
	const economicIsolationActive = state.activeEventEffects?.economicIsolation ?? false;
	const economicIsolationResult = state.economicIsolationResult?.[turn] ?? "none";
	const showEconomicIsolationPopup =
		economicIsolationActive && !state.economicIsolationPopupShown?.[turn];
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const actionsLeft = Math.max(0, 2 - actionsUsed);
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[state.game.turn];
	const lbPending =
		state.activeEventEffects?.logisticBreakthrough &&
		state.logisticBreakthroughPicks < 2;
	const speculativeActive = state.activeEventEffects?.speculativeInvestment ?? false;
	const speculativePending =
		speculativeActive && !state.speculativeInvestmentResolved[state.game.turn];
	const wellNotSelectedPending =
		state.game.round === 1 && !hasPlayerSelectedWell(state.game, state.game.turn);

	const pt = state.pendingTurn;
	const tile = pt ? state.game.tiles[`${pt.y}-${pt.x}`] : null;
	const content = tile && "content" in tile ? tile.content : null;
	const road = content?.type_ === "road" ? content.road : null;
	const isLOrT = road === "l" || road === "t";
	const currentRotation = content?.type_ === "road" ? content.rotation : 0;
	const previewRotation = hoveredRotation ?? currentRotation;

	return (
		<div id="controls">
			<Turn
				turn={state.game.turn}
				round={state.game.round ?? 1}
				actionsLeft={actionsLeft}
			/>
			<div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
				{speculativePending && (
					<button
						type="button"
						onClick={() => setShowSpeculativeDice(true)}
						title="Roll for Speculative Investment"
						style={{
							backgroundColor: "#fff3e0",
							color: "#e65100",
							borderRadius: "4px",
							border: "1px solid rgba(230,81,0,0.5)",
							fontWeight: 600,
						}}
					>
						Roll dice
					</button>
				)}
				<button
					type="button"
					onClick={() => dispatch({ type: "END_TURN" })}
					disabled={!!giftPending || !!lbPending || speculativePending || !!wellNotSelectedPending}
					title={
						giftPending
							? "Take your free action tile first"
							: lbPending
								? "Pick your 2 free road tiles first"
								: speculativePending
									? "Roll Speculative Investment first"
									: wellNotSelectedPending
										? "Select your water well first"
										: undefined
					}
					style={{
						backgroundColor: actionsLeft === 0 ? "#ffb300" : "#e0e0e0",
						borderRadius: "4px",
						border: "1px solid rgba(0,0,0,0.2)",
					}}
				>
					End Turn
				</button>
				<button 
					type="button" 
					onClick={() => dispatch({ type: "UNDO" })}
					disabled={state.history.length === 0}
					title="Undo last action"
				>
					Undo
				</button>
			</div>
			{showSpeculativeDice && (
				<SpeculativeDiceOverlay
					onDone={(roll) => {
						dispatch({ type: "SPECULATIVE_ROLL", payload: { roll } });
						setShowSpeculativeDice(false);
					}}
				/>
			)}
			{state.speculativeInvestmentRoll !== null && (
				<SpeculativeChoiceBanner state={state} dispatch={dispatch} />
			)}
			{showBlackMarketPopup && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(0,0,0,0.55)",
					}}
					role="dialog"
					aria-modal="true"
					aria-label="Black Market Scams – action tiles removed"
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "24px 32px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
							textAlign: "center",
							minWidth: 280,
							maxWidth: 360,
						}}
					>
						<p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>
							Black Market Scams
						</p>
						<p style={{ margin: "0 0 12px", fontSize: 14, color: "#555" }}>
							Your investments were a scam! The action tiles below were removed from your inventory:
						</p>
						<ul
							style={{
								margin: "0 0 16px",
								paddingLeft: 20,
								textAlign: "left",
								fontSize: 14,
								color: "#333",
							}}
						>
							{blackMarketRemoved.map(({ key, count }, i) => (
								<li key={i}>
									{actionTileLabel(key)} × {count}
								</li>
							))}
						</ul>
						<button
							type="button"
							onClick={() => dispatch({ type: "DISMISS_BLACK_MARKET_POPUP" })}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							OK
						</button>
					</div>
				</div>
			)}
			{showMerchantsLotteryPopup && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(0,0,0,0.55)",
					}}
					role="dialog"
					aria-modal="true"
					aria-label="Merchant's Lottery result"
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "24px 32px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
							textAlign: "center",
							minWidth: 280,
							maxWidth: 360,
						}}
					>
						<p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>
							Merchant's Lottery
						</p>
						<p style={{ margin: "0 0 16px", fontSize: 14, color: "#333" }}>
							{merchantsLotteryAmount === 0
								? "Fortune didn't smile this time — only the player(s) with the lowest gold production won (5 Gold for a single winner, 2 Gold each if tied). Better luck next round!"
								: merchantsLotteryAmount === 5
									? "Fortune smiles on the struggling! You had the lowest gold production and won 5 Gold. Enjoy your bonus."
									: "Fortune smiles on the struggling! You were among the lowest producers and won 2 Gold. Enjoy your bonus."}
						</p>
						<button
							type="button"
							onClick={() => dispatch({ type: "DISMISS_MERCHANTS_LOTTERY_POPUP" })}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							OK
						</button>
					</div>
				</div>
			)}
			{showRobinHoodsTollPopup && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(0,0,0,0.55)",
					}}
					role="dialog"
					aria-modal="true"
					aria-label="Robin Hood's Toll result"
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "24px 32px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
							textAlign: "center",
							minWidth: 280,
							maxWidth: 360,
						}}
					>
						<p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>
							Robin Hood's Toll
						</p>
						<p style={{ margin: "0 0 16px", fontSize: 14, color: "#333" }}>
							{robinHoodDelta > 0
								? `Robin Hood came to your aid! You received ${robinHoodDelta} Gold from the wealthiest players.`
								: `Robin Hood collected ${Math.abs(robinHoodDelta)} Gold from you to support poorer players on the board.`}
						</p>
						<button
							type="button"
							onClick={() => dispatch({ type: "DISMISS_ROBIN_HOODS_TOLL_POPUP" })}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							OK
						</button>
					</div>
				</div>
			)}
			{showTradeTreatyPopup && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(0,0,0,0.55)",
					}}
					role="dialog"
					aria-modal="true"
					aria-label="International Trade Treaty result"
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "24px 32px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
							textAlign: "center",
							minWidth: 280,
							maxWidth: 380,
						}}
					>
						<p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>
							International Trade Treaty
						</p>
						<p style={{ margin: "0 0 16px", fontSize: 14, color: "#333" }}>
							{`Connectivity is the key to wealth! You completed ${tradeTreatyRoutes} trade route${tradeTreatyRoutes === 1 ? "" : "s"} with your neighbors and received ${tradeTreatyBonus} Gold thanks to the International Trade Treaty.`}
						</p>
						<button
							type="button"
							onClick={() => dispatch({ type: "DISMISS_INTERNATIONAL_TRADE_TREATY_POPUP" })}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							OK
						</button>
					</div>
				</div>
			)}
			{showEconomicIsolationPopup && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: "rgba(0,0,0,0.55)",
					}}
					role="dialog"
					aria-modal="true"
					aria-label="Economic Isolation result"
				>
					<div
						style={{
							background: "#fff",
							borderRadius: 14,
							padding: "24px 32px",
							boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
							textAlign: "center",
							minWidth: 280,
							maxWidth: 380,
						}}
					>
						<p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>
							Economic Isolation
						</p>
						<p style={{ margin: "0 0 16px", fontSize: 14, color: "#333" }}>
							{economicIsolationResult === "none"
								? "You have at least one completed trade route with a neighbor. No penalty."
								: economicIsolationResult === "paid"
									? "You had no completed trade route. You paid 3 Gold."
									: "You had no completed trade route and could not pay 3 Gold. Your Gold production was reduced by 1."}
						</p>
						<button
							type="button"
							onClick={() => dispatch({ type: "DISMISS_ECONOMIC_ISOLATION_POPUP" })}
							style={{
								padding: "8px 24px",
								borderRadius: 8,
								border: "none",
								background: "#2e7d32",
								color: "#fff",
								cursor: "pointer",
								fontWeight: 600,
								fontSize: 14,
							}}
						>
							OK
						</button>
					</div>
				</div>
			)}
			<Inventory inventory={user.inventory} />
			<RotationSelector />
			{state.pendingTurn && isLOrT && road && (
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "4px 6px",
						borderRadius: "999px",
						backgroundColor: "#f0f0f0",
						marginTop: "6px",
						fontSize: "11px",
					}}
				>
					<span style={{ fontWeight: "bold" }}>Rotate to:</span>
					<span
						style={{
							width: 20,
							height: 20,
							borderRadius: 4,
							border: "1px solid rgba(0,0,0,0.2)",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "white",
						}}
						aria-hidden="true"
					>
						<img
							src={`/assets/road-${road}.svg`}
							alt=""
							style={{
								width: 14,
								height: 14,
								transform: `rotate(${previewRotation}deg)`,
							}}
						/>
					</span>
					<div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
						{([90, 180, 270] as const).map((r) => (
							<button
								key={r}
								type="button"
								onClick={() => {
									dispatch({
										type: "TURN_TILE",
										payload: { x: pt!.x, y: pt!.y, rotation: r },
									});
									setHoveredRotation(null);
								}}
								onMouseEnter={() => setHoveredRotation(r)}
								onMouseLeave={() => setHoveredRotation(null)}
								style={{
									width: 26,
									height: 26,
									borderRadius: "999px",
									border: "1px solid",
									borderColor: previewRotation === r ? "#1976d2" : "#ccc",
									backgroundColor: previewRotation === r ? "#1976d2" : "white",
									color: previewRotation === r ? "white" : "#333",
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "10px",
									cursor: "pointer",
									padding: 0,
								}}
								title={`Rotate to ${r}°`}
							>
								{r}°
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={() => {
							dispatch({ type: "CLEAR_PENDING_TURN" });
							setHoveredRotation(null);
						}}
						style={{
							padding: "2px 8px",
							fontSize: "10px",
							borderRadius: "999px",
							border: "1px solid #ccc",
							backgroundColor: "white",
							cursor: "pointer",
						}}
						title="Cancel"
					>
						Cancel
					</button>
				</div>
			)}
			<Store resources={user.resources} />
		</div>
	);
}
