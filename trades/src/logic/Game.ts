import { match, P } from "ts-pattern"


export type Tile = OwnedTile | FreeTile

export type TileState = OwnedTile | FreeTile

export type Point = { x: number, y: number }
export function point(x: number, y: number): Point { return { x, y } };

export type FreeTile = Point & {
    owned: false
}
export function free(x: number, y: number): FreeTile { return { x, y, owned: false } }

export type TileOwner = "red" | "green" | "blue" | "orange"
export function next(owner: TileOwner): TileOwner {
    switch (owner) {
        case "green": return "orange";
        case "orange": return "blue";
        case "blue": return "red";
        case "red": return "green";
    }
}
export function turnToUser(owner: TileOwner): 0 | 1 | 2 | 3 {
    switch (owner) {
        case "green": return 0;
        case "orange": return 1;
        case "blue": return 2;
        case "red": return 3;
    }
}

export function prev(owner: TileOwner): TileOwner {
    switch (owner) {
        case "green": return "red";
        case "red": return "blue";
        case "blue": return "orange";
        case "orange": return "green";
    }
}

export type OwnedTile = Point & {
    owned: true
    owner: TileOwner
    content: TileContent
}

export function owned(x: number, y: number, owner: TileOwner, content: TileContent): OwnedTile {
    return { x, y, owned: true, owner, content }
}


export type TileContent = RoadTile | ProductionTile | EmptyTile | CityHallTile

export type EmptyTile = { type_: "empty" }
export function empty(): EmptyTile { return { type_: "empty" } }

export type CityHallLevel = 0 | 1 | 2 | 3
export type CityHallTile = { type_: "hall", level: CityHallLevel }
export function cityHall(level: CityHallLevel): CityHallTile {
    return { type_: "hall", level }
}
export const CITY_HALLS = [
    [4, 4], [4, 13], [13, 4], [13, 13]
];


export const ROAD_TYPES = ["t", "i", "l", "plus"] as const;
export type RoadType = typeof ROAD_TYPES[number];

export const ROAD_ROTATIONS = [0, 90, 180, 270] as const;
export type RoadRotation = typeof ROAD_ROTATIONS[number];

export type RoadTile = {
    type_: "road"
    road: RoadType
    rotation: RoadRotation
    blocked: boolean
    toll: number
}

export function road(road: RoadType, rotation: RoadRotation): RoadTile {
    return { type_: "road", road, rotation, blocked: false, toll: 0 }
}

export type AccessibleDirections = {
    up: boolean,
    right: boolean,
    bottom: boolean,
    left: boolean,
};

export function directions(up: boolean, right: boolean, bottom: boolean, left: boolean): AccessibleDirections {
    return { up, right, bottom, left }
}

export function accessibleDirections(tile: RoadTile | CityHallTile): AccessibleDirections {
    switch (tile.type_) {
        case "hall": return directions(true, true, true, true);
        case "road": {
            const road = tile as RoadTile;
            switch (road.road) {
                case "i": {
                    switch (road.rotation) {
                        case 0: case 180: // left or right
                            return directions(false, true, false, true);
                        case 90: case 270: // up or down
                            return directions(true, false, true, false);
                        default: throw Error("unreachable")
                    }
                }
                case "l": {
                    switch (road.rotation) {
                        // left and up
                        case 0: return directions(true, false, false, true);
                        // up and right
                        case 90: return directions(true, true, false, false);
                        // right and bottom 
                        case 180: return directions(false, true, true, false);
                        // bottom and left 
                        case 270: return directions(false, false, true, true);
                        default: throw Error("unreachable")
                    }
                }
                case "t": {
                    switch (road.rotation) {
                        // left, up, and right
                        case 0: return directions(true, true, false, true);
                        // up, right, and bottom
                        case 90: return directions(true, true, true, false);
                        // right, bottom and left 
                        case 180: return directions(false, true, true, true);
                        // bottom, left and up 
                        case 270: return directions(true, false, true, true);
                        default: throw Error("unreachable")
                    }
                }
                case "plus": return directions(true, true, true, true);
                default: throw Error("unreachable")
            }
        }
    }
}

export const roadPrices = {
    i: 2,
    l: 3,
    t: 5,
    plus: 8,
    random: 5
};

export const RESOURCE_TYPES = ["dollar", "wood", "steel", "stone", "coal"] as const;
export type ProductionType = typeof RESOURCE_TYPES[number];

export const PRODUCTION_LEVELS = [1, 2, 3] as const;
export type ProductionLevel = typeof PRODUCTION_LEVELS[number];

export type ProductionTile = {
    type_: "production"
    production: ProductionType
    level: ProductionLevel
}
export function production(production: ProductionType, level: ProductionLevel): ProductionTile {
    return { type_: "production", production, level }
}

export const ACTION_TYPES = ["turn", "toll", "block", "unblock"] as const;
export type ActionType = typeof ACTION_TYPES[number];

export type ActionTile = {
    type_: "action"
    action: ActionType
}
export function action(action: ActionType): ActionTile {
    return { type_: "action", action }
}
export const actionPrices = {
    turn: 5,
    toll: 5,
    block: 5,
    unblock: 5
};

export type Tilable = RoadTile | ProductionTile | ActionTile
export type TileKey =
    | `action:${ActionType}`
    | `road:${RoadType}:${RoadRotation}`
    | `production:${ProductionType}:${ProductionLevel}`

export function toTilable(key: TileKey): Tilable {
    const [type, ...rest] = key.split(":");
    switch (type) {
        case "action": return action(rest[0] as ActionType);
        case "road": return road(rest[0] as RoadType, Number.parseInt(rest[1]) as unknown as RoadRotation);
        case "production": return production(rest[0] as ProductionType, Number.parseInt(rest[1]) as unknown as ProductionLevel);
        default: throw Error("unreachable")
    }
}
export function toKey(tile: Tilable): TileKey {
    switch (tile.type_) {
        case "action": return `action:${tile.action}` as const;
        case "road": return `road:${tile.road}:${tile.rotation}` as const;
        case "production": return `production:${tile.production}:${tile.level}` as const;
        default: throw Error("unreachable")
    }
}

export type Inventory = {
    [key in TileKey]: number
}

export const ALL_TILE_KEYS: TileKey[] = [
    ...ACTION_TYPES.map((action) => `action:${action}` as const),
    ...ROAD_TYPES.flatMap((road) => {
        return [
            ...ROAD_ROTATIONS.map((rotation) => `road:${road}:${rotation}` as const),
        ]
    }),
    ...RESOURCE_TYPES.flatMap((resource) => {
        return [
            ...PRODUCTION_LEVELS.map((level) => `production:${resource}:${level}` as const),
        ]
    })
];

export function inventory(): Inventory {
    const inventory: Inventory = {} as Inventory;
    for (const key of ALL_TILE_KEYS) {
        inventory[key] = 0;
    }
    return inventory;
}

export type Phase = { tag: "planning" } | { tag: "tiling", tile: Tilable }
export function planning(): Phase { return { tag: "planning" } };
export function tiling(tile: Tilable): Phase { return { tag: "tiling", tile } };

export const BOARD_SIZE = 18;

export type Game = {
    turn: TileOwner,
    /** Total number of turns taken so far (for debugging / statistics). */
    turns: number,
    /** Current round number (starts from 1). */
    round: number,
    users: Record<TileOwner, User>,
    tiles: Record<`${number}-${number}`, Tile>
    // phase: Phase
}

export type ResourceCollection = {
    dollar: number
    wood: number
    steel: number
    stone: number
    coal: number
}

export function zero(): ResourceCollection {
    return {
        dollar: 0,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}

function defaultResources(): ResourceCollection {
    return {
        dollar: 20,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}

export function baseProductions(): ResourceCollection {
    return {
        dollar: 6,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}

export type User = {
    color: TileOwner,
    resources: ResourceCollection
    production: ResourceCollection
    inventory: Inventory,
}

function user(color: TileOwner, resources: ResourceCollection, production: ResourceCollection) {
    return { color, resources, production, inventory: inventory() }
}
const userCapital = {
    "green": point(4, 4),
    "orange": point(13, 4),
    "blue": point(13, 13),
    "red": point(4, 13),
}

export const ALL_TILES_POINTS: Point[] = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
    const x = i % BOARD_SIZE;
    const y = Math.floor(i / BOARD_SIZE);
    return point(x, y);
});

export function game(): Game {
    const tiles: Record<`${number}-${number}`, Tile> = {};

    // create 18x18 board, 6x6 free zone at the middle, the remaining parts of the 4 quarters to each player
    for (let y = 0; y < 18; y += 1) {
        for (let x = 0; x < 18; x += 1) {
            if (x >= 6 && x < 12 && y >= 6 && y < 12) { // free zone
                tiles[`${y}-${x}`] = free(x, y);
            } else if (x < 9 && y < 9) { // Zone 1, green
                tiles[`${y}-${x}`] = owned(x, y, "green", empty())
            } else if (x >= 9 && y < 9) { // Zone 2, orange
                tiles[`${y}-${x}`] = owned(x, y, "orange", empty())
            } else if (x >= 9 && y >= 9) { // Zone 3, blue
                tiles[`${y}-${x}`] = owned(x, y, "blue", empty())
            } else { // Zone 4, red
                tiles[`${y}-${x}`] = owned(x, y, "red", empty())
            }
        }
    }

    // make the mid section of each zone a city hall
    tiles["4-4"] = owned(4, 4, "green", cityHall(0));
    tiles["4-13"] = owned(13, 4, "orange", cityHall(0));
    tiles["13-13"] = owned(13, 13, "blue", cityHall(0));
    tiles["13-4"] = owned(4, 13, "red", cityHall(0));

    const users: Record<TileOwner, User> = {
        green: user("green", defaultResources(), baseProductions()),
        orange: user("orange", defaultResources(), baseProductions()),
        blue: user("blue", defaultResources(), baseProductions()),
        red: user("red", defaultResources(), baseProductions()),
    }

    return { turn: "green", turns: 0, round: 1, tiles, users };
}

export type AccessibleTile = Point & AccessibleDirections;

export const emptyDirections: AccessibleDirections = {
    up: false,
    right: false,
    bottom: false,
    left: false,
};

export function accessibleFreeTiles(game: Game, user: User): AccessibleTile[] {
    const startPoint = userCapital[user.color];
    // assume we have a crossroad at the capital
    const visited: Point[] = [];
    const toVisit: Point[] = [startPoint];
    const accessible: AccessibleTile[] = [];

    while (toVisit.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: -
        const p = toVisit.pop()!;
        visited.push(p)
        const tile = game.tiles[`${p.y}-${p.x}`];
        if (tile.owned && tile.owner === user.color) {
            switch (tile.content.type_) {
                case "road":
                case "hall": {
                    const directions = accessibleDirections(tile.content);
                    if (directions.up) {
                        const up = point(tile.x, tile.y - 1);

                        if (!visited.some((p) => p.x === up.x && p.y === up.y)) {
                            match(game.tiles[`${up.y}-${up.x}`])
                                .with(P.union({ owned: false }, { owned: true, owner: user.color, content: { type_: "empty" } }), (upTile) => {
                                    // free tile or empty tile
                                    const accessibleTile = accessible.find((t) => t.x === up.x && t.y === up.y);
                                    if (accessibleTile) {
                                        accessibleTile.bottom = true;
                                    } else {
                                        accessible.push({ x: upTile.x, y: upTile.y, ...emptyDirections, bottom: true });
                                    }

                                })
                                .with({ owned: true, owner: user.color, content: { type_: "road" } }, (upTile) => {
                                    const upTileDirections = accessibleDirections(upTile.content);
                                    if (upTileDirections.bottom) {
                                        toVisit.push(up);
                                    }
                                })
                                .otherwise(() => { });
                        }
                    }
                    if (directions.right) {
                        const right = point(tile.x + 1, tile.y);
                        if (!visited.some((p) => p.x === right.x && p.y === right.y)) {
                            match(game.tiles[`${right.y}-${right.x}`])
                                .with(P.union({ owned: false }, { owned: true, owner: user.color, content: { type_: "empty" } }), (rightTile) => {
                                    // free tile or empty tile
                                    const accessibleTile = accessible.find((t) => t.x === right.x && t.y === right.y);
                                    if (accessibleTile) {
                                        accessibleTile.left = true;
                                    } else {
                                        accessible.push({ x: rightTile.x, y: rightTile.y, ...emptyDirections, left: true });
                                    }
                                })
                                .with({ owned: true, owner: user.color, content: { type_: "road" } }, (rightTile) => {
                                    const rightTileDirections = accessibleDirections(rightTile.content);
                                    if (rightTileDirections.left) {
                                        toVisit.push(right);
                                    }
                                })
                                .otherwise(() => { });
                        }
                    }
                    if (directions.bottom) {
                        const bottom = point(tile.x, tile.y + 1);
                        if (!visited.some((p) => p.x === bottom.x && p.y === bottom.y)) {
                            match(game.tiles[`${bottom.y}-${bottom.x}`])
                                .with(P.union({ owned: false }, { owned: true, owner: user.color, content: { type_: "empty" } }), (bottomTile) => {
                                    // free tile or empty tile
                                    const accessibleTile = accessible.find((t) => t.x === bottom.x && t.y === bottom.y);
                                    if (accessibleTile) {
                                        accessibleTile.up = true;
                                    } else {
                                        accessible.push({ x: bottomTile.x, y: bottomTile.y, ...emptyDirections, up: true });
                                    }
                                })
                                .with({ owned: true, owner: user.color, content: { type_: "road" } }, (bottomTile) => {
                                    const bottomTileDirections = accessibleDirections(bottomTile.content);
                                    if (bottomTileDirections.up) {
                                        toVisit.push(bottom);
                                    }
                                })
                                .otherwise(() => { });
                        }
                    }
                    if (directions.left) {
                        const left = point(tile.x - 1, tile.y);
                        if (!visited.some((p) => p.x === left.x && p.y === left.y)) {
                            match(game.tiles[`${left.y}-${left.x}`])
                                .with(P.union({ owned: false }, { owned: true, owner: user.color, content: { type_: "empty" } }), (leftTile) => {
                                    // free tile or empty tile
                                    const accessibleTile = accessible.find((t) => t.x === left.x && t.y === left.y);
                                    if (accessibleTile) {
                                        accessibleTile.right = true;
                                    } else {
                                        accessible.push({ x: leftTile.x, y: leftTile.y, ...emptyDirections, right: true });
                                    }
                                })
                                .with({ owned: true, owner: user.color, content: { type_: "road" } }, (leftTile) => {
                                    const leftTileDirections = accessibleDirections(leftTile.content);
                                    if (leftTileDirections.right) {
                                        toVisit.push(left);
                                    }
                                })
                                .otherwise(() => { });
                        }
                    }
                    break;
                }
                default: throw Error("unreachable")
            }
        }
    }

    return accessible;
}

function isInsideBoard(point: Point): boolean {
    return point.x >= 0 && point.x < BOARD_SIZE && point.y >= 0 && point.y < BOARD_SIZE;
}

type PassableRoadOrHall = OwnedTile & { content: RoadTile | CityHallTile };

function isPassableRoadOrHall(tile: Tile): tile is PassableRoadOrHall {
    if (!tile.owned) {
        return false;
    }
    if (tile.content.type_ === "hall") {
        return true;
    }
    if (tile.content.type_ === "road") {
        return !tile.content.blocked;
    }
    return false;
}

function tileKey(point: Point): `${number}-${number}` {
    return `${point.y}-${point.x}` as `${number}-${number}`;
}

export function calculateUserProduction(game: Game, owner: TileOwner): ResourceCollection {
    const productionTotals = baseProductions();
    const startPoint = userCapital[owner];
    const reachable = new Set<`${number}-${number}`>();
    const toVisit: Point[] = [startPoint];

    const addReachable = (point: Point) => {
        reachable.add(tileKey(point));
    };

    while (toVisit.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: queue is non-empty
        const current = toVisit.pop()!;
        if (!isInsideBoard(current)) {
            continue;
        }
        const currentKey = tileKey(current);
        if (reachable.has(currentKey)) {
            continue;
        }

        const tile = game.tiles[currentKey];
        if (!tile || !tile.owned || tile.owner !== owner) {
            continue;
        }
        if (!isPassableRoadOrHall(tile)) {
            continue;
        }

        addReachable(current);
        const directions = accessibleDirections(tile.content);

        const neighbors: Array<{ point: Point; required: keyof AccessibleDirections }> = [];
        if (directions.up) {
            neighbors.push({ point: point(current.x, current.y - 1), required: "bottom" });
        }
        if (directions.right) {
            neighbors.push({ point: point(current.x + 1, current.y), required: "left" });
        }
        if (directions.bottom) {
            neighbors.push({ point: point(current.x, current.y + 1), required: "up" });
        }
        if (directions.left) {
            neighbors.push({ point: point(current.x - 1, current.y), required: "right" });
        }

        for (const neighbor of neighbors) {
            if (!isInsideBoard(neighbor.point)) {
                continue;
            }
            const neighborKey = tileKey(neighbor.point);
            if (reachable.has(neighborKey)) {
                continue;
            }
            const neighborTile = game.tiles[neighborKey];
            if (!neighborTile || !neighborTile.owned || neighborTile.owner !== owner) {
                continue;
            }
            if (!isPassableRoadOrHall(neighborTile)) {
                continue;
            }
            const neighborDirections = accessibleDirections(neighborTile.content);
            if (neighborDirections[neighbor.required]) {
                toVisit.push(neighbor.point);
            }
        }
    }

    const hasReachableNeighbor = (tile: OwnedTile): boolean => {
        const positions: Array<{ point: Point; required: keyof AccessibleDirections }> = [
            { point: point(tile.x, tile.y - 1), required: "bottom" },
            { point: point(tile.x + 1, tile.y), required: "left" },
            { point: point(tile.x, tile.y + 1), required: "up" },
            { point: point(tile.x - 1, tile.y), required: "right" },
        ];

        for (const position of positions) {
            if (!isInsideBoard(position.point)) {
                continue;
            }
            const neighborKey = tileKey(position.point);
            if (!reachable.has(neighborKey)) {
                continue;
            }
            const neighborTile = game.tiles[neighborKey];
            if (!neighborTile || !isPassableRoadOrHall(neighborTile)) {
                continue;
            }
            const neighborDirections = accessibleDirections(neighborTile.content);
            if (neighborDirections[position.required]) {
                return true;
            }
        }

        return false;
    };

    for (const tile of Object.values(game.tiles)) {
        if (!tile.owned || tile.owner !== owner) {
            continue;
        }
        if (tile.content.type_ !== "production") {
            continue;
        }
        if (!hasReachableNeighbor(tile)) {
            continue;
        }
        productionTotals[tile.content.production] += tile.content.level;
    }

    return productionTotals;
}