import { match } from "ts-pattern";
import {
	ROAD_ROTATIONS,
	type TileKey,
	toTilable,
	type Inventory as InventoryType,
	type Tilable,
	toKey,
} from "../logic/Game";
import { useGlobalContext } from "../logic/State";

const GOLD_BAR_SRC = "/assets/gold-bar.svg";

function tileToIcon(tile: Tilable): string {
	switch (tile.type_) {
		case "action":
			return `/assets/${tile.action}.svg`;
		case "road":
			return `/assets/road-${tile.road}.svg`;
		case "production":
			return `/assets/${tile.production}-${tile.level}.svg`;
		case "canal":
			return `/assets/canal-${tile.canal}.svg`;
		default:
			throw new Error("Unknown tile type");
	}
}

function GoldBars({ count, size = 14 }: { count: number; size?: number }) {
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

function InventoryItem({
	selected,
	tile,
	count,
	placeTile,
}: {
	selected: boolean;
	tile: Tilable;
	count: number;
	placeTile: () => void;
}) {
	const src = tileToIcon(tile);
	const alt = match(tile)
		.with({ type_: "action" }, (t) => `${t.action} icon`)
		.with({ type_: "road" }, (t) => `${t.road} icon`)
		.with({ type_: "production" }, (t) => `${t.production} icon`)
		.with({ type_: "canal" }, (t) => `canal ${t.canal} icon`)
		.exhaustive();

	const isGoldProduction =
		tile.type_ === "production" && tile.production === "dollar";

	return (
		<div
			className={`inventory-item ${selected ? "tilting" : ""} ${isGoldProduction ? "inventory-item--gold" : ""}`}
			style={{
				display: "flex",
				flexDirection: "column",
				position: "relative",
			}}
		>
			<button
				type="button"
				onClick={placeTile}
				style={{
					padding: 0,
					border: "none",
					background: "none",
					display: "block",
				}}
			>
				{isGoldProduction ? (
					<GoldBars count={tile.level} size={16} />
				) : tile.type_ === "canal" && tile.canal === "straight" ? (
					<img
						src={src}
						alt={alt}
						style={{ width: 64, height: 32, display: "block" }}
					/>
				) : tile.type_ === "canal" && tile.canal === "corner" ? (
					<img
						src={src}
						alt={alt}
						style={{ display: "block", transform: "rotate(180deg)" }}
					/>
				) : (
					<img src={src} alt={alt} />
				)}
				<span
					style={{
						position: "absolute",
						top: "-4px",
						right: "-4px",
						backgroundColor: "red",
						color: "white",
						borderRadius: "999px",
						fontWeight: "bold",
						lineHeight: 1,
					}}
				>
					{count}
				</span>
			</button>
		</div>
	);
}

function getPurchasedCount(
	tile: Tilable,
	tileKey: TileKey,
	purchasedForUser: Partial<Record<TileKey, number>>,
): number {
	if (tile.type_ === "road") {
		return ROAD_ROTATIONS.reduce<number>((sum, rotation) => {
			const roadKey = `road:${tile.road}:${rotation}` as TileKey;
			return sum + (purchasedForUser[roadKey] ?? 0);
		}, 0);
	}
	return purchasedForUser[tileKey] ?? 0;
}

function InventorySection({
	items,
	disabled,
}: {
	items: { tileKey: TileKey; tile: Tilable; count: number }[];
	disabled: boolean;
}) {
	const { state, dispatch } = useGlobalContext();

	if (items.length === 0) return null;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				gap: 4,
				alignContent: "flex-start",
				...(disabled
					? { opacity: 0.35, pointerEvents: "none" as const }
					: {}),
			}}
		>
			{items.map(({ tile, count }, index) => (
				<div
					key={index}
					style={
						tile.type_ === "canal" && tile.canal === "straight"
							? { width: 72, flexShrink: 0 }
							: undefined
					}
				>
					<InventoryItem
						selected={
							!!(
								state.selected &&
								(tile.type_ === "road" &&
								state.selected.type_ === "road"
									? state.selected.road === tile.road
									: toKey(state.selected) === toKey(tile))
							)
						}
						tile={tile}
						count={count}
						placeTile={() => {
							const isSelected =
								state.selected &&
								(tile.type_ === "road" &&
								state.selected.type_ === "road"
									? state.selected.road === tile.road
									: toKey(state.selected) === toKey(tile));

							if (isSelected) {
								dispatch({ type: "UNSELECT_TILE" });
							} else if (tile.type_ === "road") {
								dispatch({
									type: "SELECT_TILE",
									payload: { ...tile, rotation: 0 },
								});
							} else {
								dispatch({
									type: "SELECT_TILE",
									payload: tile,
								});
							}
						}}
					/>
				</div>
			))}
		</div>
	);
}

export default function Inventory({
	inventory,
}: {
	inventory: InventoryType;
}) {
	const { state } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const ended = state.endedThisRound[current];
	const canStartAction = actionsUsed < 2 && !ended;
	const purchasedForUser = state.purchasedThisTurn[current] ?? {};
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];
	const noRoadActive = state.activeEventEffects?.noRoad ?? false;
	const safePassageActive = state.activeEventEffects?.safePassage ?? false;
	const brokenLogisticsActive = state.activeEventEffects?.brokenLogistics ?? false;
	const lbPending = state.activeEventEffects?.logisticBreakthrough && state.logisticBreakthroughPicks < 2;
	const speculativePending =
		state.activeEventEffects?.speculativeInvestment &&
		!state.speculativeInvestmentResolved[current];

	const allItems = Object.keys(inventory)
		.map((tileKey) => [tileKey as TileKey, toTilable(tileKey as TileKey)] as const)
		.filter(([tileKey]) => inventory[tileKey] > 0);

	const permanentItems: { tileKey: TileKey; tile: Tilable; count: number }[] = [];
	const purchasedItems: { tileKey: TileKey; tile: Tilable; count: number }[] = [];

	for (const [tileKey, tile] of allItems) {
		const totalCount = inventory[tileKey];
		const purchased = getPurchasedCount(tile, tileKey, purchasedForUser);
		const permanentCount = totalCount - purchased;

		if (permanentCount > 0) {
			permanentItems.push({ tileKey, tile, count: permanentCount });
		}
		if (purchased > 0) {
			purchasedItems.push({ tileKey, tile, count: purchased });
		}
	}

	const isItemDisabled = (tile: Tilable) => {
		if (noRoadActive && tile.type_ === "road") return true;
		if (safePassageActive && tile.type_ === "action" && tile.action === "block") return true;
		if (brokenLogisticsActive && tile.type_ === "action" && tile.action === "unblock") return true;
		if (lbPending) return true;
		if (speculativePending) return true;
		return false;
	};

	const permanentFiltered = permanentItems.map((item) => ({
		...item,
		disabled: isItemDisabled(item.tile),
	}));

	const purchasedFiltered = purchasedItems.map((item) => ({
		...item,
		disabled: isItemDisabled(item.tile),
	}));

	const hasPurchased = purchasedItems.length > 0;

	return (
		<div
			id="inventory"
			style={
				giftPending || speculativePending
					? { opacity: 0.5, pointerEvents: "none" as const }
					: undefined
			}
		>
			<InventorySection
				items={permanentFiltered.filter((i) => !i.disabled)}
				disabled={!canStartAction}
			/>
			{permanentFiltered.some((i) => i.disabled) && (
					<InventorySection
						items={permanentFiltered.filter((i) => i.disabled)}
						disabled={true}
					/>
				)}

			{hasPurchased && (
				<>
					<div
						style={{
							width: 1,
							alignSelf: "stretch",
							backgroundColor: "rgba(0,0,0,0.2)",
							margin: "0 4px",
							flexShrink: 0,
						}}
					/>
					<InventorySection
						items={purchasedFiltered.filter((i) => !i.disabled)}
						disabled={false}
					/>
					{purchasedFiltered.some((i) => i.disabled) && (
							<InventorySection
								items={purchasedFiltered.filter((i) => i.disabled)}
								disabled={true}
							/>
						)}
				</>
			)}
		</div>
	);
}
