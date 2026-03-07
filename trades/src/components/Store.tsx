import { useState } from "react";
import { canal, hasPlayerSelectedWell, type ResourceCollection, type Tilable, road } from "../logic/Game";
import { useGlobalContext } from "../logic/State";
import DiceRoll from "./DiceRoll";

const GOLD_BAR_SRC = "/assets/gold-bar.svg";

function GoldBars({ count, size = 12 }: { count: number; size?: number }) {
	return (
		<span
			style={{
				display: "inline-flex",
				flexWrap: "wrap",
				gap: 1,
				alignItems: "center",
			}}
		>
			{Array.from({ length: count }, (_, i) => (
				<img
					key={i}
					src={GOLD_BAR_SRC}
					alt=""
					style={{ width: size, height: size / 2 }}
					aria-hidden="true"
				/>
			))}
		</span>
	);
}

function StoreItem({
	resources,
	price,
	item,
	icon,
	text,
	showGoldBars,
	halfSize,
	iconStyle,
}: {
	resources: ResourceCollection;
	price: number;
	item: Tilable;
	icon: string;
	text: string;
	showGoldBars?: { iconCount: number };
	/** When true, button is half height (half of a normal square). */
	halfSize?: boolean;
	/** Optional style for the icon img (e.g. 2×1 for straight canal). */
	iconStyle?: React.CSSProperties;
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const canAct = actionsUsed < 2;
	const blackFriday = state.activeEventEffects?.blackFriday ?? false;
	const rapidInflation = state.activeEventEffects?.rapidInflation ?? false;
	const materialSurplus = state.activeEventEffects?.materialSurplus ?? false;
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];
	const lbPending =
		state.activeEventEffects?.logisticBreakthrough &&
		state.logisticBreakthroughPicks < 2;
	void (
		state.activeEventEffects?.speculativeInvestment &&
		!state.speculativeInvestmentResolved[current]
	);
	const isFreeActionTile = item.type_ === "action" && giftPending;
	const isFreeRoadTile = item.type_ === "road" && lbPending;
	const basePrice =
		materialSurplus && item.type_ === "road" ? Math.max(1, price - 2) : price;
	const pricedWithDiscounts =
		blackFriday ? Math.max(0, basePrice - 1) : rapidInflation ? basePrice + 2 : basePrice;
	const displayPrice =
		isFreeActionTile || isFreeRoadTile ? 0 : pricedWithDiscounts;
	const priceTag = blackFriday ? " — Black Friday!" : rapidInflation ? " — Rapid Inflation!" : "";
	const freeTag = isFreeActionTile ? " — Free gift!" : isFreeRoadTile ? " — Logistic Breakthrough!" : "";
	const tooltip = showGoldBars
		? `${text} (cost: ${displayPrice} gold${priceTag}${freeTag})`
		: `${text} (cost: ${displayPrice}${priceTag}${freeTag})`;

	const disabled = resources.dollar < displayPrice || !canAct;

	return (
		<button
			type="button"
			disabled={disabled}
			title={tooltip}
			onClick={() => {
				if (disabled) return;
				dispatch({ type: "BUY_ITEM", payload: { item, price } });
			}}
			style={
				disabled
					? { opacity: 0.4, pointerEvents: "none" as const }
					: halfSize
					? { height: "1rem", minHeight: "1rem", padding: "0.05rem 0.1rem", gap: 4 }
					: undefined
			}
		>
			{showGoldBars ? (
				<GoldBars count={showGoldBars.iconCount} size={halfSize ? 8 : 16} />
			) : (
				<img
					src={icon}
					alt={`${item.type_} icon`}
					title={tooltip}
					style={
						iconStyle
							? { ...iconStyle, ...(halfSize ? { maxHeight: "0.9rem", width: "auto" } : {}) }
							: halfSize
								? { maxHeight: "0.9rem", width: "auto" }
								: undefined
					}
				/>
			)}
			<span style={halfSize ? { fontSize: "0.7rem" } : undefined}>{displayPrice}</span>
		</button>
	);
}

function RandomTileConfirmDialog({
	onConfirm,
	onCancel,
}: {
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(0,0,0,0.45)",
			}}
			onClick={onCancel}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: 10,
					padding: "24px 28px",
					boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
					maxWidth: 340,
					textAlign: "center",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15 }}>
					Random Tile
				</p>
				<p style={{ margin: "0 0 18px", fontSize: 13, color: "#555" }}>
					This action cannot be undone. Do you want to continue?
				</p>
				<div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
					<button
						type="button"
						onClick={onCancel}
						style={{
							padding: "6px 18px",
							borderRadius: 6,
							border: "1px solid #ccc",
							background: "#f5f5f5",
							cursor: "pointer",
							fontSize: 13,
						}}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						style={{
							padding: "6px 18px",
							borderRadius: 6,
							border: "none",
							background: "#e65100",
							color: "#fff",
							cursor: "pointer",
							fontWeight: 600,
							fontSize: 13,
						}}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
}

export default function Store({
	resources,
}: {
	resources: ResourceCollection;
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];
	const lbPending =
		state.activeEventEffects?.logisticBreakthrough &&
		state.logisticBreakthroughPicks < 2;
	const marketHoliday = state.activeEventEffects?.marketHoliday ?? false;
	const wellSelectionMode =
		state.game.round === 1 && !hasPlayerSelectedWell(state.game, state.game.turn);
	const supplyChainShortage = state.activeEventEffects?.supplyChainShortage ?? false;
	const speculativePending =
		state.activeEventEffects?.speculativeInvestment &&
		!state.speculativeInvestmentResolved[state.game.turn];
	const [showRandomConfirm, setShowRandomConfirm] = useState(false);

	const randomPrice = 5;
	const blackFriday = state.activeEventEffects?.blackFriday ?? false;
	const rapidInflation = state.activeEventEffects?.rapidInflation ?? false;
	const randomDisplayPrice = blackFriday ? Math.max(0, randomPrice - 1) : rapidInflation ? randomPrice + 2 : randomPrice;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const randomDisabled = resources.dollar < randomDisplayPrice || actionsUsed >= 2 || !!lbPending || !!speculativePending;

	return (
		<div
			id="store"
			style={
				marketHoliday || speculativePending || wellSelectionMode
					? { opacity: 0.4, pointerEvents: "none" }
					: undefined
			}
		>
			{showRandomConfirm && (
				<RandomTileConfirmDialog
					onConfirm={() => {
						setShowRandomConfirm(false);
						dispatch({
							type: "START_DICE_ROLL",
							payload: { price: randomPrice },
						});
					}}
					onCancel={() => setShowRandomConfirm(false)}
				/>
			)}
			{state.diceRoll?.active && <DiceRoll />}
			<div id="action-tiles" className="substore"
				style={
					lbPending
						? { opacity: 0.5, pointerEvents: "none" as const }
						: undefined
				}
			>
				{giftPending && (
					<div
						style={{
							width: "100%",
							padding: "4px 8px",
							backgroundColor: "#fff3e0",
							border: "1px solid #ffb74d",
							borderRadius: 4,
							fontSize: 11,
							color: "#e65100",
							fontWeight: 600,
							textAlign: "center",
							whiteSpace: "nowrap",
						}}
					>
						Don't forget to claim your gift
					</div>
				)}
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "turn" }}
					icon="/assets/turn.svg"
					text="Rotate a road tile 90° (choose CW or CCW)"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "toll" }}
					icon="/assets/toll.svg"
					text="Put toll on a tile"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "block" }}
					icon="/assets/block.svg"
					text="Block a tile"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "unblock" }}
					icon="/assets/unblock.svg"
					text="Unblock a tile"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={{ type_: "action", action: "customs" }}
					icon="/assets/customs.svg"
					text="Customs gate (5 gold)"
				/>
			</div>
			<div
				id="road-tiles"
				className="substore"
				style={
					giftPending || supplyChainShortage
						? {
								opacity: 0.4,
								pointerEvents: "none" as const,
							}
						: lbPending
						? { flexWrap: "wrap" as const }
						: undefined
				}
			>
				{lbPending && (
					<div
						style={{
							width: "100%",
							padding: "4px 8px",
							backgroundColor: "#e3f2fd",
							border: "1px solid #64b5f6",
							borderRadius: 4,
							fontSize: 11,
							color: "#1565c0",
							fontWeight: 600,
							textAlign: "center",
							whiteSpace: "nowrap",
						}}
					>
						Pick {2 - state.logisticBreakthroughPicks} free road tile{2 - state.logisticBreakthroughPicks > 1 ? "s" : ""}!
					</div>
				)}
				<StoreItem
					resources={resources}
					price={2}
					item={road("i", 0)}
					icon="/assets/road-i.svg"
					text="Straight road ($2)"
				/>
				<StoreItem
					resources={resources}
					price={3}
					item={road("l", 0)}
					icon="/assets/road-l.svg"
					text="L road ($3)"
				/>
				<StoreItem
					resources={resources}
					price={5}
					item={road("t", 0)}
					icon="/assets/road-t.svg"
					text="T road ($5)"
				/>
				<StoreItem
					resources={resources}
					price={8}
					item={road("plus", 0)}
					icon="/assets/road-plus.svg"
					text="Crossroad ($8)"
				/>
				<button
					type="button"
					disabled={randomDisabled}
					title={`Random road tile (cost: ${randomDisplayPrice}${blackFriday ? " — Black Friday!" : ""}${rapidInflation ? " — Rapid Inflation!" : ""})`}
					onClick={() => {
						if (!randomDisabled) setShowRandomConfirm(true);
					}}
					style={
						randomDisabled
							? { opacity: 0.4, pointerEvents: "none" as const }
							: undefined
					}
				>
					<img src="/assets/question.svg" alt="random tile icon" title={`Random road tile (cost: ${randomDisplayPrice})`} />
					<span>{randomDisplayPrice}</span>
				</button>
			</div>
			<div id="canal-tiles" className="substore">
				<StoreItem
					resources={resources}
					price={3}
					item={canal("straight", 0)}
					icon="/assets/canal-straight.svg"
					text="Water canal straight (2×1)"
					iconStyle={{ width: 48, height: 24 }}
				/>
				<StoreItem
					resources={resources}
					price={3}
					item={canal("corner", 0)}
					icon="/assets/canal-corner.svg"
					text="Water canal corner (1×1)"
					iconStyle={{ transform: "rotate(180deg)" }}
				/>
			</div>
			<div
				id="production-tiles"
				className="substore"
				style={
					giftPending || lbPending
						? {
								opacity: 0.5,
								pointerEvents: "none" as const,
							}
						: undefined
				}
			>
				<StoreItem
					resources={resources}
					price={5}
					item={{
						type_: "production",
						production: "dollar",
						level: 1,
					}}
					icon="/assets/dollar-1.svg"
					text="+1 gold production (5 gold)"
					showGoldBars={{ iconCount: 1 }}
				/>
				<StoreItem
					resources={resources}
					price={15}
					item={{
						type_: "production",
						production: "dollar",
						level: 2,
					}}
					icon="/assets/dollar-2.svg"
					text="+2 gold production (15 gold)"
					showGoldBars={{ iconCount: 2 }}
				/>
				<StoreItem
					resources={resources}
					price={30}
					item={{
						type_: "production",
						production: "dollar",
						level: 3,
					}}
					icon="/assets/dollar-3.svg"
					text="+3 gold production (30 gold)"
					showGoldBars={{ iconCount: 3 }}
				/>
			</div>
		</div>
	);
}
