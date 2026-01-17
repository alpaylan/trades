import { match, P } from "ts-pattern";
import {
	type AccessibleDirections,
	accessibleDirections,
	type AccessibleTile,
	CITY_HALLS,
	type Tile as TileType,
} from "../logic/Game";
import { useGlobalContext } from "../logic/State";

function directionMatch(
	directions: AccessibleDirections,
	accessible: AccessibleTile,
): boolean {
	return (
		(directions.up && accessible.up) ||
		(directions.bottom && accessible.bottom) ||
		(directions.right && accessible.right) ||
		(directions.left && accessible.left)
	);
}

function notInCenter(accessible: AccessibleTile): boolean {
	for (const cityHall of CITY_HALLS) {
		const x = cityHall[0];
		const y = cityHall[1];
		if (
			(accessible.x === x + 1 && accessible.y === y) ||
			(accessible.x === x - 1 && accessible.y === y) ||
			(accessible.y === y + 1 && accessible.x === x) ||
			(accessible.y === y - 1 && accessible.x === x)
		) {
			return false; // Tile is in the center
		}
	}

	return true;
}

export default function Tile({
	tile,
	accessible,
}: {
	tile: TileType;
	accessible: AccessibleTile | null;
}) {
	const { state, dispatch } = useGlobalContext();

	if (!tile.owned) {
		return (
			<button
				type="button"
				className="tile"
				title="Free tile"
				style={{
					backgroundColor: "white",
					width: "32px",
					height: "32px",
				}}
				id={`tile-${tile.y}-${tile.x}`}
			/>
		);
	}

	const tooltip = match(tile.content)
		.with({ type_: "empty" }, () => `Empty tile (owner: ${tile.owner})`)
		.with({ type_: "hall" }, (content) => `City hall (level ${content.level})`)
		.with(
			{ type_: "road" },
			(content) =>
				`Road (${content.road}) - rotation ${content.rotation}°` +
				(content.blocked ? " - blocked" : "") +
				(content.toll ? " - toll enabled" : ""),
		)
		.with(
			{ type_: "production" },
			(content) =>
				`Production (${content.production}) - level ${content.level}`,
		)
		.otherwise(() => "Tile");

	const accessibleAndFree =
		accessible &&
		state.selected &&
		((state.selected.type_ === "road" &&
			directionMatch(accessibleDirections(state.selected), accessible)) ||
			(state.selected.type_ === "production" && notInCenter(accessible)));

	return (
		<button
			className={`tile ${accessibleAndFree ? "pulsing" : ""}`}
			type="button"
			title={tooltip}
			style={{
				backgroundColor: tile.owner,
				opacity: tile.content.type_ === "hall" ? 1 : 0.6,
				width: "32px",
				height: "32px",
				padding: "0px",
				margin: "0px",
				position: "relative",
			}}
			id={`tile-${tile.y}-${tile.x}`}
			onClick={() => {
				if (state.selected) {
					match(state.selected)
						.with({ type_: "action" }, (tile_) => {
							// apply the action to the tile
							if (tile.content.type_ === "road") {
								match(tile_.action)
									.with("turn", () => {
										dispatch({
											type: "TURN_TILE",
											payload: { x: tile.x, y: tile.y },
										});
									})
									.with("block", () => {
										dispatch({
											type: "BLOCK_TILE",
											payload: { x: tile.x, y: tile.y },
										});
									})
									.with("unblock", () => {
										dispatch({
											type: "UNBLOCK_TILE",
											payload: { x: tile.x, y: tile.y },
										});
									})
									.with("toll", () => {
										dispatch({
											type: "TOLL_TILE",
											payload: { x: tile.x, y: tile.y },
										});
									})
									.exhaustive();
							} else {
								console.log("Tile is not a road, cannot apply action");
							}
						})
						.with(
							P.union({ type_: "road" }, { type_: "production" }),
							(tile_) => {
								if (accessibleAndFree) {
									dispatch({
										type: "PLACE_TILE",
										payload: { x: tile.x, y: tile.y, tile: tile_ },
									});
								}
							},
						)
						.exhaustive();
				}
			}}
		>
			{match(tile.content)
				.with({ type_: "empty" }, () => <></>)
				.with({ type_: "road" }, (tile) => (
					<>
						<img
							src={`src/assets/road-${tile.road}.svg`}
							alt={`${tile.road} icon`}
							style={{
								width: "32px",
								height: "32px",
								transform: `rotate(${tile.rotation}deg)`,
							}}
						/>
						{tile.blocked ? (
							<img
								src="src/assets/block.svg"
								alt="blocked icon"
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "32px",
									height: "32px",
									opacity: 0.85,
									pointerEvents: "none",
								}}
							/>
						) : null}
					</>
				))
				.with({ type_: "production" }, (tile) => (
					<img
						src={`src/assets/${tile.production}-${tile.level}.svg`}
						alt={`${tile.production} icon`}
						style={{ width: "32px", height: "32px" }}
					/>
				))
				.otherwise(() => (
					<></>
				))}
		</button>
	);
}
