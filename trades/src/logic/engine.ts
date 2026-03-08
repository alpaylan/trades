import { match, P } from "ts-pattern";
import {
	ACTION_TYPES,
	accessibleCanalTiles,
	accessibleDirections,
	accessibleFreeTiles,
	calculateUserProduction,
	canPlaceWell,
	findTradeRoutes,
	CITY_HALLS,
	game,
	getStraightCanalSecondCell,
	hasPlayerSelectedWell,
	owned,
	isRoadEligibleForCustoms,
	ROAD_ROTATIONS,
	RESOURCE_TYPES,
	type Game,
	type RoadRotation,
	type TileKey,
	type TileOwner,
	type OwnedTile,
	type ProductionTile,
	type Tilable,
	toKey,
	well,
	zero,
	exampleBoardScenarioGame,
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

const initialSpeculativeInvestmentResolved = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const initialBlackMarketScamsPopupShown = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const allBlackMarketScamsPopupShown = (): Record<TileOwner, boolean> => ({
	green: true,
	orange: true,
	blue: true,
	red: true,
});

const initialMerchantsLotteryResult = (): Record<TileOwner, number> => ({
	green: 0,
	orange: 0,
	blue: 0,
	red: 0,
});

const initialMerchantsLotteryPopupShown = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const allMerchantsLotteryPopupShown = (): Record<TileOwner, boolean> => ({
	green: true,
	orange: true,
	blue: true,
	red: true,
});

const initialRobinHoodTollDelta = (): Record<TileOwner, number> => ({
	green: 0,
	orange: 0,
	blue: 0,
	red: 0,
});

const initialRobinHoodTollPopupShown = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const allRobinHoodTollPopupShown = (): Record<TileOwner, boolean> => ({
	green: true,
	orange: true,
	blue: true,
	red: true,
});

const initialInternationalTradeTreatyBonus = (): Record<TileOwner, number> => ({
	green: 0,
	orange: 0,
	blue: 0,
	red: 0,
});

const initialInternationalTradeTreatyPopupShown = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const allInternationalTradeTreatyPopupShown = (): Record<TileOwner, boolean> => ({
	green: true,
	orange: true,
	blue: true,
	red: true,
});

const initialEconomicIsolationResult = (): Record<TileOwner, "none" | "paid" | "production_reduced"> => ({
	green: "none",
	orange: "none",
	blue: "none",
	red: "none",
});

const initialEconomicIsolationPopupShown = (): Record<TileOwner, boolean> => ({
	green: false,
	orange: false,
	blue: false,
	red: false,
});

const allEconomicIsolationPopupShown = (): Record<TileOwner, boolean> => ({
	green: true,
	orange: true,
	blue: true,
	red: true,
});

const ACTION_TILE_KEYS: TileKey[] = ACTION_TYPES.map((a) => `action:${a}` as TileKey);

const initialBlackMarketScamsRemoved = (): Record<TileOwner, { key: TileKey; count: number }[]> => ({
	green: [],
	orange: [],
	blue: [],
	red: [],
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
	/** Shuffled deck of 25 event cards; end_of_phase_1 is in a random position among the last 5. */
	eventCardDeck: readonly State["eventCardContent"][];
	eventCardTriggerPosition: number;
	noRoadTestPosition: 1 | 2 | 3;
	showEventCard: boolean;
	eventCardContent: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" | "lucky_streak" | "labor_revolt" | "rapid_inflation" | "structural_collapse" | "safe_passage" | "broken_logistics" | "business_as_usual" | "extended_timeline" | "bureaucratic_delay" | "logistic_breakthrough" | "market_holiday" | "supply_chain_shortage" | "material_surplus" | "speculative_investment" | "black_market_scams" | "merchants_lottery" | "robin_hoods_toll" | "reversed_currents" | "time_skip" | "international_trade_treaty" | "economic_isolation";
	pendingRoundEnd: boolean;
	activeEventEffects: { noRoad: boolean; blackFriday: boolean; gift: boolean; luckyStreak: boolean; laborRevolt: boolean; rapidInflation: boolean; safePassage: boolean; brokenLogistics: boolean; bureaucraticDelay: boolean; logisticBreakthrough: boolean; marketHoliday: boolean; supplyChainShortage: boolean; materialSurplus: boolean; speculativeInvestment: boolean; blackMarketScams: boolean; merchantsLottery: boolean; robinHoodsToll: boolean; reversedCurrent: boolean; internationalTradeTreaty: boolean; economicIsolation: boolean };
	giftReceivedThisRound: Record<TileOwner, boolean>;
	lastDrawnEventCard: "blank" | "end_of_phase_1" | "no_road" | "black_friday" | "gift" | "lucky_streak" | "labor_revolt" | "rapid_inflation" | "structural_collapse" | "safe_passage" | "broken_logistics" | "business_as_usual" | "extended_timeline" | "bureaucratic_delay" | "logistic_breakthrough" | "market_holiday" | "supply_chain_shortage" | "material_surplus" | "speculative_investment" | "black_market_scams" | "merchants_lottery" | "robin_hoods_toll" | "reversed_currents" | "time_skip" | "international_trade_treaty" | "economic_isolation" | null;
	/** Per-player list of action tiles removed by Black Market Scams (for popup). */
	blackMarketScamsRemoved: Record<TileOwner, { key: TileKey; count: number }[]>;
	/** Per-player: has the Black Market Scams loss popup been shown this round? */
	blackMarketScamsPopupShown: Record<TileOwner, boolean>;
	/** Per-player: Merchant's Lottery bonus amount (0 = did not win). */
	merchantsLotteryResult: Record<TileOwner, number>;
	/** Per-player: has the Merchant's Lottery result popup been shown this round? */
	merchantsLotteryPopupShown: Record<TileOwner, boolean>;
	/** Per-player: Robin Hood's Toll net gold change this round (positive = gained, negative = paid). */
	robinHoodTollDelta: Record<TileOwner, number>;
	/** Per-player: has the Robin Hood's Toll popup been shown this round? */
	robinHoodTollPopupShown: Record<TileOwner, boolean>;
	/** Per-player: bonus from the International Trade Treaty card (5 Gold per completed trade route). */
	internationalTradeTreatyBonus: Record<TileOwner, number>;
	/** Per-player: has the International Trade Treaty popup been shown this round? */
	internationalTradeTreatyPopupShown: Record<TileOwner, boolean>;
	/** Per-player: Economic Isolation result – "paid" = paid 3 Gold, "production_reduced" = could not pay, production −1, "none" = had trade route. */
	economicIsolationResult: Record<TileOwner, "none" | "paid" | "production_reduced">;
	/** Per-player: has the Economic Isolation popup been shown this round? */
	economicIsolationPopupShown: Record<TileOwner, boolean>;
	/** True when the currently shown card was drawn by Time Skip (so we must consume it on dismiss). */
	cardShownByTimeSkip: boolean;
	lastDrawnWasExtendedTimeline: boolean;
	speculativeInvestmentResolved: Record<TileOwner, boolean>;
	/** When set (1–2 or 5–6), player must choose which gold production to downgrade/upgrade or take free/skip. */
	speculativeInvestmentRoll: number | null;
	logisticBreakthroughPicks: number;
	randomTilePurchasedThisTurn: boolean;
	diceRoll: { active: boolean } | null;
	history: State[];
};

const randomTriggerPosition = () => Math.floor(Math.random() * 5) + 1;

const ALL_EVENT_CARDS_EXCEPT_END_OF_PHASE: State["eventCardContent"][] = [
	"black_friday",
	"extended_timeline",
	"international_trade_treaty",
	"economic_isolation",
	"time_skip",
	"reversed_currents",
	"robin_hoods_toll",
	"merchants_lottery",
	"black_market_scams",
	"speculative_investment",
	"no_road",
	"labor_revolt",
	"gift",
	"structural_collapse",
	"lucky_streak",
	"safe_passage",
	"rapid_inflation",
	"business_as_usual",
	"broken_logistics",
	"bureaucratic_delay",
	"logistic_breakthrough",
	"market_holiday",
	"supply_chain_shortage",
	"material_surplus",
];

function shuffleArray<T>(arr: T[]): T[] {
	const out = arr.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Build a deck of 25 event cards: 24 shuffled, end_of_phase_1 in a random position among the last 5. */
function buildEventCardDeck(): readonly State["eventCardContent"][] {
	const shuffled = shuffleArray(ALL_EVENT_CARDS_EXCEPT_END_OF_PHASE);
	const endOfPhaseSlot = 20 + Math.floor(Math.random() * 5);
	const deck: State["eventCardContent"][] = [];
	let j = 0;
	for (let i = 0; i < 25; i++) {
		if (i === endOfPhaseSlot) {
			deck.push("end_of_phase_1");
		} else {
			deck.push(shuffled[j++]);
		}
	}
	// Geçici: ilk 3 kartı sabit (test için): 1. black_friday, 2. extended_timeline, 3. speculative_investment
	const swap = (arr: State["eventCardContent"][], a: number, b: number) => {
		const t = arr[a];
		arr[a] = arr[b];
		arr[b] = t;
	};
	let i = deck.indexOf("black_friday");
	if (i >= 0 && i !== 0) swap(deck, 0, i);
	i = deck.indexOf("extended_timeline");
	if (i >= 0 && i !== 1) swap(deck, 1, i);
	i = deck.indexOf("speculative_investment");
	if (i >= 0 && i !== 2) swap(deck, 2, i);
	return deck;
}

const createInitialGame = (): Game => {
	if (typeof window !== "undefined") {
		try {
			const params = new URLSearchParams(window.location.search);
			const scenario = params.get("scenario");
			if (scenario === "example-board") {
				return exampleBoardScenarioGame();
			}
		} catch {
			// Ignore URL parsing issues and fall back to default game.
		}
	}
	return game();
};

export const initialState = (): State => ({
	game: createInitialGame(),
	selected: null,
	pendingRotation: null,
	pendingTurn: null,
	lastRandomRoll: null,
	actionsUsedThisTurn: 0,
	endedThisRound: initialEndedThisRound(),
	purchasedThisTurn: initialPurchasedThisTurn(),
	eventCardsRemaining: 25,
	eventCardDeck: buildEventCardDeck(),
	eventCardTriggerPosition: randomTriggerPosition(),
	noRoadTestPosition: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
	showEventCard: false,
	eventCardContent: "blank",
	pendingRoundEnd: false,
	activeEventEffects: { noRoad: false, blackFriday: false, gift: false, luckyStreak: false, laborRevolt: false, rapidInflation: false, safePassage: false, brokenLogistics: false, bureaucraticDelay: false, logisticBreakthrough: false, marketHoliday: false, supplyChainShortage: false, materialSurplus: false, speculativeInvestment: false, blackMarketScams: false, merchantsLottery: false, robinHoodsToll: false, reversedCurrent: false, internationalTradeTreaty: false, economicIsolation: false },
	giftReceivedThisRound: initialGiftReceivedThisRound(),
	lastDrawnEventCard: null,
	blackMarketScamsRemoved: initialBlackMarketScamsRemoved(),
	blackMarketScamsPopupShown: initialBlackMarketScamsPopupShown(),
	merchantsLotteryResult: initialMerchantsLotteryResult(),
	merchantsLotteryPopupShown: initialMerchantsLotteryPopupShown(),
	robinHoodTollDelta: initialRobinHoodTollDelta(),
	robinHoodTollPopupShown: initialRobinHoodTollPopupShown(),
	internationalTradeTreatyBonus: initialInternationalTradeTreatyBonus(),
	internationalTradeTreatyPopupShown: initialInternationalTradeTreatyPopupShown(),
	economicIsolationResult: initialEconomicIsolationResult(),
	economicIsolationPopupShown: initialEconomicIsolationPopupShown(),
	cardShownByTimeSkip: false,
	lastDrawnWasExtendedTimeline: false,
	logisticBreakthroughPicks: 0,
	speculativeInvestmentResolved: initialSpeculativeInvestmentResolved(),
	speculativeInvestmentRoll: null,
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
	| { type: "CUSTOMS_TILE"; payload: { x: number; y: number } }
	| { type: "PLACE_TILE"; payload: { x: number; y: number; tile: Tilable } }
	| { type: "SELECT_WELL"; payload: { x: number; y: number } }
	| { type: "DISMISS_EVENT_CARD" }
	| { type: "DISMISS_BLACK_MARKET_POPUP" }
	| { type: "DISMISS_MERCHANTS_LOTTERY_POPUP" }
	| { type: "DISMISS_ROBIN_HOODS_TOLL_POPUP" }
	| { type: "DISMISS_INTERNATIONAL_TRADE_TREATY_POPUP" }
	| { type: "DISMISS_ECONOMIC_ISOLATION_POPUP" }
	| { type: "SHOW_EVENT_CARD_PREVIEW" }
	| { type: "START_DICE_ROLL"; payload: { price: number } }
	| { type: "FINISH_DICE_ROLL"; payload: { tile: Tilable | null } }
	| { type: "SPECULATIVE_ROLL"; payload: { roll: number } }
	| {
			type: "SPECULATIVE_APPLY_CHOICE";
			payload:
				| { action: "downgrade"; x: number; y: number }
				| { action: "upgrade"; x: number; y: number }
				| { action: "free_production" }
				| { action: "skip" };
	  };

export const UI_ONLY_ACTION_TYPES: Action["type"][] = [
	"SELECT_TILE",
	"UNSELECT_TILE",
	"SET_ROTATION",
	"SET_PENDING_TURN",
	"CLEAR_PENDING_TURN",
	"SHOW_EVENT_CARD_PREVIEW",
	"DISMISS_BLACK_MARKET_POPUP",
	"DISMISS_MERCHANTS_LOTTERY_POPUP",
	"DISMISS_ROBIN_HOODS_TOLL_POPUP",
	"DISMISS_INTERNATIONAL_TRADE_TREATY_POPUP",
	"DISMISS_ECONOMIC_ISOLATION_POPUP",
];

export const AUTHORITATIVE_ACTION_TYPES: Action["type"][] = [
	"END_TURN",
	"BUY_ITEM",
	"TURN_TILE",
	"BLOCK_TILE",
	"UNBLOCK_TILE",
	"TOLL_TILE",
	"CUSTOMS_TILE",
	"PLACE_TILE",
	"SELECT_WELL",
	"DISMISS_EVENT_CARD",
	"SPECULATIVE_ROLL",
	"SPECULATIVE_APPLY_CHOICE",
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
			"SELECT_WELL",
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
		.with({ type: "SELECT_WELL" }, (innerAction) => {
			const { x, y } = innerAction.payload;
			if (state.game.round !== 1) return { ...state, history: historyState };
			const owner = state.game.turn;
			if (hasPlayerSelectedWell(state.game, owner)) return { ...state, history: historyState };
			if (!canPlaceWell(state.game, owner, x, y)) return { ...state, history: historyState };
			const key = `${y}-${x}` as `${number}-${number}`;
			return {
				...state,
				game: {
					...state.game,
					tiles: {
						...state.game.tiles,
						[key]: owned(x, y, owner, well()),
					},
				},
				selected: null,
				pendingTurn: null,
				pendingRotation: null,
				history: historyState,
			};
		})
		.with({ type: "SET_ROTATION" }, (innerAction) => {
			if (!state.selected || (state.selected.type_ !== "road" && state.selected.type_ !== "canal")) {
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
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
				return state;
			}
			if (state.activeEventEffects?.logisticBreakthrough && state.logisticBreakthroughPicks < 2) {
				return state;
			}
			if (state.game.round === 1 && !hasPlayerSelectedWell(state.game, state.game.turn)) {
				return state;
			}
			const currentTurn = state.game.turn;
			const actionsUsedThisTurn = state.actionsUsedThisTurn;
			// Pass = End Turn with 0 moves used (Actions left: 2). Only then is the player "done" for the round. If they used 1 or 2 moves they get another turn when order comes back. Once passed, stay passed.
			const passed = actionsUsedThisTurn === 0;
			const endedThisRound = {
				...state.endedThisRound,
				[currentTurn]: state.endedThisRound[currentTurn] || passed,
			};
			const allEndedThisRound = TILE_OWNERS.every((owner) => endedThisRound[owner]);
			const purchasedClearedForCurrent: PurchasedThisTurn = {
				...state.purchasedThisTurn,
				[currentTurn]: {},
			};
			const findNextActiveTurn = (from: TileOwner): TileOwner => {
				const reversed = state.activeEventEffects?.reversedCurrent ?? false;
				const step = reversed ? -1 : 1;
				let idx = TILE_OWNERS.indexOf(from);
				for (let i = 0; i < TILE_OWNERS.length; i += 1) {
					idx = (idx + step + TILE_OWNERS.length) % TILE_OWNERS.length;
					const candidate = TILE_OWNERS[idx];
					if (!endedThisRound[candidate]) {
						return candidate;
					}
				}
				return from;
			};

			if (allEndedThisRound) {
				const baseGame = state.game;
				const newEventCards = Math.max(0, state.eventCardsRemaining - 1);
				const drawCard = state.eventCardsRemaining > 0;
				const deckIndex = 25 - state.eventCardsRemaining;
				const eventCardContent: State["eventCardContent"] =
					!drawCard ? "blank" : state.eventCardDeck[deckIndex] ?? "blank";
				// Geçici sabit liste (inactive – artık eventCardDeck kullanılıyor):
				// const cardIndex = 26 - state.eventCardsRemaining;
				// eventCardContent = cardIndex===1?"black_friday": cardIndex===2?"extended_timeline": ... : newEventCards===state.eventCardTriggerPosition?"end_of_phase_1":"blank";

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
						cardShownByTimeSkip: false,
						activeEventEffects: { noRoad: false, blackFriday: false, gift: false, luckyStreak: false, laborRevolt: false, rapidInflation: false, safePassage: false, brokenLogistics: false, bureaucraticDelay: false, logisticBreakthrough: false, marketHoliday: false, supplyChainShortage: false, materialSurplus: false, speculativeInvestment: false, blackMarketScams: false, merchantsLottery: false, robinHoodsToll: false, reversedCurrent: false, internationalTradeTreaty: false, economicIsolation: false },
						giftReceivedThisRound: initialGiftReceivedThisRound(),
						speculativeInvestmentResolved: initialSpeculativeInvestmentResolved(),
						speculativeInvestmentRoll: null,
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
			if (state.activeEventEffects?.marketHoliday) return state;
			const { item, price } = innerAction.payload;
			if (state.activeEventEffects?.supplyChainShortage && item.type_ === "road") return state;
			const user = state.game.users[state.game.turn];
			const giftPending = state.activeEventEffects?.gift && !state.giftReceivedThisRound?.[user.color];
			const isFreeActionTile = item.type_ === "action" && giftPending;
			const lbPending = state.activeEventEffects?.logisticBreakthrough && state.logisticBreakthroughPicks < 2;
			const isFreeRoadTile = item.type_ === "road" && lbPending;
			const materialSurplus = state.activeEventEffects?.materialSurplus ?? false;
			const basePrice =
				materialSurplus && item.type_ === "road" ? Math.max(1, price - 2) : price;
			const inflation = state.activeEventEffects?.rapidInflation ? 2 : 0;
			const pricedWithDiscounts = state.activeEventEffects?.blackFriday ? Math.max(0, basePrice - 1) : basePrice + inflation;
			const effectivePrice = isFreeActionTile || isFreeRoadTile ? 0 : pricedWithDiscounts;
			const purchasedItem: Tilable = item;
			if (state.actionsUsedThisTurn >= 2) {
				return state;
			}
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
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
			const newLbPicks = isFreeRoadTile ? state.logisticBreakthroughPicks + 1 : state.logisticBreakthroughPicks;
			const lbFirstPick = isFreeRoadTile && newLbPicks === 1;
			const actionsIncrement = lbFirstPick ? 0 : 1;

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
				actionsUsedThisTurn: state.actionsUsedThisTurn + actionsIncrement,
				logisticBreakthroughPicks: newLbPicks,
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
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
				return state;
			}
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
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
				return state;
			}
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
		.with({ type: "CUSTOMS_TILE" }, (innerAction) => {
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
				return state;
			}
			const { x, y } = innerAction.payload;
			const user = state.game.users[state.game.turn];
			const tile = state.game.tiles[`${y}-${x}`];
			const actionsUsed = state.actionsUsedThisTurn;
			const inventoryKey = "action:customs" as TileKey;
			const userPurchased = state.purchasedThisTurn[user.color] ?? {};
			const fromPurchaseThisTurn = (userPurchased[inventoryKey] ?? 0) > 0;
			if (!fromPurchaseThisTurn && actionsUsed >= 2) {
				return state;
			}
			if (!tile.owned || tile.owner !== user.color || tile.content.type_ !== "road" || tile.content.customs || (user.inventory["action:customs"] ?? 0) <= 0) {
				return state;
			}
			if (!isRoadEligibleForCustoms(state.game, tile)) {
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
							inventory: { ...user.inventory, "action:customs": user.inventory["action:customs"] - 1 },
						},
					},
					tiles: {
						...state.game.tiles,
						[`${y}-${x}`]: {
							...tile,
							content: { ...tile.content, customs: true },
						},
					},
				},
				actionsUsedThisTurn: fromPurchaseThisTurn ? state.actionsUsedThisTurn : actionsUsed + 1,
				purchasedThisTurn,
				history: historyState,
			};
		})
		.with({ type: "PLACE_TILE" }, (innerAction) => {
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) {
				return state;
			}
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
			const accessibleFromRoad = accessibleFreeTiles(state.game, user).find(
				(t) => t.x === x && t.y === y,
			);
			const accessibleFromCanal = accessibleCanalTiles(state.game, user).find(
				(t) => t.x === x && t.y === y,
			);
			if (tile.type_ === "road") {
				if (!accessibleFromRoad || !directionMatch(accessibleDirections(tile), accessibleFromRoad)) {
					return state;
				}
			} else if (tile.type_ === "production") {
				if (!accessibleFromRoad || !notInCenter(x, y)) {
					return state;
				}
			} else if (tile.type_ === "canal") {
				if (!accessibleFromCanal || !directionMatch(accessibleDirections(tile), accessibleFromCanal)) {
					return state;
				}
			} else {
				return state;
			}
			if (tile.type_ === "road" && state.activeEventEffects?.noRoad) {
				return state;
			}

			const straightCanalSecondCell =
				tile.type_ === "canal" && tile.canal === "straight" && accessibleFromCanal
					? getStraightCanalSecondCell(
							state.game,
							user.color,
							{ x, y },
							accessibleFromCanal,
							tile.rotation,
						)
					: null;

			if (tile.type_ === "canal" && tile.canal === "straight" && !straightCanalSecondCell) {
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
			const newTiles: typeof state.game.tiles = {
				...state.game.tiles,
				[`${y}-${x}`]: {
					x,
					y,
					content: tile,
					owned: true,
					owner: user.color,
				},
			};
			if (tile.type_ === "canal" && tile.canal === "straight" && straightCanalSecondCell) {
				newTiles[`${straightCanalSecondCell.y}-${straightCanalSecondCell.x}`] = {
					x: straightCanalSecondCell.x,
					y: straightCanalSecondCell.y,
					content: tile,
					owned: true,
					owner: user.color,
				};
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
				tiles: newTiles,
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

			// Special handling: Time Skip – skip production and actions, jump straight
			// to the next round and immediately draw a new event card (without consuming it yet).
			if (state.eventCardContent === "time_skip") {
				const nextRound = (baseGame.round ?? 1) + 1;
				const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];
				const newUsers: typeof baseGame.users = { ...baseGame.users };

				// No production applied – resources stay as they are.
				for (const owner of TILE_OWNERS) {
					newUsers[owner] = {
						...baseGame.users[owner],
						// Keep existing production values; Time Skip does not change tiles.
						production: baseGame.users[owner].production,
					};
				}

				// Time Skip kartı END_TURN'da zaten tüketildi; bir sonraki kartı gösteriyoruz, henüz tüketmiyoruz.
				const drawCard = state.eventCardsRemaining > 0;
				const nextDeckIndex = 25 - state.eventCardsRemaining;
				const eventCardContent: State["eventCardContent"] =
					!drawCard ? "blank" : nextDeckIndex < 25 ? state.eventCardDeck[nextDeckIndex] : "blank";

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
						eventCardsRemaining: state.eventCardsRemaining,
					cardShownByTimeSkip: true,
					showEventCard: drawCard,
					eventCardContent,
					pendingRoundEnd: drawCard,
					activeEventEffects: {
						noRoad: false,
						blackFriday: false,
						gift: false,
						luckyStreak: false,
						laborRevolt: false,
						rapidInflation: false,
						safePassage: false,
						brokenLogistics: false,
						bureaucraticDelay: false,
						logisticBreakthrough: false,
						marketHoliday: false,
						supplyChainShortage: false,
						materialSurplus: false,
						speculativeInvestment: false,
						blackMarketScams: false,
						merchantsLottery: false,
						robinHoodsToll: false,
						reversedCurrent: false,
						internationalTradeTreaty: false,
						economicIsolation: false,
					},
					giftReceivedThisRound: initialGiftReceivedThisRound(),
					lastDrawnEventCard: eventCardContent,
					lastDrawnWasExtendedTimeline: false,
					speculativeInvestmentResolved: initialSpeculativeInvestmentResolved(),
					speculativeInvestmentRoll: null,
					logisticBreakthroughPicks: 0,
					blackMarketScamsRemoved: initialBlackMarketScamsRemoved(),
					blackMarketScamsPopupShown: allBlackMarketScamsPopupShown(),
					merchantsLotteryResult: initialMerchantsLotteryResult(),
					merchantsLotteryPopupShown: allMerchantsLotteryPopupShown(),
					robinHoodTollDelta: initialRobinHoodTollDelta(),
					robinHoodTollPopupShown: allRobinHoodTollPopupShown(),
					history: historyState,
				};
			}
			const nextRound = (baseGame.round ?? 1) + 1;
			const roundStarter = TILE_OWNERS[(nextRound - 1) % TILE_OWNERS.length];
			const newUsers: typeof baseGame.users = { ...baseGame.users };
			const isExtendedTimeline = state.eventCardContent === "extended_timeline";
			const effectiveCard = isExtendedTimeline ? state.lastDrawnEventCard : state.eventCardContent;
			const laborRevoltActive = effectiveCard === "labor_revolt";
			const structuralCollapseActive = effectiveCard === "structural_collapse";
			const blackMarketScamsActive = effectiveCard === "black_market_scams";
			const merchantsLotteryActive = effectiveCard === "merchants_lottery";
			const robinHoodsTollActive = effectiveCard === "robin_hoods_toll";
			const internationalTradeTreatyActive = effectiveCard === "international_trade_treaty";
			const economicIsolationActive = effectiveCard === "economic_isolation";
			const blackMarketScamsRemoved: Record<TileOwner, { key: TileKey; count: number }[]> = initialBlackMarketScamsRemoved();
			const merchantsLotteryResult: Record<TileOwner, number> = initialMerchantsLotteryResult();
			const robinHoodTollDelta: Record<TileOwner, number> = initialRobinHoodTollDelta();
			const internationalTradeTreatyBonus: Record<TileOwner, number> = initialInternationalTradeTreatyBonus();
			const tradeRoutes = internationalTradeTreatyActive || economicIsolationActive ? findTradeRoutes(baseGame) : [];
			const economicIsolationResult: Record<TileOwner, "none" | "paid" | "production_reduced"> = initialEconomicIsolationResult();

			if (robinHoodsTollActive) {
				const wealthy: TileOwner[] = [];
				const poor: TileOwner[] = [];
				for (const owner of TILE_OWNERS) {
					const balance = baseGame.users[owner].resources.dollar;
					if (balance >= 10) {
						wealthy.push(owner);
					} else if (balance < 10) {
						poor.push(owner);
					}
				}
				if (wealthy.length > 0 && poor.length > 0) {
					for (const owner of wealthy) {
						robinHoodTollDelta[owner] -= 2 * poor.length;
					}
					for (const owner of poor) {
						robinHoodTollDelta[owner] += 2 * wealthy.length;
					}
				}
			}

			for (const owner of TILE_OWNERS) {
				const user = baseGame.users[owner];
				let production = calculateUserProduction(baseGame, owner);
				const tollDelta = robinHoodsTollActive ? robinHoodTollDelta[owner] : 0;
				let tradeBonus = 0;
				if (internationalTradeTreatyActive) {
					const routesForOwner = tradeRoutes.filter(
						(route) => route.between[0] === owner || route.between[1] === owner,
					);
					tradeBonus = routesForOwner.length * 5;
					internationalTradeTreatyBonus[owner] = tradeBonus;
				}
				let isolationDollarDelta = 0;
				if (economicIsolationActive) {
					const routesForOwner = tradeRoutes.filter(
						(route) => route.between[0] === owner || route.between[1] === owner,
					);
					if (routesForOwner.length === 0) {
						if (user.resources.dollar >= 3) {
							isolationDollarDelta = -3;
							economicIsolationResult[owner] = "paid";
						} else {
							production = { ...production, dollar: Math.max(0, production.dollar - 1) };
							economicIsolationResult[owner] = "production_reduced";
						}
					}
				}
				const baseAddedResources = RESOURCE_TYPES.reduce((acc, resource) => {
					const base = production[resource];
					const effective = structuralCollapseActive ? 0 : laborRevoltActive ? Math.floor(base * 0.6) : base;
					acc[resource] = user.resources[resource] + effective;
					return acc;
				}, zero());
				const addedResources = {
					...baseAddedResources,
					dollar: baseAddedResources.dollar + tollDelta + tradeBonus + isolationDollarDelta,
				};
				let nextInventory = user.inventory;
				if (blackMarketScamsActive) {
					const removed: { key: TileKey; count: number }[] = [];
					const inv = { ...user.inventory };
					for (const key of ACTION_TILE_KEYS) {
						const count = user.inventory[key] ?? 0;
						if (count > 0) {
							removed.push({ key, count });
							inv[key] = 0;
						}
					}
					blackMarketScamsRemoved[owner] = removed;
					nextInventory = inv;
				}
				newUsers[owner] = {
					...user,
					inventory: nextInventory,
					production,
					resources: {
						...user.resources,
						...addedResources,
					},
				};
			}
			if (merchantsLotteryActive) {
				const goldProductionByOwner: Record<TileOwner, number> = {} as Record<TileOwner, number>;
				for (const owner of TILE_OWNERS) {
					const prod = calculateUserProduction(baseGame, owner);
					goldProductionByOwner[owner] = prod.dollar;
				}
				const values = TILE_OWNERS.map((o) => goldProductionByOwner[o]);
				const minGold = Math.min(...values);
				const winners = TILE_OWNERS.filter((o) => goldProductionByOwner[o] === minGold);
				const bonus = winners.length === 1 ? 5 : 2;
				for (const owner of TILE_OWNERS) {
					if (winners.includes(owner)) {
						merchantsLotteryResult[owner] = bonus;
						newUsers[owner] = {
							...newUsers[owner],
							resources: {
								...newUsers[owner].resources,
								dollar: newUsers[owner].resources.dollar + bonus,
							},
						};
					}
				}
			}
			const activeEventEffects = isExtendedTimeline
				? state.activeEventEffects
				: {
					noRoad: state.eventCardContent === "no_road",
					blackFriday: state.eventCardContent === "black_friday",
					gift: state.eventCardContent === "gift",
					luckyStreak: state.eventCardContent === "lucky_streak",
					laborRevolt: state.eventCardContent === "labor_revolt",
					rapidInflation: state.eventCardContent === "rapid_inflation",
					safePassage: state.eventCardContent === "safe_passage",
					brokenLogistics: state.eventCardContent === "broken_logistics",
					bureaucraticDelay: state.eventCardContent === "bureaucratic_delay",
					logisticBreakthrough: state.eventCardContent === "logistic_breakthrough",
					marketHoliday: state.eventCardContent === "market_holiday",
					supplyChainShortage: state.eventCardContent === "supply_chain_shortage",
					materialSurplus: state.eventCardContent === "material_surplus",
					speculativeInvestment: state.eventCardContent === "speculative_investment",
					blackMarketScams: state.eventCardContent === "black_market_scams",
					merchantsLottery: state.eventCardContent === "merchants_lottery",
					robinHoodsToll: state.eventCardContent === "robin_hoods_toll",
					reversedCurrent: state.eventCardContent === "reversed_currents",
					internationalTradeTreaty: state.eventCardContent === "international_trade_treaty",
					economicIsolation: state.eventCardContent === "economic_isolation",
				};

			const newEventCardsAfterDismiss = state.cardShownByTimeSkip
				? Math.max(0, state.eventCardsRemaining - 1)
				: state.eventCardsRemaining;

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
				actionsUsedThisTurn: activeEventEffects.bureaucraticDelay ? 2 : 0,
				randomTilePurchasedThisTurn: false,
				endedThisRound: initialEndedThisRound(),
				purchasedThisTurn: initialPurchasedThisTurn(),
				eventCardsRemaining: newEventCardsAfterDismiss,
				cardShownByTimeSkip: false,
				showEventCard: false,
				eventCardContent: "blank",
				pendingRoundEnd: false,
				activeEventEffects,
				giftReceivedThisRound: initialGiftReceivedThisRound(),
				lastDrawnEventCard: isExtendedTimeline ? state.lastDrawnEventCard : state.eventCardContent,
				lastDrawnWasExtendedTimeline: isExtendedTimeline,
				speculativeInvestmentResolved: activeEventEffects.speculativeInvestment ? initialSpeculativeInvestmentResolved() : state.speculativeInvestmentResolved,
				speculativeInvestmentRoll: null,
				logisticBreakthroughPicks: 0,
				blackMarketScamsRemoved: blackMarketScamsActive ? blackMarketScamsRemoved : initialBlackMarketScamsRemoved(),
				blackMarketScamsPopupShown: blackMarketScamsActive ? initialBlackMarketScamsPopupShown() : allBlackMarketScamsPopupShown(),
				merchantsLotteryResult: merchantsLotteryActive ? merchantsLotteryResult : initialMerchantsLotteryResult(),
				merchantsLotteryPopupShown: merchantsLotteryActive ? initialMerchantsLotteryPopupShown() : allMerchantsLotteryPopupShown(),
				robinHoodTollDelta: robinHoodsTollActive ? robinHoodTollDelta : initialRobinHoodTollDelta(),
				robinHoodTollPopupShown: robinHoodsTollActive ? initialRobinHoodTollPopupShown() : allRobinHoodTollPopupShown(),
				internationalTradeTreatyBonus: internationalTradeTreatyActive ? internationalTradeTreatyBonus : initialInternationalTradeTreatyBonus(),
				internationalTradeTreatyPopupShown: internationalTradeTreatyActive ? initialInternationalTradeTreatyPopupShown() : allInternationalTradeTreatyPopupShown(),
				economicIsolationResult: economicIsolationActive ? economicIsolationResult : initialEconomicIsolationResult(),
				economicIsolationPopupShown: economicIsolationActive ? initialEconomicIsolationPopupShown() : allEconomicIsolationPopupShown(),
				history: historyState,
			};
		})
		.with({ type: "DISMISS_BLACK_MARKET_POPUP" }, () => ({
			...state,
			blackMarketScamsPopupShown: {
				...state.blackMarketScamsPopupShown,
				[state.game.turn]: true,
			},
			history: historyState,
		}))
		.with({ type: "DISMISS_MERCHANTS_LOTTERY_POPUP" }, () => ({
			...state,
			merchantsLotteryPopupShown: {
				...state.merchantsLotteryPopupShown,
				[state.game.turn]: true,
			},
			history: historyState,
		}))
		.with({ type: "DISMISS_ROBIN_HOODS_TOLL_POPUP" }, () => ({
			...state,
			robinHoodTollPopupShown: {
				...state.robinHoodTollPopupShown,
				[state.game.turn]: true,
			},
			history: historyState,
		}))
		.with({ type: "DISMISS_INTERNATIONAL_TRADE_TREATY_POPUP" }, () => ({
			...state,
			internationalTradeTreatyPopupShown: {
				...state.internationalTradeTreatyPopupShown,
				[state.game.turn]: true,
			},
			history: historyState,
		}))
		.with({ type: "DISMISS_ECONOMIC_ISOLATION_POPUP" }, () => ({
			...state,
			economicIsolationPopupShown: {
				...state.economicIsolationPopupShown,
				[state.game.turn]: true,
			},
			history: historyState,
		}))
		.with({ type: "SHOW_EVENT_CARD_PREVIEW" }, () => {
			if (!state.lastDrawnEventCard || state.lastDrawnEventCard === "blank") {
				return state;
			}
			return {
				...state,
				showEventCard: true,
				eventCardContent: state.lastDrawnEventCard as Exclude<State["eventCardContent"], "blank">,
				pendingRoundEnd: false,
				speculativeInvestmentResolved: state.activeEventEffects.speculativeInvestment ? initialSpeculativeInvestmentResolved() : state.speculativeInvestmentResolved,
			};
		})
		.with({ type: "START_DICE_ROLL" }, (innerAction) => {
			if (state.activeEventEffects?.marketHoliday) return state;
			if (state.activeEventEffects?.supplyChainShortage) return state;
			if (state.activeEventEffects?.speculativeInvestment && !state.speculativeInvestmentResolved[state.game.turn]) return state;
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
		.with({ type: "SPECULATIVE_ROLL" }, (innerAction) => {
			const { roll } = innerAction.payload;
			if (!state.activeEventEffects?.speculativeInvestment) {
				return state;
			}
			const current = state.game.turn;
			if (state.speculativeInvestmentResolved[current]) {
				return state;
			}
			// 3–4: no change, resolve immediately
			if (roll === 3 || roll === 4) {
				return {
					...state,
					speculativeInvestmentResolved: {
						...state.speculativeInvestmentResolved,
						[current]: true,
					},
					history: historyState,
				};
			}
			// 1–2 or 5–6: store roll so player can choose which tile to downgrade/upgrade (or skip/free)
			return {
				...state,
				speculativeInvestmentRoll: roll,
				history: historyState,
			};
		})
		.with({ type: "SPECULATIVE_APPLY_CHOICE" }, (innerAction) => {
			const payload = innerAction.payload;
			if (!state.activeEventEffects?.speculativeInvestment) {
				return state;
			}
			const current = state.game.turn;
			if (state.speculativeInvestmentResolved[current]) {
				return state;
			}
			const roll = state.speculativeInvestmentRoll;
			if (roll === null || (roll >= 3 && roll <= 4)) {
				return state;
			}

			let gameState = state.game;
			const tiles = gameState.tiles;
			const entries = Object.entries(tiles).filter(
				(entry): entry is [string, OwnedTile & { content: ProductionTile }] =>
					entry[1].owned &&
					entry[1].owner === current &&
					entry[1].content.type_ === "production" &&
					entry[1].content.production === "dollar",
			);

			if (payload.action === "skip") {
				return {
					...state,
					speculativeInvestmentRoll: null,
					speculativeInvestmentResolved: {
						...state.speculativeInvestmentResolved,
						[current]: true,
					},
					history: historyState,
				};
			}

			if (payload.action === "downgrade" && (roll === 1 || roll === 2)) {
				const key = `${payload.y}-${payload.x}`;
				const tile = tiles[key];
				if (
					!tile?.owned ||
					tile.owner !== current ||
					tile.content.type_ !== "production" ||
					tile.content.production !== "dollar"
				) {
					return state;
				}
				const level = tile.content.level;
				if (level > 1) {
					gameState = {
						...gameState,
						tiles: {
							...gameState.tiles,
							[key]: {
								...tile,
								content: {
									...tile.content,
									level: (level - 1) as typeof tile.content.level,
								},
							},
						},
					};
				} else {
					gameState = {
						...gameState,
						tiles: {
							...gameState.tiles,
							[key]: {
								...tile,
								content: { type_: "empty" } as any,
							},
						},
					};
				}
				const updatedGame = updateUserProduction(gameState, current);
				return {
					...state,
					game: updatedGame,
					speculativeInvestmentRoll: null,
					speculativeInvestmentResolved: {
						...state.speculativeInvestmentResolved,
						[current]: true,
					},
					history: historyState,
				};
			}

			if (payload.action === "upgrade" && (roll === 5 || roll === 6)) {
				const key = `${payload.y}-${payload.x}`;
				const tile = tiles[key];
				if (
					!tile?.owned ||
					tile.owner !== current ||
					tile.content.type_ !== "production" ||
					tile.content.production !== "dollar" ||
					tile.content.level >= 3
				) {
					return state;
				}
				const level = tile.content.level;
				gameState = {
					...gameState,
					tiles: {
						...gameState.tiles,
						[key]: {
							...tile,
							content: {
								...tile.content,
								level: (level + 1) as typeof tile.content.level,
							},
						},
					},
				};
				const updatedGame = updateUserProduction(gameState, current);
				return {
					...state,
					game: updatedGame,
					speculativeInvestmentRoll: null,
					speculativeInvestmentResolved: {
						...state.speculativeInvestmentResolved,
						[current]: true,
					},
					history: historyState,
				};
			}

			if (payload.action === "free_production" && (roll === 5 || roll === 6)) {
				const upgradable = entries.filter(([, t]) => t.content.level < 3);
				if (upgradable.length > 0) {
					return state; // must upgrade a tile if any is upgradable
				}
				const user = gameState.users[current];
				const freeTile: Tilable = {
					type_: "production",
					production: "dollar",
					level: 1,
				} as const;
				const invKey = toKey(freeTile);
				gameState = {
					...gameState,
					users: {
						...gameState.users,
						[current]: {
							...user,
							inventory: {
								...user.inventory,
								[invKey]: (user.inventory[invKey] ?? 0) + 1,
							},
						},
					},
				};
				return {
					...state,
					game: gameState,
					speculativeInvestmentRoll: null,
					speculativeInvestmentResolved: {
						...state.speculativeInvestmentResolved,
						[current]: true,
					},
					history: historyState,
				};
			}

			return state;
		})
		.exhaustive() as State;
};
