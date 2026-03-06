import { reducer, type Action, type State } from "./engine";
import {
	type ActionType,
	ACTION_TYPES,
	isRoadEligibleForCustoms,
	type OwnedTile,
	type ProductionLevel,
	PRODUCTION_LEVELS,
	type ProductionType,
	RESOURCE_TYPES,
	type RoadRotation,
	ROAD_ROTATIONS,
	type RoadType,
	ROAD_TYPES,
	road,
	toTilable,
	type TileKey,
	type Tilable,
} from "./Game";

const RANDOM_TEST_PRODUCTION_TYPES = RESOURCE_TYPES.filter(
	(production): production is Exclude<ProductionType, "steel" | "coal"> =>
		production !== "steel" && production !== "coal",
);

const actionTile = (action: ActionType): Tilable => ({
	type_: "action",
	action,
});

const productionTile = (
	production: ProductionType,
	level: ProductionLevel,
): Tilable => ({
	type_: "production",
	production,
	level,
});

const roadTile = (roadType: RoadType, rotation: RoadRotation): Tilable =>
	road(roadType, rotation);

function buyCandidates(): Action[] {
	const moves: Action[] = [];
	for (const action of ACTION_TYPES) {
		moves.push({
			type: "BUY_ITEM",
			payload: { item: actionTile(action), price: 5 },
		});
	}
	for (const road of ROAD_TYPES) {
		const price = road === "i" ? 2 : road === "l" ? 3 : road === "t" ? 5 : 8;
		moves.push({
			type: "BUY_ITEM",
			payload: { item: roadTile(road, 0), price },
		});
	}
	// Random road buy in UI is represented as plus with price 5.
	moves.push({
		type: "BUY_ITEM",
		payload: { item: roadTile("plus", 0), price: 5 },
	});
	for (const production of RANDOM_TEST_PRODUCTION_TYPES) {
		for (const level of PRODUCTION_LEVELS) {
			const price = level === 1 ? 5 : level === 2 ? 15 : 30;
			moves.push({
				type: "BUY_ITEM",
				payload: { item: productionTile(production, level), price },
			});
		}
	}
	return moves;
}

function placeCandidates(state: State): Action[] {
	const owner = state.game.turn;
	const user = state.game.users[owner];
	const moves: Action[] = [];
	const ownedTileCoords = Object.values(state.game.tiles)
		.filter((tile) => tile.owned && tile.owner === owner)
		.map((tile) => ({ x: tile.x, y: tile.y }));

	const inventoryKeys = Object.entries(user.inventory)
		.filter(([, count]) => count > 0)
		.map(([key]) => key as TileKey);

	for (const key of inventoryKeys) {
		const tile = toTilable(key);
		for (const { x, y } of ownedTileCoords) {
			moves.push({
				type: "PLACE_TILE",
				payload: { x, y, tile },
			});
		}
	}
	return moves;
}

function roadActionCandidates(state: State): Action[] {
	const owner = state.game.turn;
	const user = state.game.users[owner];
	const ownRoadTiles = Object.values(state.game.tiles).filter(
		(tile): tile is OwnedTile & { content: { type_: "road"; customs: boolean } } =>
			tile.owned === true && tile.owner === owner && tile.content.type_ === "road",
	);
	const moves: Action[] = [];

	for (const tile of ownRoadTiles) {
		moves.push({ type: "TOLL_TILE", payload: { x: tile.x, y: tile.y } });
		moves.push({ type: "BLOCK_TILE", payload: { x: tile.x, y: tile.y } });
		moves.push({ type: "UNBLOCK_TILE", payload: { x: tile.x, y: tile.y } });
		if (
			!tile.content.customs &&
			(user.inventory["action:customs"] ?? 0) > 0 &&
			isRoadEligibleForCustoms(state.game, tile)
		) {
			moves.push({ type: "CUSTOMS_TILE", payload: { x: tile.x, y: tile.y } });
		}
		for (const rotation of ROAD_ROTATIONS.filter(
			(value): value is 90 | 180 | 270 => value !== 0,
		)) {
			moves.push({
				type: "TURN_TILE",
				payload: { x: tile.x, y: tile.y, rotation },
			});
		}
	}

	return moves;
}

export function allCandidateMoves(state: State): Action[] {
	const base: Action[] = [{ type: "END_TURN" }];
	if (state.showEventCard) {
		base.push({ type: "DISMISS_EVENT_CARD" });
	}
	base.push(...buyCandidates());
	base.push(...placeCandidates(state));
	base.push(...roadActionCandidates(state));
	return base;
}

export function listViableMoves(state: State): Action[] {
	const viable: Action[] = [];
	for (const action of allCandidateMoves(state)) {
		const next = reducer(state, action);
		if (next !== state) {
			viable.push(action);
		}
	}
	return viable;
}
