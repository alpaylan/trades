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
	type TileOwner,
	toKey,
} from "./Game";
import { match, P } from "ts-pattern";

export type TurnDirection = "cw" | "ccw";

const TILE_OWNERS: TileOwner[] = ["green", "orange", "blue", "red"];

const initialEndedThisRound = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

type PurchasedThisTurn = Record<
	TileOwner,
	Partial<Record<TileKey, number>>
>;

const initialPurchasedThisTurn = (): PurchasedThisTurn => ({
	green: {},
	orange: {},
	blue: {},
	red: {},
});

const initialGiftReceivedThisRound = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

export type State = {
	game: Game;
	selected: Tilable | null;
	pendingRotation: RoadRotation | null;
	/** When set, user must choose CW or CCW to apply the turn action on this tile. */
	pendingTurn: { x: number; y: number } | null;
	/** Last random tile rolled this turn; after undo, buying random again gives this same tile. */
	lastRandomRoll: Tilable | null;
	/** How many actions the current player has used in this turn (max 2). */
	actionsUsedThisTurn: number;
	/** Whether a player has ended their participation in the current round. */
	endedThisRound: Record<TileOwner, boolean>;
	/** Items bought during the current turn of each player that haven't been used yet. */
	purchasedThisTurn: PurchasedThisTurn;
	/** Remaining event cards in the deck (starts at 10, decreases each round). */
	eventCardsRemaining: number;
	/** When remaining hits this number (1–5), show "End of Phase 1" card. */
	eventCardTriggerPosition: number;
	/** TODO: Remove after testing. No Road card shows on this one of first 3 draws (1, 2, or 3). */
	noRoadTestPosition: 1 | 2 | 3;
	/** Whether the event card overlay is currently visible. */
	showEventCard: boolean;
	/** Content of the drawn event card. */
	eventCardContent: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift";
	/** When true, round has ended and we're showing the event card; production runs on dismiss. */
	pendingRoundEnd: boolean;
	/** Event effects active for the current round. */
	activeEventEffects: { noRoad: boolean; blackFriday: boolean; gift: boolean };
	/** Which players have received their free action tile this round (Gift card). */
	giftReceivedThisRound: Record<TileOwner, boolean>;
	/** Last event card drawn (shown next to deck after dismiss). null until first card. */
	lastDrawnEventCard: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" | null;
	history: State[];
};

const randomTriggerPosition = () =>
	Math.floor(Math.random() * 5) + 1;

const initialState = (): State => ({
	game: game(),
	selected: null,
	pendingRotation: null,
	pendingTurn: null,
	lastRandomRoll: null,
	actionsUsedThisTurn: 0,
	endedThisRound: initialEndedThisRound(),
	purchasedThisTurn: initialPurchasedThisTurn(),
	eventCardsRemaining: 25,
	eventCardTriggerPosition: randomTriggerPosition(),
	noRoadTestPosition: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
	showEventCard: false,
	eventCardContent: "blank",
	pendingRoundEnd: false,
	activeEventEffects: { noRoad: false, blackFriday: false, gift: false },
	giftReceivedThisRound: initialGiftReceivedThisRound(),
	lastDrawnEventCard: null,
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
	| { type: "TURN_TILE"; payload: { x: number; y: number; direction?: TurnDirection; rotation?: 90 | 180 | 270 } }
	| { type: "BLOCK_TILE"; payload: { x: number; y: number } }
	| { type: "UNBLOCK_TILE"; payload: { x: number; y: number } }
	| { type: "TOLL_TILE"; payload: { x: number; y: number } }
	| { type: "PLACE_TILE"; payload: { x: number; y: number; tile: Tilable } }
	| { type: "DISMISS_EVENT_CARD" }
	| { type: "SHOW_EVENT_CARD_PREVIEW" };

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
		return !["SELECT_TILE", "UNSELECT_TILE", "SET_ROTATION", "SET_PENDING_TURN", "CLEAR_PENDING_TURN", "DISMISS_EVENT_CARD", "UNDO"].includes(action.type);
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
			const actionsUsedThisTurn = state.actionsUsedThisTurn;

			// If player ends turn without any actions, they are done for this round
			const endedThisRound =
				actionsUsedThisTurn === 0
					? {
							...state.endedThisRound,
							[currentTurn]: true,
						}
					: state.endedThisRound;

			const allEndedThisRound = TILE_OWNERS.every(
				(owner) => endedThisRound[owner],
			);

			const purchasedClearedForCurrent: PurchasedThisTurn = {
				...state.purchasedThisTurn,
				[currentTurn]: {},
			};

			// Helper: find next player this round who has not ended yet
			const findNextActiveTurn = (from: TileOwner): TileOwner => {
				let candidate = next(from);
				for (let i = 0; i < TILE_OWNERS.length; i += 1) {
					if (!endedThisRound[candidate]) {
						return candidate;
					}
					candidate = next(candidate);
				}
				return candidate;
			};

			// If all players ended this round: show event card first; production runs on dismiss
			if (allEndedThisRound) {
				const baseGame = state.game;
				const newEventCards = Math.max(0, state.eventCardsRemaining - 1);
				const drawCard = state.eventCardsRemaining > 0;
				// TODO: Remove test overrides after testing. 2=Gift, 3=BlackFriday, 4=NoRoad, 5=EndOfPhase1
				const cardIndex = 26 - state.eventCardsRemaining;
				const eventCardContent: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" =
					!drawCard
						? "blank"
						: cardIndex === 2
							? "gift"
							: cardIndex === 3
								? "black_friday"
								: cardIndex === 4
									? "no_road"
									: cardIndex === 5
										? "end_of_phase_1"
										: newEventCards === state.eventCardTriggerPosition
											? "end_of_phase_1"
											: "blank";

				// No card to draw: apply production and advance immediately
				if (!drawCard) {
					const nextRound = (baseGame.round ?? 1) + 1;
					const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];
					const newUsers: typeof baseGame.users = { ...baseGame.users };
					for (const owner of TILE_OWNERS) {
						const user = baseGame.users[owner];
						const production = calculateUserProduction(baseGame, owner);
						const addedResources = RESOURCE_TYPES.reduce(
							(acc, resource) => {
								acc[resource] = user.resources[resource] + production[resource];
								return acc;
							},
							zero(),
						);
						newUsers[owner] = {
							...user,
							production,
							resources: { ...user.resources, ...addedResources },
						};
					}
					return {
						...state,
						game: {
							...baseGame,
							turn: roundStarter,
							turns: baseGame.turns + 1,
							round: nextRound,
							users: newUsers,
						},
						selected: null,
						pendingRotation: null,
						pendingTurn: null,
						lastRandomRoll: null,
						actionsUsedThisTurn: 0,
						endedThisRound: initialEndedThisRound(),
						purchasedThisTurn: initialPurchasedThisTurn(),
						eventCardsRemaining: newEventCards,
						activeEventEffects: { noRoad: false, blackFriday: false, gift: false },
						giftReceivedThisRound: initialGiftReceivedThisRound(),
						history: historyState,
					};
				}

				return {
					...state,
					game: baseGame,
					selected: null,
					pendingRotation: null,
					pendingTurn: null,
					lastRandomRoll: null,
					actionsUsedThisTurn: 0,
					endedThisRound,
					purchasedThisTurn: purchasedClearedForCurrent,
					eventCardsRemaining: newEventCards,
					showEventCard: true,
					eventCardContent,
					pendingRoundEnd: true,
					history: historyState,
				};
			}

			// Otherwise stay in the same round and move to the next player
			const nextTurn = findNextActiveTurn(currentTurn);

			return {
				...state,
				game: {
					...state.game,
					turn: nextTurn,
					turns: state.game.turns + 1,
				},
				selected: null,
				pendingRotation: null,
				pendingTurn: null,
				lastRandomRoll: null,
					actionsUsedThisTurn: 0,
				endedThisRound,
				purchasedThisTurn: purchasedClearedForCurrent,
				history: historyState,
			};
		})
		.with({ type: "BUY_ITEM" }, (action) => {
			const { item, price } = action.payload;
			const user = state.game.users[state.game.turn];
			const giftPending =
				state.activeEventEffects?.gift &&
				!state.giftReceivedThisRound?.[user.color];
			const isFreeActionTile =
				item.type_ === "action" && giftPending;
			const effectivePrice = isFreeActionTile
				? 0
				: state.activeEventEffects?.blackFriday
					? Math.max(0, price - 1)
					: price;
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
			// Enforce per-turn action limit (max 2)
			if (state.actionsUsedThisTurn >= 2) {
				return state;
			}

			if (user.resources.dollar < effectivePrice) {
				return state;
			}

			if (user.inventory[toKey(purchasedItem)] === undefined) {
				return state;
			}

			const key = toKey(purchasedItem);
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const updatedUserPurchased: Partial<Record<TileKey, number>> = {
				...userPurchased,
				[key]: (userPurchased[key] ?? 0) + 1,
			};
			const purchasedThisTurn: PurchasedThisTurn = {
				...state.purchasedThisTurn,
				[user.color]: updatedUserPurchased,
			};

			const giftReceivedThisRound =
				isFreeActionTile
					? { ...state.giftReceivedThisRound, [user.color]: true }
					: state.giftReceivedThisRound;

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
								dollar: user.resources.dollar - effectivePrice,
							},
						},
					},
				},
				lastRandomRoll: isRandomTile ? null : state.lastRandomRoll,
				actionsUsedThisTurn: state.actionsUsedThisTurn + 1,
				purchasedThisTurn,
				giftReceivedThisRound,
				history: historyForRandom,
			};
		})
		.with({ type: "TURN_TILE" }, (action) => {
			const { x, y, direction, rotation } = action.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			const inventoryKey = "action:turn" as TileKey;
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;

			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
				return state;
			}

			if (!tile.owned) {
				return state;
			}
			if (tile.content.type_ !== "road") {
				return state;
			}
			if (tile.content.road === "plus") {
				return state;
			}
			if (user.inventory["action:turn"] <= 0) {
				return state;
			}

			const newRotation: RoadRotation =
				rotation !== undefined
					? rotation
					: ((tile.content.rotation + (direction === "ccw" ? -90 : 90) + 360) % 360) as RoadRotation;

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

			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = {
					...userPurchased,
				};
				if (remaining > 0) {
					updatedUserPurchased[inventoryKey] = remaining;
				} else {
					delete updatedUserPurchased[inventoryKey];
				}
				purchasedThisTurn = {
					...state.purchasedThisTurn,
					[user.color]: updatedUserPurchased,
				};
			}

			return {
				...state,
				game: updateUserProduction(updatedGame, tile.owner),
				actionsUsedThisTurn: fromPurchaseThisTurn
					? state.actionsUsedThisTurn
					: actionsUsed + 1,
				purchasedThisTurn,
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
				const actionsUsed = state.actionsUsedThisTurn;

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
				const userPurchased = state.purchasedThisTurn[user.color] ?? {};
				const fromPurchaseThisTurn =
					(userPurchased[inventoryKey] ?? 0) > 0;

				if (!fromPurchaseThisTurn && actionsUsed >= 2) {
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

				let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
				if (fromPurchaseThisTurn) {
					const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
					const updatedUserPurchased: Partial<Record<TileKey, number>> = {
						...userPurchased,
					};
					if (remaining > 0) {
						updatedUserPurchased[inventoryKey] = remaining;
					} else {
						delete updatedUserPurchased[inventoryKey];
					}
					purchasedThisTurn = {
						...state.purchasedThisTurn,
						[user.color]: updatedUserPurchased,
					};
				}

				return {
					...state,
					game: updateUserProduction(updatedGame, tile.owner),
					actionsUsedThisTurn: fromPurchaseThisTurn
						? state.actionsUsedThisTurn
						: actionsUsed + 1,
					purchasedThisTurn,
					history: historyState,
				};
			},
		)
		.with({ type: "TOLL_TILE" }, (action) => {
			const { x, y } = action.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];

			const actionsUsed = state.actionsUsedThisTurn;
			const inventoryKey = "action:toll" as TileKey;
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn =
				(userPurchased[inventoryKey] ?? 0) > 0;

			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
				return state;
			}

			if (!tile.owned) {
				return state;
			}
			if (tile.owner !== user.color) {
				return state;
			}
			if (tile.content.type_ !== "road") {
				return state;
			}
			if (tile.content.toll) {
				return state;
			}
			if (user.inventory["action:toll"] <= 0) {
				return state;
			}

			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = {
					...userPurchased,
				};
				if (remaining > 0) {
					updatedUserPurchased[inventoryKey] = remaining;
				} else {
					delete updatedUserPurchased[inventoryKey];
				}
				purchasedThisTurn = {
					...state.purchasedThisTurn,
					[user.color]: updatedUserPurchased,
				};
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
								toll: 1,
							},
						},
					},
				},
				actionsUsedThisTurn: fromPurchaseThisTurn
					? state.actionsUsedThisTurn
					: actionsUsed + 1,
				purchasedThisTurn,
				history: historyState,
			};
		})
		.with({ type: "PLACE_TILE" }, (action) => {
			const { x, y, tile } = action.payload;
			const user = state.game.users[state.game.turn];
			const currentTile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;

			if (!currentTile.owned) {
				return state;
			}
			if (currentTile.owner !== user.color) {
				return state;
			}
			if (tile.type_ === "road" && state.activeEventEffects?.noRoad) {
				return state;
			}

			// For roads, find any road of the same type (any rotation) in inventory
			let inventoryKey: TileKey;
			let inventoryCount: number;
			
			if (tile.type_ === "road") {
				// Find any road of the same type with any rotation
				const roadType = tile.road;
				const foundKey = ROAD_ROTATIONS
					.map((rotation) => `road:${roadType}:${rotation}` as TileKey)
					.find((key) => user.inventory[key] > 0);
				
				if (!foundKey || user.inventory[foundKey] <= 0) {
					console.log(`Not enough ${roadType} road tiles in inventory`);
					return state;
				}
				inventoryKey = foundKey;
				inventoryCount = user.inventory[foundKey] - 1;
			} else {
				// For non-roads, use the exact tile key
				inventoryKey = toKey(tile);
				if (user.inventory[inventoryKey] <= 0) {
					console.log(`Not enough ${toKey(tile)} tiles in inventory`);
					return state;
				}
				inventoryCount = user.inventory[inventoryKey] - 1;
			}

			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn =
				(userPurchased[inventoryKey] ?? 0) > 0;

			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
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

			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = {
					...userPurchased,
				};
				if (remaining > 0) {
					updatedUserPurchased[inventoryKey] = remaining;
				} else {
					delete updatedUserPurchased[inventoryKey];
				}
				purchasedThisTurn = {
					...state.purchasedThisTurn,
					[user.color]: updatedUserPurchased,
				};
			}

			return {
				...state,
				game: updateUserProduction(updatedGame, user.color),
				selected: hasMoreRoads ? tile : null,
				pendingRotation: null,
				actionsUsedThisTurn: fromPurchaseThisTurn
					? state.actionsUsedThisTurn
					: actionsUsed + 1,
				purchasedThisTurn,
				history: historyState,
			};
		})
		.with({ type: "DISMISS_EVENT_CARD" }, () => {
			if (!state.pendingRoundEnd) {
				return {
					...state,
					showEventCard: false,
					eventCardContent: "blank",
					history: historyState,
				};
			}
			// Apply production (card effect applied here when we have more card types) and advance round
			const baseGame = state.game;
			const nextRound = (baseGame.round ?? 1) + 1;
			const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];

			const newUsers: typeof baseGame.users = { ...baseGame.users };
			for (const owner of TILE_OWNERS) {
				const user = baseGame.users[owner];
				const production = calculateUserProduction(baseGame, owner);
				const addedResources = RESOURCE_TYPES.reduce(
					(acc, resource) => {
						acc[resource] =
							user.resources[resource] + production[resource];
						return acc;
					},
					zero(),
				);
				newUsers[owner] = {
					...user,
					production,
					resources: {
						...user.resources,
						...addedResources,
					},
				};
			}

			const activeEventEffects = {
				noRoad: state.eventCardContent === "no_road",
				blackFriday: state.eventCardContent === "black_friday",
				gift: state.eventCardContent === "gift",
			};

			return {
				...state,
				game: {
					...baseGame,
					turn: roundStarter,
					turns: baseGame.turns + 1,
					round: nextRound,
					users: newUsers,
				},
				selected: null,
				pendingRotation: null,
				pendingTurn: null,
				lastRandomRoll: null,
				actionsUsedThisTurn: 0,
				endedThisRound: initialEndedThisRound(),
				purchasedThisTurn: initialPurchasedThisTurn(),
				showEventCard: false,
				eventCardContent: "blank",
				pendingRoundEnd: false,
				activeEventEffects,
				giftReceivedThisRound: initialGiftReceivedThisRound(),
				lastDrawnEventCard: state.eventCardContent,
				history: historyState,
			};
		})
		.with({ type: "SHOW_EVENT_CARD_PREVIEW" }, (): State => {
			const card = state.lastDrawnEventCard;
			if (
				card === "end_of_phase_1" ||
				card === "no_road" ||
				card === "black_friday" ||
				card === "gift"
			) {
				return {
					...state,
					showEventCard: true,
					eventCardContent: card,
					pendingRoundEnd: false,
				};
			}
			return state;
		})
		.exhaustive() as State;
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
