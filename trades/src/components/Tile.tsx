import { match, P } from "ts-pattern";
import {
	type AccessibleDirections,
	accessibleDirections,
	type AccessibleTile,
	canPlaceWell,
	getCustomsGateDirection,
	hasPlayerSelectedWell,
	isRoadEligibleForCustoms,
	type TileOwner,
	CITY_HALLS,
	ROAD_ROTATIONS,
	type Tile as TileType,
	type TileKey,
	toKey,
} from "../logic/Game";
import { useGlobalContext } from "../logic/State";

const TILE_SIZE = 32;
const GATE_STRIP_THICKNESS = TILE_SIZE * 0.1; // 10% of tile

const DARK_COLOR_BY_OWNER: Record<TileOwner, string> = {
	green: "#1b5e20",
	orange: "#e65100",
	blue: "#0d47a1",
	red: "#b71c1c",
};

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
	canalAccessible,
}: {
	tile: TileType;
	accessible: AccessibleTile | null;
	canalAccessible: AccessibleTile | null;
}) {
	const { state, dispatch } = useGlobalContext();
	const current = state.game.turn;
	const actionsUsed = state.actionsUsedThisTurn ?? 0;
	const ended = state.endedThisRound[current];
	const wellSelectionMode =
		state.game.round === 1 && !hasPlayerSelectedWell(state.game, current);
	const canStartAction = actionsUsed < 2 && !ended;
	const purchasedForUser = state.purchasedThisTurn[current] ?? {};
	const userInventory = state.game.users[current]?.inventory ?? {};

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

	// Well selection (round 1): only empty tiles in own region are clickable
	const canClickWell =
		wellSelectionMode &&
		tile.owned &&
		tile.owner === current &&
		canPlaceWell(state.game, current, tile.x, tile.y);

	const tooltip = match(tile.content)
		.with({ type_: "empty" }, () =>
			canClickWell
				? "Select as your water well"
				: state.selected?.type_ === "canal" && canalAccessible
				? "Place water canal"
				: state.selected?.type_ === "road" &&
						accessible &&
						state.activeEventEffects?.noRoad
					? "Road placement disabled (No Road event)"
					: `Empty tile (owner: ${tile.owner})`,
		)
		.with({ type_: "road" }, (content) =>
			state.selected?.type_ === "action" &&
			state.selected.action === "block" &&
			!content.blocked &&
			state.activeEventEffects?.safePassage
				? "Block placement disabled (Safe Passage event)"
				: state.selected?.type_ === "action" &&
						state.selected.action === "unblock" &&
						content.blocked &&
						state.activeEventEffects?.brokenLogistics
					? "Unblock disabled (Broken Logistics event)"
					: `Road (${content.road}) - rotation ${content.rotation}°` +
						(content.blocked ? " - blocked" : "") +
						(content.toll ? " - toll enabled" : "") +
						(content.customs ? " - customs gate" : ""),
		)
		.with({ type_: "well" }, () => "Water well")
		.with({ type_: "canal" }, (content) => `Water canal (${content.canal})`)
		.with({ type_: "hall" }, (content) => `City hall (level ${content.level})`)
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

	const isStraightCanalSelected =
		state.selected?.type_ === "canal" && state.selected.canal === "straight";
	// Second cell for straight: same as road flow – from canalAccessible direction (which side canal reaches)
	const straightSecondCell =
		isStraightCanalSelected && state.selected && canalAccessible
			? (() => {
					const r = state.selected.rotation;
					if (r === 0 || r === 180)
						return canalAccessible.left
							? { x: tile.x - 1, y: tile.y }
							: { x: tile.x + 1, y: tile.y };
					return canalAccessible.up
						? { x: tile.x, y: tile.y - 1 }
						: { x: tile.x, y: tile.y + 1 };
				})()
			: null;
	const secondCellEmpty =
		!straightSecondCell ||
		(() => {
			const t = state.game.tiles[`${straightSecondCell.y}-${straightSecondCell.x}`];
			return t?.owned && t.owner === current && t.content.type_ === "empty";
		})();
	const canalAccessibleAndFree =
		canalAccessible &&
		state.selected?.type_ === "canal" &&
		directionMatch(accessibleDirections(state.selected), canalAccessible) &&
		(!isStraightCanalSelected || secondCellEmpty);

	let canClick = false;
	if (canClickWell) {
		canClick = true;
	} else if (!ended && state.selected) {
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
				// Action tiles: allow if we have any in inventory (this turn or previous)
				purchasedCount = userInventory[`action:${state.selected.action}` as TileKey] ?? 0;
			} else {
				const key = toKey(state.selected);
				purchasedCount = purchasedForUser[key] ?? 0;
			}
			canClick = purchasedCount > 0;
		}
		// Action tiles: must have at least one in inventory to click (also when canStartAction is true)
		if (state.selected.type_ === "action") {
			const actionCount = userInventory[`action:${state.selected.action}` as TileKey] ?? 0;
			canClick = canClick && actionCount > 0;
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
		// Safe Passage event: cannot place block tiles this round
		if (
			state.selected.type_ === "action" &&
			state.selected.action === "block" &&
			state.activeEventEffects?.safePassage
		) {
			canClick = false;
		}
		// Broken Logistics event: cannot use unblock tiles this round
		if (
			state.selected.type_ === "action" &&
			state.selected.action === "unblock" &&
			state.activeEventEffects?.brokenLogistics
		) {
			canClick = false;
		}
		// Customs gate: only border roads whose open side faces a neighbor (eligible for customs)
		if (
			state.selected.type_ === "action" &&
			state.selected.action === "customs"
		) {
			canClick =
				canClick &&
				tile.content.type_ === "road" &&
				tile.owner === current &&
				!tile.content.customs &&
				isRoadEligibleForCustoms(state.game, tile);
		}
		// Gift event: must take free action tile first; disable all board actions
		if (
			state.activeEventEffects?.gift &&
			!state.giftReceivedThisRound?.[current]
		) {
			canClick = false;
		}
		// Canal: require canalAccessibleAndFree and inventory
		if (state.selected.type_ === "canal") {
			canClick =
				canClick &&
				!!canalAccessibleAndFree &&
				(userInventory[toKey(state.selected)] ?? 0) > 0;
		}
	}

	return (
		<button
			className={`tile ${accessibleAndFree || canalAccessibleAndFree || canClickWell ? "pulsing" : ""}`}
			type="button"
			disabled={!canClick}
			title={tooltip}
			style={{
				backgroundColor:
					tile.content.type_ === "canal"
						? "#b0bec5"
						: tile.owner,
				opacity:
					tile.content.type_ === "canal"
						? 1
						: tile.content.type_ === "hall"
							? 1
							: 0.6,
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
				if (canClickWell) {
					dispatch({ type: "SELECT_WELL", payload: { x: tile.x, y: tile.y } });
					return;
				}
				if (canalAccessibleAndFree && state.selected?.type_ === "canal") {
					dispatch({
						type: "PLACE_TILE",
						payload: { x: tile.x, y: tile.y, tile: state.selected },
					});
					return;
				}
				if (state.selected) {
					match(state.selected)
						.with({ type_: "action" }, (tile_) => {
							// apply the action to the tile
							const content = tile.owned ? tile.content : null;
							if (content?.type_ === "road") {
								match(tile_.action)
									.with("customs", () => {
										dispatch({
											type: "CUSTOMS_TILE",
											payload: { x: tile.x, y: tile.y },
										});
									})
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
							P.union(
								{ type_: "road" },
								{ type_: "production" },
								{ type_: "canal" },
							),
							(tile_) => {
								if (accessibleAndFree || canalAccessibleAndFree) {
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
				.with({ type_: "well" }, () => (
					<span
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							pointerEvents: "none",
						}}
						aria-hidden="true"
					>
						<svg
							width={28}
							height={28}
							viewBox="0 0 32 32"
							style={{ display: "block" }}
						>
							{/* Stone well rim */}
							<circle
								cx="16"
								cy="15"
								r="10"
								fill="#6d4c41"
								stroke="#4e342e"
								strokeWidth="1.2"
							/>
							{/* Inner wall / shaft */}
							<circle
								cx="16"
								cy="15"
								r="7"
								fill="#455a64"
								stroke="#37474f"
								strokeWidth="0.6"
							/>
							{/* Water surface */}
							<circle
								cx="16"
								cy="15"
								r="5.2"
								fill="#0277bd"
							/>
							<ellipse
								cx="16"
								cy="13.8"
								rx="3.5"
								ry="1.4"
								fill="#4fc3f7"
								opacity={0.7}
							/>
							{/* Wooden beam and bucket */}
							<rect x="14" y="3" width="4" height="2.5" rx="0.5" fill="#5d4037" stroke="#3e2723" strokeWidth="0.5" />
							<line x1="16" y1="5.5" x2="16" y2="9" stroke="#5d4037" strokeWidth="1.2" strokeLinecap="round" />
							<path d="M14.2 9.2 L17.8 9.2 L17 11.5 L14 11.5 Z" fill="#6d4c41" stroke="#4e342e" strokeWidth="0.5" />
						</svg>
					</span>
				))
				.with({ type_: "road" }, (roadContent) => {
					const gateDir = roadContent.customs
						? getCustomsGateDirection(state.game, tile)
						: null;
					const gateStripStyle = gateDir
						? (() => {
								const base = {
									position: "absolute" as const,
									pointerEvents: "none" as const,
									backgroundColor: DARK_COLOR_BY_OWNER[tile.owner],
								};
								switch (gateDir) {
									case "up":
										return {
											...base,
											top: 0,
											left: 0,
											width: TILE_SIZE,
											height: GATE_STRIP_THICKNESS,
										};
									case "right":
										return {
											...base,
											right: 0,
											top: 0,
											width: GATE_STRIP_THICKNESS,
											height: TILE_SIZE,
										};
									case "bottom":
										return {
											...base,
											bottom: 0,
											left: 0,
											width: TILE_SIZE,
											height: GATE_STRIP_THICKNESS,
										};
									case "left":
										return {
											...base,
											left: 0,
											top: 0,
											width: GATE_STRIP_THICKNESS,
											height: TILE_SIZE,
										};
									default:
										return { ...base, width: 0, height: 0 };
								}
							})()
						: null;
					return (
						<>
							<img
								src={`/assets/road-${roadContent.road}.svg`}
								alt={`${roadContent.road} icon`}
								style={{
									width: "32px",
									height: "32px",
									transform: `rotate(${roadContent.rotation}deg)`,
								}}
							/>
							{roadContent.blocked ? (
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
							{roadContent.toll ? (
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
							{gateStripStyle ? (
								<span
									role="img"
									aria-label="customs gate"
									style={gateStripStyle}
								/>
							) : null}
						</>
					);
				})
				.with({ type_: "canal" }, (content) => {
					if (content.canal === "straight") {
						const rot = content.rotation;
						const isHorizontal = rot === 0 || rot === 180;
						const neighborR = state.game.tiles[`${tile.y}-${tile.x + 1}`];
						const neighborL = state.game.tiles[`${tile.y}-${tile.x - 1}`];
						const neighborB = state.game.tiles[`${tile.y + 1}-${tile.x}`];
						const neighborT = state.game.tiles[`${tile.y - 1}-${tile.x}`];
						const same = (t: typeof tile) =>
							t?.owned &&
							t.content.type_ === "canal" &&
							t.content.canal === "straight" &&
							t.content.rotation === rot;
						const isRight = isHorizontal && same(neighborL);
						const isBottom = !isHorizontal && same(neighborT);
						const showRightHalf = isHorizontal && isRight;
						const showBottomHalf = !isHorizontal && isBottom;
						return (
							<span
								style={{
									position: "absolute",
									inset: 0,
									overflow: "hidden",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									pointerEvents: "none",
								}}
							>
								<img
									src="/assets/canal-straight.svg"
									alt="canal straight"
									style={{
										width: isHorizontal ? 64 : 32,
										height: isHorizontal ? 32 : 64,
										transform: isHorizontal
											? `translateX(${showRightHalf ? -32 : 0}px)`
											: `rotate(90deg) translateY(${showBottomHalf ? -32 : 0}px)`,
									}}
								/>
							</span>
						);
					}
					return (
						<img
							src={`/assets/canal-${content.canal}.svg`}
							alt={`canal ${content.canal}`}
							style={{
								width: "32px",
								height: "32px",
								transform: `rotate(${content.rotation}deg)`,
							}}
						/>
					);
				})
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
