import { type ResourceCollection, type Tilable, road } from "../logic/Game";
import { useGlobalContext } from "../logic/State";

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
}: {
	resources: ResourceCollection;
	price: number;
	item: Tilable;
	icon: string;
	text: string;
	showGoldBars?: { iconCount: number };
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const canAct = actionsUsed < 2;
	const blackFriday = state.activeEventEffects?.blackFriday ?? false;
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];
	const isFreeActionTile = item.type_ === "action" && giftPending;
	const displayPrice =
		isFreeActionTile ? 0 : blackFriday ? Math.max(0, price - 1) : price;
	const tooltip = showGoldBars
		? `${text} (cost: ${displayPrice} gold${blackFriday ? " — Black Friday!" : ""}${isFreeActionTile ? " — Free gift!" : ""})`
		: `${text} (cost: ${displayPrice}${blackFriday ? " — Black Friday!" : ""}${isFreeActionTile ? " — Free gift!" : ""})`;

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
		>
			{showGoldBars ? (
				<GoldBars count={showGoldBars.iconCount} size={16} />
			) : (
				<img src={icon} alt={`${item.type_} icon`} title={tooltip} />
			)}
			<span>{displayPrice}</span>
		</button>
	);
}

export default function Store({
	resources,
}: {
	resources: ResourceCollection;
}) {
	const { state } = useGlobalContext();
	const current = state.game.turn;
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];

	return (
		<div id="store" >
			<div id="action-tiles" className="substore">
				{giftPending && (
					<div
						style={{
							width: "100%",
							padding: "6px 8px",
							marginBottom: 6,
							backgroundColor: "#fff3e0",
							border: "1px solid #ffb74d",
							borderRadius: 6,
							fontSize: 12,
							color: "#e65100",
							fontWeight: 600,
							textAlign: "center",
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
			</div>
			<div
				id="road-tiles"
				className="substore"
				style={
					giftPending
						? {
								opacity: 0.5,
								pointerEvents: "none" as const,
							}
						: undefined
				}
			>
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
				<StoreItem
					resources={resources}
					price={5}
					item={road("plus", 0)}
					icon="/assets/question.svg"
					// item={(n: number) => road(ROAD_TYPES[n], 0)}
					// icon={(n: number) => `/assets/road-${ROAD_TYPES[n]}.svg`}
					text="Random ($5)"
				/>
			</div>
			<div
				id="production-tiles"
				className="substore"
				style={
					giftPending
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
