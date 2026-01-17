// context/GlobalContext.tsx
import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";
import {
	calculateUserProduction,
	game,
	next,
	ROAD_ROTATIONS,
	ROAD_TYPES,
	RESOURCE_TYPES,
	road,
	type Tilable,
	zero,
	type Game,
	type RoadRotation,
	toKey,
} from "./Game";
import { match, P } from "ts-pattern";

export type State = {
	game: Game;
	selected: Tilable | null;
};

const initialState = (): State => ({
	game: game(),
	selected: null,
});

export type Action =
	| { type: "SELECT_TILE"; payload: Tilable }
	| { type: "UNSELECT_TILE" }
	| { type: "END_TURN" }
	| { type: "BUY_ITEM"; payload: { item: Tilable; price: number } }
	| { type: "TURN_TILE"; payload: { x: number; y: number } }
	| { type: "BLOCK_TILE"; payload: { x: number; y: number } }
	| { type: "UNBLOCK_TILE"; payload: { x: number; y: number } }
	| { type: "TOLL_TILE"; payload: { x: number; y: number } }
	| { type: "PLACE_TILE"; payload: { x: number; y: number; tile: Tilable } };

export const reducer = (state: State, action: Action): State => {
	const updateUserProduction = (gameState: Game, owner: Game["turn"]) => ({
		...gameState,
		users: {
			...gameState.users,
			[owner]: {
				...gameState.users[owner],
				production: calculateUserProduction(gameState, owner),
			},
		},
	});

	return match(action)
		.with({ type: "SELECT_TILE" }, (action) => ({
			...state,
			selected: action.payload,
		}))
		.with({ type: "UNSELECT_TILE" }, () => ({
			...state,
			selected: null,
		}))
		.with({ type: "END_TURN" }, () => {
			const currentTurn = state.game.turn;
			const updatedProduction = calculateUserProduction(state.game, currentTurn);

			return {
				...state,
				game: {
					...state.game,
					turn: next(currentTurn),
					turns: state.game.turns + 1,
					users: {
						...state.game.users,
						[currentTurn]: {
							...state.game.users[currentTurn],
							production: updatedProduction,
							resources: {
								...state.game.users[currentTurn].resources,
								...RESOURCE_TYPES.reduce((acc, resource) => {
									acc[resource] =
										state.game.users[currentTurn].resources[resource] +
										updatedProduction[resource];
									return acc;
								}, zero()),
							},
						},
					},
				},
			};
		})
		.with({ type: "BUY_ITEM" }, (action) => {
			const { item, price } = action.payload;
			const purchasedItem =
				item.type_ === "road" && item.road === "plus" && price === 5
					? road(
							ROAD_TYPES[Math.floor(Math.random() * ROAD_TYPES.length)],
							ROAD_ROTATIONS[
								Math.floor(Math.random() * ROAD_ROTATIONS.length)
							],
						)
					: item;
			const user = state.game.users[state.game.turn];
			console.log(user);
			if (user.resources.dollar < price) {
				console.log("Not enough money");
				return state;
			}

			if (user.inventory[toKey(purchasedItem)] === undefined) {
				console.error("Item not in inventory");
				return state;
			}

			return {
				...state,
				game: {
					...state.game,
					users: {
						...state.game.users,
						[user.color]: {
							...user,
							inventory: {
								...user.inventory,
								[toKey(purchasedItem)]:
									user.inventory[toKey(purchasedItem)] + 1,
							},
							resources: {
								...user.resources,
								dollar: user.resources.dollar - price,
							},
						},
					},
				},
			};
		})
		.with({ type: "TURN_TILE" }, (action) => {
			const { x, y } = action.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];

			if (!tile.owned) {
				console.log("Tile is free");
				return state;
			}
			if (tile.content.type_ !== "road") {
				console.log("Tile is not a road");
				return state;
			}
			if (user.inventory["action:turn"] <= 0) {
				console.log("Not enough turns");
				return state;
			}

			const updatedGame = {
				...state.game,
				users: {
					...state.game.users,
					[user.color]: {
						...user,
						inventory: {
							...user.inventory,
							"action:turn": user.inventory["action:turn"] - 1,
						},
					},
				},
				tiles: {
					...state.game.tiles,
					[`${y}-${x}`]: {
						...tile,
						content: {
							...tile.content,
							rotation: ((tile.content.rotation + 90) % 360) as RoadRotation,
						},
					},
				},
			};

			return {
				...state,
				game: updateUserProduction(updatedGame, tile.owner),
			};
		})
		.with(
			P.union({ type: "BLOCK_TILE" }, { type: "UNBLOCK_TILE" }),
			(action) => {
				const { x, y } = action.payload;
				const user = state.game.users[state.game.turn];
				const tile = state.game.tiles[`${y}-${x}`];

				if (!tile.owned) {
					console.log("Tile is free");
					return state;
				}
				if (tile.content.type_ !== "road") {
					console.log("Tile is not a road");
					return state;
				}
				if (tile.content.blocked && action.type === "BLOCK_TILE") {
					console.log("Tile is already blocked");
					return state;
				}
				if (!tile.content.blocked && user.inventory["action:block"] <= 0) {
					console.log("Not enough block actions");
					return state;
				}

				if (!tile.content.blocked && action.type === "UNBLOCK_TILE") {
					console.log("Tile is not blocked");
					return state;
				}
				if (tile.content.blocked && user.inventory["action:unblock"] <= 0) {
					console.log("Not enough unblock actions");
					return state;
				}

				const inventoryKey =
					action.type === "BLOCK_TILE" ? "action:block" : "action:unblock";
				const updatedGame = {
					...state.game,
					users: {
						...state.game.users,
						[user.color]: {
							...user,
							inventory: {
								...user.inventory,
								[inventoryKey]: user.inventory[inventoryKey] - 1,
							},
						},
					},
					tiles: {
						...state.game.tiles,
						[`${y}-${x}`]: {
							...tile,
							content: {
								...tile.content,
								blocked: action.type === "BLOCK_TILE",
							},
						},
					},
				};

				return {
					...state,
					game: updateUserProduction(updatedGame, tile.owner),
				};
			},
		)
		.with({ type: "TOLL_TILE" }, (action) => {
			const { x, y } = action.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];

			if (!tile.owned) {
				console.log("Tile is free");
				return state;
			}
			if (tile.content.type_ !== "road") {
				console.log("Tile is not a road");
				return state;
			}
			if (tile.content.toll && user.inventory["action:toll"] <= 0) {
				console.log("Not enough toll actions");
				return state;
			}

			return {
				...state,
				game: {
					...state.game,
					users: {
						...state.game.users,
						[user.color]: {
							...user,
							inventory: {
								...user.inventory,
								"action:toll": user.inventory["action:toll"] - 1,
							},
						},
					},
					tiles: {
						...state.game.tiles,
						[`${y}-${x}`]: {
							...tile,
							content: {
								...tile.content,
								toll: !tile.content.toll,
							},
						},
					},
				},
			};
		})
		.with({ type: "PLACE_TILE" }, (action) => {
			const { x, y, tile } = action.payload;
			const user = state.game.users[state.game.turn];
			const currentTile = state.game.tiles[`${y}-${x}`];

			if (!currentTile.owned) {
				console.log("Tile is not owned");
				return state;
			}
			if (currentTile.owner !== user.color) {
				console.log("Tile is not owned by user");
				return state;
			}
			if (user.inventory[toKey(tile)] <= 0) {
				console.log(`Not enough ${toKey(tile)} tiles in inventory`);
				return state;
			}

			const updatedGame = {
				...state.game,
				users: {
					...state.game.users,
					[user.color]: {
						...user,
						inventory: {
							...user.inventory,
							[toKey(tile)]: user.inventory[toKey(tile)] - 1,
						},
					},
				},
				tiles: {
					...state.game.tiles,
					[`${y}-${x}`]: {
						x,
						y,
						content: tile,
						owned: true,
						owner: user.color,
					},
				},
			};

			return {
				...state,
				game: updateUserProduction(updatedGame, user.color),
				selected: user.inventory[toKey(tile)] > 1 ? tile : null,
			};
		})
		.exhaustive();
};

type GlobalContextType = {
	state: State;
	dispatch: Dispatch<Action>;
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
	const [state, dispatch] = useReducer(reducer, initialState());

	return (
		<GlobalContext.Provider value={{ state, dispatch }}>
			{children}
		</GlobalContext.Provider>
	);
};

export const useGlobalContext = () => {
	const context = useContext(GlobalContext);
	if (!context) {
		throw new Error("useGlobalContext must be used within a GlobalProvider");
	}
	return context;
};
