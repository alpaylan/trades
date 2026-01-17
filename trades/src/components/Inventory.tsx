import { match } from "ts-pattern";
import {
	type TileKey,
	toTilable,
	type Inventory as InventoryType,
	type Tilable,
	toKey,
} from "../logic/Game";
import { useGlobalContext } from "../logic/State";

function tileToIcon(tile: Tilable): string {
	switch (tile.type_) {
		case "action":
			return `src/assets/${tile.action}.svg`;
		case "road":
			return `src/assets/road-${tile.road}.svg`;
		case "production":
			return `src/assets/${tile.production}-${tile.level}.svg`;
		default:
			throw new Error("Unknown tile type");
	}
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

	return (
		<div
			className={`inventory-item ${selected ? "tilting" : ""}`}
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
				<img src={src} alt={alt} />
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
	return (
		<div id="inventory">
			{Object.keys(inventory)
				.map((tileKey) => [tileKey, toTilable(tileKey as TileKey)] as const)
				.map(
					([tileKey, tile], index) =>
						inventory[tileKey as TileKey] > 0 && (
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							<div key={index}>
								<InventoryItem
									selected={
										!!(state.selected && toKey(state.selected) === toKey(tile))
									}
									tile={tile}
									count={inventory[tileKey as TileKey]}
									placeTile={() => {
										if (
											state.selected &&
											toKey(state.selected) === toKey(tile)
										) {
											dispatch({ type: "UNSELECT_TILE" });
										} else {
											dispatch({ type: "SELECT_TILE", payload: tile });
										}
									}}
								/>
							</div>
						),
				)}
		</div>
	);
}
