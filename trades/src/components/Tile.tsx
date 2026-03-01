import { match, P } from "ts-pattern";
import {
	type AccessibleDirections,
	accessibleDirections,
	type AccessibleTile,
	CITY_HALLS,
	ROAD_ROTATIONS,
	type Tile as TileType,
	type TileKey,
	toKey,
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
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const ended = state.endedThisRound[current];
	const canStartAction = actionsUsed < 2 && !ended;
	const purchasedForUser = state.purchasedThisTurn[current] ?? {};

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
		.with({ type_: "empty" }, () =>
			state.selected?.type_ === "road" &&
			accessible &&
			state.activeEventEffects?.noRoad
				? "Road placement disabled (No Road event)"
				: `Empty tile (owner: ${tile.owner})`,
		)
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

	let canClick = false;
	if (!ended && state.selected) {
		if (canStartAction) {
			canClick = true;
		} else {
			let purchasedCount = 0;
			if (state.selected.type_ === "road") {
				// Any rotation of this road type bought this turn allows placement after 2 actions
				for (const rotation of ROAD_ROTATIONS) {
					const key = `road:${state.selected.road}:${rotation}` as TileKey;
					purchasedCount += purchasedForUser[key] ?? 0;
				}
			} else if (state.selected.type_ === "action") {
				purchasedCount = purchasedForUser[`action:${state.selected.action}` as TileKey] ?? 0;
			} else {
				const key = toKey(state.selected);
				purchasedCount = purchasedForUser[key] ?? 0;
			}
			canClick = purchasedCount > 0;
		}
		// Toll action: only roads in player's region, without toll yet
		if (
			state.selected.type_ === "action" &&
			state.selected.action === "toll"
		) {
			canClick =
				canClick &&
				tile.content.type_ === "road" &&
				tile.owner === current &&
				!tile.content.toll;
		}
		// No Road event: cannot place road tiles this round
		if (
			state.selected.type_ === "road" &&
			accessibleAndFree &&
			state.activeEventEffects?.noRoad
		) {
			canClick = false;
		}
		// Gift event: must take free action tile first; disable all board actions
		if (
			state.activeEventEffects?.gift &&
			!state.giftReceivedThisRound?.[current]
		) {
			canClick = false;
		}
	}

	return (
		<button
			className={`tile ${accessibleAndFree ? "pulsing" : ""}`}
			type="button"
			disabled={!canClick}
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
				if (!canClick) {
					return;
				}
				if (state.selected) {
					match(state.selected)
						.with({ type_: "action" }, (tile_) => {
							// apply the action to the tile
							const content = tile.owned ? tile.content : null;
							if (content?.type_ === "road") {
								match(tile_.action)
									.with("turn", () => {
										if (content.road === "plus") return;
										if (content.road === "i") {
											dispatch({
												type: "TURN_TILE",
												payload: { x: tile.x, y: tile.y, direction: "cw" },
											});
											return;
										}
										if (content.road === "l" || content.road === "t") {
											dispatch({
												type: "SET_PENDING_TURN",
												payload: { x: tile.x, y: tile.y },
											});
										}
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
							src={`/assets/road-${tile.road}.svg`}
							alt={`${tile.road} icon`}
							style={{
								width: "32px",
								height: "32px",
								transform: `rotate(${tile.rotation}deg)`,
							}}
						/>
						{tile.blocked ? (
							<img
								src="/assets/block.svg"
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
						{tile.toll ? (
							<span
								style={{
									position: "absolute",
									top: 2,
									right: 2,
									width: 6,
									height: 6,
									borderRadius: "50%",
									backgroundColor: "#c62828",
									pointerEvents: "none",
								}}
								aria-hidden="true"
							/>
						) : null}
					</>
				))
				.with({ type_: "production" }, (content) =>
					content.production === "dollar" ? (
						<span
							style={{
								position: "absolute",
								inset: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								backgroundColor: "white",
								border: "2px solid #1e1e1e",
								borderRadius: 3,
								boxSizing: "border-box",
							}}
						>
							<span
								style={{
									display: "flex",
									flexWrap: "wrap",
									alignItems: "center",
									justifyContent: "center",
									gap: 1,
								}}
							>
								{Array.from({ length: content.level }, (_, i) => (
									<img
										key={i}
										src="/assets/gold-bar.svg"
										alt=""
										style={{ width: 12, height: 6 }}
										aria-hidden="true"
									/>
								))}
							</span>
						</span>
					) : (
						<img
							src={`/assets/${content.production}-${content.level}.svg`}
							alt={`${content.production} icon`}
							style={{ width: "32px", height: "32px" }}
						/>
					),
				)
				.otherwise(() => (
					<></>
				))}
		</button>
	);
}
