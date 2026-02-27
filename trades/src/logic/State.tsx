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
	type TileKey,
	toKey,
} from "./Game";
import { match, P } from "ts-pattern";

export type TurnDirection = "cw" | "ccw";

export type State = {
	game: Game;
	selected: Tilable | null;
	pendingRotation: RoadRotation | null;
	/** When set, user must choose CW or CCW to apply the turn action on this tile. */
	pendingTurn: { x: number; y: number } | null;
	/** Last random tile rolled this turn; after undo, buying random again gives this same tile. */
	lastRandomRoll: Tilable | null;
	history: State[];
};

const initialState = (): State => ({
	game: game(),
	selected: null,
	pendingRotation: null,
	pendingTurn: null,
	lastRandomRoll: null,
	history: [],
});

export type Action =
	| { type: "SELECT_TILE"; payload: Tilable }
	| { type: "UNSELECT_TILE" }
	| { type: "SET_ROTATION"; payload: RoadRotation | null }
	| { type: "UNDO" }
	| { type: "END_TURN" }
	| { type: "BUY_ITEM"; payload: { item: Tilable; price: number } }
	| { type: "SET_PENDING_TURN"; payload: { x: number; y: number } }
	| { type: "CLEAR_PENDING_TURN" }
	| { type: "TURN_TILE"; payload: { x: number; y: number; direction: TurnDirection } }
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

	// Helper to save state to history (only for actions that change the game state)
	const shouldSaveToHistory = (action: Action): boolean => {
		return !["SELECT_TILE", "UNSELECT_TILE", "SET_ROTATION", "SET_PENDING_TURN", "CLEAR_PENDING_TURN", "UNDO"].includes(action.type);
	};

	// Save current state to history before making changes (except for non-game-changing actions)
	const historyState = shouldSaveToHistory(action) 
		? [...state.history.slice(-19), { ...state, history: [] }] // Keep last 20 states
		: state.history;

	// Handle UNDO first
	if (action.type === "UNDO") {
		if (historyState.length === 0) {
			return state;
		}
		const previousState = historyState[historyState.length - 1];
		return {
			...previousState,
			history: historyState.slice(0, -1),
		};
	}

	return match(action)
		.with({ type: "SELECT_TILE" }, (action) => {
			const newState = {
				...state,
				selected: action.payload,
				pendingRotation: action.payload.type_ === "road" ? null : null,
			};
			return {
				...newState,
				history: historyState,
			};
		})
		.with({ type: "UNSELECT_TILE" }, () => ({
			...state,
			selected: null,
			pendingRotation: null,
			pendingTurn: null,
			history: historyState,
		}))
		.with({ type: "SET_PENDING_TURN" }, (action) => ({
			...state,
			pendingTurn: action.payload,
			history: historyState,
		}))
		.with({ type: "CLEAR_PENDING_TURN" }, () => ({
			...state,
			pendingTurn: null,
			history: historyState,
		}))
		.with({ type: "SET_ROTATION" }, (action) => {
			if (!state.selected || state.selected.type_ !== "road") {
				return { ...state, history: historyState };
			}
			const rotatedTile: Tilable = {
				...state.selected,
				rotation: action.payload ?? 0,
			};
			return {
				...state,
				selected: rotatedTile,
				pendingRotation: action.payload,
				history: historyState,
			};
		})
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
				selected: null,
				pendingRotation: null,
				pendingTurn: null,
				lastRandomRoll: null,
				history: historyState,
			};
		})
		.with({ type: "BUY_ITEM" }, (action) => {
			const { item, price } = action.payload;
			const isRandomTile =
				item.type_ === "road" && item.road === "plus" && price === 5;
			const purchasedItem: Tilable = isRandomTile
				? state.lastRandomRoll ??
					road(
						ROAD_TYPES[Math.floor(Math.random() * ROAD_TYPES.length)],
						ROAD_ROTATIONS[
							Math.floor(Math.random() * ROAD_ROTATIONS.length)
						],
					)
				: item;

			const user = state.game.users[state.game.turn];
			if (user.resources.dollar < price) {
				return state;
			}

			if (user.inventory[toKey(purchasedItem)] === undefined) {
				return state;
			}

			// For random tile: save state with lastRandomRoll set to this result so undo restores it
			const historyForRandom = isRandomTile
				? [...state.history.slice(-19), { ...state, history: [], lastRandomRoll: purchasedItem }]
				: historyState;

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
				lastRandomRoll: isRandomTile ? null : state.lastRandomRoll,
				history: historyForRandom,
			};
		})
		.with({ type: "TURN_TILE" }, (action) => {
			const { x, y, direction } = action.payload;
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

			const delta = direction === "cw" ? 90 : -90;
			const newRotation = ((tile.content.rotation + delta + 360) % 360) as RoadRotation;

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
							rotation: newRotation,
						},
					},
				},
			};

			return {
				...state,
				game: updateUserProduction(updatedGame, tile.owner),
				pendingTurn: null,
				history: historyState,
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
					history: historyState,
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
				history: historyState,
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

			// For roads, find any road of the same type (any rotation) in inventory
			let inventoryKey: TileKey;
			let inventoryCount: number;
			
			if (tile.type_ === "road") {
				// Find any road of the same type with any rotation
				const roadType = tile.road;
				inventoryKey = ROAD_ROTATIONS
					.map((rotation) => `road:${roadType}:${rotation}` as TileKey)
					.find((key) => user.inventory[key] > 0) as TileKey | undefined;
				
				if (!inventoryKey || user.inventory[inventoryKey] <= 0) {
					console.log(`Not enough ${roadType} road tiles in inventory`);
					return state;
				}
				inventoryCount = user.inventory[inventoryKey] - 1;
			} else {
				// For non-roads, use the exact tile key
				inventoryKey = toKey(tile);
				if (user.inventory[inventoryKey] <= 0) {
					console.log(`Not enough ${toKey(tile)} tiles in inventory`);
					return state;
				}
				inventoryCount = user.inventory[inventoryKey] - 1;
			}

			const updatedGame = {
				...state.game,
				users: {
					...state.game.users,
					[user.color]: {
						...user,
						inventory: {
							...user.inventory,
							[inventoryKey]: inventoryCount,
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

			// Check if there are more roads of the same type available (for keeping selection)
			const hasMoreRoads = tile.type_ === "road" 
				? ROAD_ROTATIONS.some((rotation) => {
					const key = `road:${tile.road}:${rotation}` as TileKey;
					return user.inventory[key] > (key === inventoryKey ? 1 : 0);
				})
				: inventoryCount > 0;

			return {
				...state,
				game: updateUserProduction(updatedGame, user.color),
				selected: hasMoreRoads ? tile : null,
				pendingRotation: null,
				history: historyState,
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
