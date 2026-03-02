import { match, P } from "ts-pattern";
import {
	accessibleDirections,
	accessibleFreeTiles,
	calculateUserProduction,
	CITY_HALLS,
	game,
	next,
	ROAD_ROTATIONS,
	RESOURCE_TYPES,
	type Game,
	type RoadRotation,
	type TileKey,
	type TileOwner,
	type Tilable,
	toKey,
	zero,
} from "./Game";

export type TurnDirection = "cw" | "ccw";

const TILE_OWNERS: TileOwner[] = ["green", "orange", "blue", "red"];

const initialEndedThisRound = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

type PurchasedThisTurn = Record<TileOwner, Partial<Record<TileKey, number>>>;

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

function directionMatch(
	directions: ReturnType<typeof accessibleDirections>,
	accessible: ReturnType<typeof accessibleFreeTiles>[number],
): boolean {
	return (
		(directions.up && accessible.up) ||
		(directions.bottom && accessible.bottom) ||
		(directions.right && accessible.right) ||
		(directions.left && accessible.left)
	);
}

function notInCenter(x: number, y: number): boolean {
	for (const [hallX, hallY] of CITY_HALLS) {
		if (
			(x === hallX + 1 && y === hallY) ||
			(x === hallX - 1 && y === hallY) ||
			(y === hallY + 1 && x === hallX) ||
			(y === hallY - 1 && x === hallX)
		) {
			return false;
		}
	}
	return true;
}

export type State = {
	game: Game;
	selected: Tilable | null;
	pendingRotation: RoadRotation | null;
	pendingTurn: { x: number; y: number } | null;
	lastRandomRoll: Tilable | null;
	actionsUsedThisTurn: number;
	endedThisRound: Record<TileOwner, boolean>;
	purchasedThisTurn: PurchasedThisTurn;
	eventCardsRemaining: number;
	eventCardTriggerPosition: number;
	noRoadTestPosition: 1 | 2 | 3;
	showEventCard: boolean;
	eventCardContent: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" | "lucky_streak" | "labor_revolt" | "rapid_inflation" | "structural_collapse" | "safe_passage" | "broken_logistics";
	pendingRoundEnd: boolean;
	activeEventEffects: { noRoad: boolean; blackFriday: boolean; gift: boolean; luckyStreak: boolean; laborRevolt: boolean; rapidInflation: boolean; safePassage: boolean; brokenLogistics: boolean };
	giftReceivedThisRound: Record<TileOwner, boolean>;
	lastDrawnEventCard: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" | "lucky_streak" | "labor_revolt" | "rapid_inflation" | "structural_collapse" | "safe_passage" | "broken_logistics" | null;
	randomTilePurchasedThisTurn: boolean;
	diceRoll: { active: boolean } | null;
	history: State[];
};

const randomTriggerPosition = () => Math.floor(Math.random() * 5) + 1;

export const initialState = (): State => ({
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
	activeEventEffects: { noRoad: false, blackFriday: false, gift: false, luckyStreak: false, laborRevolt: false, rapidInflation: false, safePassage: false, brokenLogistics: false },
	giftReceivedThisRound: initialGiftReceivedThisRound(),
	lastDrawnEventCard: null,
	randomTilePurchasedThisTurn: false,
	diceRoll: null,
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
	| { type: "SHOW_EVENT_CARD_PREVIEW" }
	| { type: "START_DICE_ROLL"; payload: { price: number } }
	| { type: "FINISH_DICE_ROLL"; payload: { tile: Tilable | null } };

export const UI_ONLY_ACTION_TYPES: Action["type"][] = [
	"SELECT_TILE",
	"UNSELECT_TILE",
	"SET_ROTATION",
	"SET_PENDING_TURN",
	"CLEAR_PENDING_TURN",
	"SHOW_EVENT_CARD_PREVIEW",
];

export const AUTHORITATIVE_ACTION_TYPES: Action["type"][] = [
	"END_TURN",
	"BUY_ITEM",
	"TURN_TILE",
	"BLOCK_TILE",
	"UNBLOCK_TILE",
	"TOLL_TILE",
	"PLACE_TILE",
	"DISMISS_EVENT_CARD",
];

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

	const shouldSaveToHistory = (innerAction: Action): boolean => {
		return ![
			"SELECT_TILE",
			"UNSELECT_TILE",
			"SET_ROTATION",
			"SET_PENDING_TURN",
			"CLEAR_PENDING_TURN",
			"DISMISS_EVENT_CARD",
			"UNDO",
		].includes(innerAction.type);
	};

	const historyState = shouldSaveToHistory(action)
		? [...state.history.slice(-19), { ...state, history: [] }]
		: state.history;

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
		.with({ type: "SELECT_TILE" }, (innerAction) => {
			const newState = {
				...state,
				selected: innerAction.payload,
				pendingRotation: innerAction.payload.type_ === "road" ? null : null,
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
		.with({ type: "SET_PENDING_TURN" }, (innerAction) => ({
			...state,
			pendingTurn: innerAction.payload,
			history: historyState,
		}))
		.with({ type: "CLEAR_PENDING_TURN" }, () => ({
			...state,
			pendingTurn: null,
			history: historyState,
		}))
		.with({ type: "SET_ROTATION" }, (innerAction) => {
			if (!state.selected || state.selected.type_ !== "road") {
				return { ...state, history: historyState };
			}
			const rotatedTile: Tilable = {
				...state.selected,
				rotation: innerAction.payload ?? 0,
			};
			return {
				...state,
				selected: rotatedTile,
				pendingRotation: innerAction.payload,
				history: historyState,
			};
		})
		.with({ type: "END_TURN" }, () => {
			const currentTurn = state.game.turn;
			const actionsUsedThisTurn = state.actionsUsedThisTurn;
			const endedThisRound =
				actionsUsedThisTurn === 0
					? {
							...state.endedThisRound,
							[currentTurn]: true,
						}
					: state.endedThisRound;
			const allEndedThisRound = TILE_OWNERS.every((owner) => endedThisRound[owner]);
			const purchasedClearedForCurrent: PurchasedThisTurn = {
				...state.purchasedThisTurn,
				[currentTurn]: {},
			};
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

			if (allEndedThisRound) {
				const baseGame = state.game;
				const newEventCards = Math.max(0, state.eventCardsRemaining - 1);
				const drawCard = state.eventCardsRemaining > 0;
				const cardIndex = 26 - state.eventCardsRemaining;
				const eventCardContent: State["eventCardContent"] =
					!drawCard
						? "blank"
						: cardIndex === 1
							? "structural_collapse"
							: cardIndex === 2
								? "broken_logistics"
								: cardIndex === 3
									? "labor_revolt"
									: cardIndex === 4
										? "no_road"
										: cardIndex === 5
											? "end_of_phase_1"
											: cardIndex === 6
												? "gift"
												: cardIndex === 7
													? "black_friday"
													: cardIndex === 8
														? "lucky_streak"
														: cardIndex === 9
															? "safe_passage"
															: cardIndex === 10
															? "rapid_inflation"
															: cardIndex === 15
															? "end_of_phase_1"
															: newEventCards === state.eventCardTriggerPosition
																? "end_of_phase_1"
																: "blank";

				if (!drawCard) {
					const nextRound = (baseGame.round ?? 1) + 1;
					const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];
					const newUsers: typeof baseGame.users = { ...baseGame.users };
					for (const owner of TILE_OWNERS) {
						const user = baseGame.users[owner];
						const production = calculateUserProduction(baseGame, owner);
						const addedResources = RESOURCE_TYPES.reduce((acc, resource) => {
							acc[resource] = user.resources[resource] + production[resource];
							return acc;
						}, zero());
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
						randomTilePurchasedThisTurn: false,
						endedThisRound: initialEndedThisRound(),
						purchasedThisTurn: initialPurchasedThisTurn(),
						eventCardsRemaining: newEventCards,
						activeEventEffects: { noRoad: false, blackFriday: false, gift: false, luckyStreak: false, laborRevolt: false, rapidInflation: false, safePassage: false, brokenLogistics: false },
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
					randomTilePurchasedThisTurn: false,
					endedThisRound,
					purchasedThisTurn: purchasedClearedForCurrent,
					eventCardsRemaining: newEventCards,
					showEventCard: true,
					eventCardContent,
					pendingRoundEnd: true,
					history: historyState,
				};
			}

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
				randomTilePurchasedThisTurn: false,
				endedThisRound,
				purchasedThisTurn: purchasedClearedForCurrent,
				history: historyState,
			};
		})
		.with({ type: "BUY_ITEM" }, (innerAction) => {
			const { item, price } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const giftPending = state.activeEventEffects?.gift && !state.giftReceivedThisRound?.[user.color];
			const isFreeActionTile = item.type_ === "action" && giftPending;
			const inflation = state.activeEventEffects?.rapidInflation ? 2 : 0;
			const effectivePrice = isFreeActionTile ? 0 : state.activeEventEffects?.blackFriday ? Math.max(0, price - 1) : price + inflation;
			const purchasedItem: Tilable = item;
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
			const giftReceivedThisRound = isFreeActionTile ? { ...state.giftReceivedThisRound, [user.color]: true } : state.giftReceivedThisRound;

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
								[toKey(purchasedItem)]: user.inventory[toKey(purchasedItem)] + 1,
							},
							resources: {
								...user.resources,
								dollar: user.resources.dollar - effectivePrice,
							},
						},
					},
				},
				actionsUsedThisTurn: state.actionsUsedThisTurn + 1,
				purchasedThisTurn,
				giftReceivedThisRound,
				history: historyState,
			};
		})
		.with({ type: "TURN_TILE" }, (innerAction) => {
			const { x, y, direction, rotation } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			const inventoryKey = "action:turn" as TileKey;
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;
			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
				return state;
			}
			if (!tile.owned || tile.content.type_ !== "road" || tile.content.road === "plus") {
				return state;
			}
			if (user.inventory["action:turn"] <= 0) {
				return state;
			}

			const newRotation: RoadRotation = rotation !== undefined ? rotation : ((tile.content.rotation + (direction === "ccw" ? -90 : 90) + 360) % 360) as RoadRotation;
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
						content: { ...tile.content, rotation: newRotation },
					},
				},
			};

			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = { ...userPurchased };
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
				actionsUsedThisTurn: fromPurchaseThisTurn ? state.actionsUsedThisTurn : actionsUsed + 1,
				purchasedThisTurn,
				pendingTurn: null,
				history: historyState,
			};
		})
		.with(P.union({ type: "BLOCK_TILE" }, { type: "UNBLOCK_TILE" }), (innerAction) => {
			const { x, y } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			if (!tile.owned || tile.content.type_ !== "road") {
				return state;
			}
			if (innerAction.type === "BLOCK_TILE" && state.activeEventEffects?.safePassage) {
				return state;
			}
			if (innerAction.type === "UNBLOCK_TILE" && state.activeEventEffects?.brokenLogistics) {
				return state;
			}
			if (tile.content.blocked && innerAction.type === "BLOCK_TILE") {
				return state;
			}
			if (!tile.content.blocked && user.inventory["action:block"] <= 0) {
				return state;
			}
			if (!tile.content.blocked && innerAction.type === "UNBLOCK_TILE") {
				return state;
			}
			if (tile.content.blocked && user.inventory["action:unblock"] <= 0) {
				return state;
			}
			const inventoryKey = innerAction.type === "BLOCK_TILE" ? "action:block" : "action:unblock";
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;
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
						content: { ...tile.content, blocked: innerAction.type === "BLOCK_TILE" },
					},
				},
			};
			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = { ...userPurchased };
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
				actionsUsedThisTurn: fromPurchaseThisTurn ? state.actionsUsedThisTurn : actionsUsed + 1,
				purchasedThisTurn,
				history: historyState,
			};
		})
		.with({ type: "TOLL_TILE" }, (innerAction) => {
			const { x, y } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			const inventoryKey = "action:toll" as TileKey;
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;
			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
				return state;
			}
			if (!tile.owned || tile.owner !== user.color || tile.content.type_ !== "road" || tile.content.toll || user.inventory["action:toll"] <= 0) {
				return state;
			}

			let purchasedThisTurn: PurchasedThisTurn = state.purchasedThisTurn;
			if (fromPurchaseThisTurn) {
				const remaining = (userPurchased[inventoryKey] ?? 0) - 1;
				const updatedUserPurchased: Partial<Record<TileKey, number>> = { ...userPurchased };
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
							inventory: { ...user.inventory, "action:toll": user.inventory["action:toll"] - 1 },
						},
					},
					tiles: {
						...state.game.tiles,
						[`${y}-${x}`]: {
							...tile,
							content: { ...tile.content, toll: 1 },
						},
					},
				},
				actionsUsedThisTurn: fromPurchaseThisTurn ? state.actionsUsedThisTurn : actionsUsed + 1,
				purchasedThisTurn,
				history: historyState,
			};
		})
		.with({ type: "PLACE_TILE" }, (innerAction) => {
			const { x, y, tile } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const currentTile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			if (
				!currentTile.owned ||
				currentTile.owner !== user.color ||
				currentTile.content.type_ !== "empty"
			) {
				return state;
			}
			const accessible = accessibleFreeTiles(state.game, user).find(
				(t) => t.x === x && t.y === y,
			);
			if (!accessible) {
				return state;
			}
			if (tile.type_ === "road") {
				if (!directionMatch(accessibleDirections(tile), accessible)) {
					return state;
				}
			} else if (tile.type_ === "production") {
				if (!notInCenter(x, y)) {
					return state;
				}
			} else {
				return state;
			}
			if (tile.type_ === "road" && state.activeEventEffects?.noRoad) {
				return state;
			}

			let inventoryKey: TileKey;
			let inventoryCount: number;
			if (tile.type_ === "road") {
				const roadType = tile.road;
				inventoryKey = ROAD_ROTATIONS
					.map((rotation) => `road:${roadType}:${rotation}` as TileKey)
					.find((key) => user.inventory[key] > 0) as TileKey | undefined as TileKey;
				if (!inventoryKey || user.inventory[inventoryKey] <= 0) {
					return state;
				}
				inventoryCount = user.inventory[inventoryKey] - 1;
			} else {
				inventoryKey = toKey(tile);
				if (user.inventory[inventoryKey] <= 0) {
					return state;
				}
				inventoryCount = user.inventory[inventoryKey] - 1;
			}

			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;
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
				actionsUsedThisTurn: fromPurchaseThisTurn ? state.actionsUsedThisTurn : actionsUsed + 1,
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
			const baseGame = state.game;
			const nextRound = (baseGame.round ?? 1) + 1;
			const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];
			const newUsers: typeof baseGame.users = { ...baseGame.users };
			const laborRevoltActive = state.eventCardContent === "labor_revolt";
			const structuralCollapseActive = state.eventCardContent === "structural_collapse";
			for (const owner of TILE_OWNERS) {
				const user = baseGame.users[owner];
				const production = calculateUserProduction(baseGame, owner);
				const addedResources = RESOURCE_TYPES.reduce((acc, resource) => {
					const base = production[resource];
					const effective = structuralCollapseActive ? 0 : laborRevoltActive ? Math.floor(base * 0.6) : base;
					acc[resource] = user.resources[resource] + effective;
					return acc;
				}, zero());
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
				luckyStreak: state.eventCardContent === "lucky_streak",
				laborRevolt: state.eventCardContent === "labor_revolt",
				rapidInflation: state.eventCardContent === "rapid_inflation",
				safePassage: state.eventCardContent === "safe_passage",
				brokenLogistics: state.eventCardContent === "broken_logistics",
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
				randomTilePurchasedThisTurn: false,
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
		.with({ type: "SHOW_EVENT_CARD_PREVIEW" }, () => {
			if (!state.lastDrawnEventCard || state.lastDrawnEventCard === "blank") {
				return state;
			}
			return {
				...state,
				showEventCard: true,
				eventCardContent: state.lastDrawnEventCard as Exclude<State["eventCardContent"], "blank">,
				pendingRoundEnd: false,
			};
		})
		.with({ type: "START_DICE_ROLL" }, (innerAction) => {
			const { price } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const inflation = state.activeEventEffects?.rapidInflation ? 2 : 0;
			const effectivePrice = state.activeEventEffects?.blackFriday ? Math.max(0, price - 1) : price + inflation;
			if (state.actionsUsedThisTurn >= 2) return state;
			if (user.resources.dollar < effectivePrice) return state;
			return {
				...state,
				game: {
					...state.game,
					users: {
						...state.game.users,
						[user.color]: {
							...user,
							resources: {
								...user.resources,
								dollar: user.resources.dollar - effectivePrice,
							},
						},
					},
				},
				actionsUsedThisTurn: state.actionsUsedThisTurn + 1,
				randomTilePurchasedThisTurn: true,
				diceRoll: { active: true },
				history: [],
			};
		})
		.with({ type: "FINISH_DICE_ROLL" }, (innerAction) => {
			const { tile } = innerAction.payload;
			if (!state.diceRoll?.active) return state;
			if (!tile) {
				return { ...state, diceRoll: null };
			}
			const user = state.game.users[state.game.turn];
			const key = toKey(tile);
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const updatedUserPurchased: Partial<Record<TileKey, number>> = {
				...userPurchased,
				[key]: (userPurchased[key] ?? 0) + 1,
			};
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
								[key]: (user.inventory[key] ?? 0) + 1,
							},
						},
					},
				},
				purchasedThisTurn: {
					...state.purchasedThisTurn,
					[user.color]: updatedUserPurchased,
				},
				diceRoll: null,
			};
		})
		.exhaustive() as State;
};
