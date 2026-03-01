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
		.with({ type_: "action" }, (tile) => `${tile.action} icon`)
		.with({ type_: "road" }, (tile) => `${tile.road} icon`)
		.with({ type_: "production" }, (tile) => `${tile.production} icon`)
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
				style={{ padding: 0, border: "none", background: "none" }}
			>
				{isGoldProduction ? (
					<GoldBars count={tile.level} size={16} />
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

export default function Inventory({
	inventory,
}: {
	inventory: InventoryType;
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const ended = state.endedThisRound[current];
	const canStartAction = actionsUsed < 2 && !ended;
	const purchasedForUser = state.purchasedThisTurn[current] ?? {};
	const giftPending =
		state.activeEventEffects?.gift &&
		!state.giftReceivedThisRound?.[current];
	return (
		<div
			id="inventory"
			style={
				giftPending
					? { opacity: 0.5, pointerEvents: "none" as const }
					: undefined
			}
		>
			{Object.keys(inventory)
				.map((tileKey) => [tileKey, toTilable(tileKey as TileKey)] as const)
				.map(
					([tileKey, tile], index) =>
						inventory[tileKey as TileKey] > 0 && (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={index}>
								<InventoryItem
									selected={
										!!(state.selected && (
											tile.type_ === "road" && state.selected.type_ === "road"
												? state.selected.road === tile.road
												: toKey(state.selected) === toKey(tile)
										))
									}
									tile={tile}
									count={inventory[tileKey as TileKey]}
									placeTile={() => {
										const key = tileKey as TileKey;
										let purchasedCount =
											purchasedForUser[key] ?? 0;
										if (tile.type_ === "road") {
											// Any rotation of this road type bought this turn counts
											purchasedCount = ROAD_ROTATIONS.reduce<number>(
												(sum, rotation) => {
													const roadKey = `road:${tile.road}:${rotation}` as TileKey;
													return (
														sum +
														(purchasedForUser[roadKey] ?? 0)
													);
												},
												0,
											);
										}
										if (
											!canStartAction &&
											purchasedCount === 0
										) {
											return;
										}

										const isSelected =
											state.selected &&
											(tile.type_ === "road" &&
											state.selected.type_ === "road"
												? state.selected.road ===
													tile.road
												: toKey(state.selected) ===
													toKey(tile));
										
										if (isSelected) {
											dispatch({
												type: "UNSELECT_TILE",
											});
										} else if (tile.type_ === "road") {
											dispatch({
												type: "SELECT_TILE",
												payload: {
													...tile,
													rotation: 0,
												},
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
						),
				)}
		</div>
	);
}
