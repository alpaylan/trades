

type Tile = OwnedTile | FreeTile

type TileState = OwnedTile | FreeTile

type Point = { x: number, y: number }
function point(x: number, y: number): Point { return { x, y } };

type FreeTile = Point & {
    owned: false
}
function free(x: number, y: number): FreeTile { return { x, y, owned: false } }

type TileOwner = "red" | "green" | "blue" | "orange"
function next(owner: TileOwner): TileOwner {
    switch (owner) {
        case "green": return "orange";
        case "orange": return "blue";
        case "blue": return "red";
        case "red": return "green";
    }
}
function prev(owner: TileOwner): TileOwner {
    switch (owner) {
        case "green": return "red";
        case "red": return "blue";
        case "blue": return "orange";
        case "orange": return "green";
    }
}

type OwnedTile = Point & {
    owned: true
    owner: TileOwner
    content: TileContent
}

function owned(x: number, y: number, owner: TileOwner, content: TileContent): OwnedTile {
    return { x, y, owned: true, owner, content }
}


type TileContent = RoadTile | ProductionTile | EmptyTile | CityHallTile

type EmptyTile = { type_: "empty" }
function empty(): EmptyTile { return { type_: "empty" } }

type CityHallLevel = 0 | 1 | 2 | 3
type CityHallTile = { type_: "hall", level: CityHallLevel }
function cityHall(level: CityHallLevel): CityHallTile {
    return { type_: "hall", level }
}

type RoadType = "t" | "i" | "l" | "plus"
type RoadRotation = 0 | 90 | 180 | 270
type RoadTile = {
    type_: "road"
    road: RoadType
    rotation: RoadRotation
}
function road(road: RoadType, rotation: RoadRotation): RoadTile {
    return { type_: "road", road, rotation }
}

type AccessibleDirections = {
    up: boolean,
    right: boolean,
    bottom: boolean,
    left: boolean,
};
function directions(up: boolean, right: boolean, bottom: boolean, left: boolean): AccessibleDirections {
    return { up, right, bottom, left }
}

function accessibleDirections(road: RoadTile): AccessibleDirections {
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
const roadPrices = {
    i: 2,
    l: 3,
    t: 5,
    plus: 8,
    random: 5
};

type ProductionType = "dollar" | "wood" | "steel" | "stone" | "coal"
type ProductionLevel = 1 | 2 | 3
type ProductionTile = {
    type_: "production"
    production: ProductionType
    level: ProductionLevel
}
function production(production: ProductionType, level: ProductionLevel): ProductionTile {
    return { type_: "production", production, level }
}

type ActionType = "turn" | "toll" | "block" | "unblock"
type ActionTile = {
    type_: "action"
    action: ActionType
}
function action(action: ActionType): ActionTile {
    return { type_: "action", action }
}
const actionPrices = {
    turn: 5,
    toll: 5,
    block: 5,
    unblock: 5
};

type Tilable = RoadTile | ProductionTile | ActionTile
type Phase = { tag: "planning" } | { tag: "tiling", tile: Tilable }
function planning(): Phase { return { tag: "planning" } };
function tiling(tile: Tilable): Phase { return { tag: "tiling", tile } };

type Game = {
    turn: TileOwner,
    turns: number,
    users: User[],
    tiles: Tile[][]
    phase: Phase
}

type ResourceCollection = {
    dollar: number
    wood: number
    steel: number
    stone: number
    coal: number
}
const resourceTypes = ["dollar", "wood", "steel", "stone", "coal"];

function zero(): ResourceCollection {
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

function defaultProductions(): ResourceCollection {
    return {
        dollar: 6,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}

type User = {
    color: TileOwner,
    resources: ResourceCollection
    production: ResourceCollection
}
function user(color: TileOwner, resources: ResourceCollection, production: ResourceCollection) {
    return { color, resources, production }
}
const userCapital = {
    "green": point(4, 4),
    "orange": point(4, 13),
    "blue": point(13, 4),
    "red": point(13, 13),
}

function game(): Game {
    const tiles: Tile[][] = [];

    // Create each row
    for (let y = 0; y < 18; y += 1) {
        tiles.push([]);
    }

    // create 18x18 board, 6x6 free zone at the middle, the remaining parts of the 4 quarters to each player
    for (let y = 0; y < 18; y += 1) {
        for (let x = 0; x < 18; x += 1) {
            if (x >= 6 && x < 12 && y >= 6 && y < 12) { // free zone
                tiles[y].push(free(x, y))
            } else if (x < 9 && y < 9) { // Zone 1, green
                tiles[y].push(owned(x, y, "green", empty()))
            } else if (x >= 9 && y < 9) { // Zone 2, orange
                tiles[y].push(owned(x, y, "orange", empty()))
            } else if (x >= 9 && y >= 9) { // Zone 3, blue
                tiles[y].push(owned(x, y, "blue", empty()))
            } else { // Zone 4, red
                tiles[y].push(owned(x, y, "red", empty()))
            }
        }
    }

    // make the mid section of each zone a city hall
    tiles[4][4] = owned(4, 4, "green", cityHall(0));
    tiles[4][13] = owned(4, 13, "orange", cityHall(0));
    tiles[13][13] = owned(13, 13, "blue", cityHall(0));
    tiles[13][4] = owned(13, 4, "red", cityHall(0));

    const users = [
        user("green", defaultResources(), defaultProductions()),
        user("orange", defaultResources(), defaultProductions()),
        user("blue", defaultResources(), defaultProductions()),
        user("red", defaultResources(), defaultProductions()),
    ];

    return { turn: "green", turns: 0, tiles, users, phase: planning() };
}

function render(game: Game) {
    const board = document.getElementById("board");
    if (!board) {
        throw Error("board does not exist in the page!");
    }


    for (let y = 0; y < 18; y += 1) {
        const tileRow = board.classList.contains("rendered")
            ? document.getElementById(`tilerow-${y}`)
            : (() => {
                const tileRow = document.createElement("div");
                tileRow.classList.add("tilerow");
                tileRow.id = `tilerow-${y}`;
                board.appendChild(tileRow);
                return tileRow;
            })();

        if (!tileRow) {
            throw Error("tile does not exist in the page!");
        }

        for (let x = 0; x < 18; x += 1) {
            const tileElement = board.classList.contains("rendered")
                ? document.getElementById(`tile-${y}-${x}`)
                : (() => {
                    const tileElement = document.createElement("div");
                    tileElement.classList.add("tile");
                    tileElement.id = `tile-${y}-${x}`;
                    tileRow.appendChild(tileElement);
                    return tileElement;
                })();

            if (!tileElement) {
                throw Error("tile does not exist in the page!");
            }

            const tile = game.tiles[y][x];
            if (!tile.owned) {
                tileElement.classList.add("free");
            } else {
                tileElement.classList.add("owned");
                tileElement.classList.add(tile.owner);
                tileElement.classList.add(tile.content.type_)
            }
        }
    }

    // biome-ignore lint/style/noNonNullAssertion:
    const turnIdentifier = document.getElementById("turn-identifier")!;
    turnIdentifier.classList.remove(prev(game.turn));
    turnIdentifier.classList.add(game.turn);

    const user = game.users.filter((user) => user.color === game.turn)[0];
    const productions = document.getElementsByClassName("production");
    const resources = document.getElementsByClassName("resource");
    console.log(game);
    for (let i = 0; i < productions.length; i++) {
        const production = productions[i];
        // biome-ignore lint/style/noNonNullAssertion: resource is always valid
        const resource = production.getAttribute("data-resource")!;
        // biome-ignore lint/style/noNonNullAssertion: owner is always valid
        const owner = production.getAttribute("data-owner")!;
        const user = game.users.filter((user) => user.color === owner)[0];
        production.textContent = user.production[resource];
    }

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        // biome-ignore lint/style/noNonNullAssertion: resource is always valid
        const resourceTyp = resource.getAttribute("data-resource")!;
        // biome-ignore lint/style/noNonNullAssertion: owner is always valid
        const owner = resource.getAttribute("data-owner")!;
        const user = game.users.filter((user) => user.color === owner)[0];
        resource.textContent = user.resources[resourceTyp];
    }

    if (game.phase.tag === "planning") {
        renderPlanning(game, user);
    } else {
        renderTiling(game, user, game.phase.tile)
    }


    if (!board.classList.contains("rendered")) {
        board.classList.add("rendered");
    }
}

function renderPlanning(game: Game, user: User) {
    const roadButtons = document.getElementsByClassName("road-button");
    for (let i = 0; i < roadButtons.length; i++) {
        const button = roadButtons[i];
        const roadType = button.getAttribute("data-road-type") as RoadType;
        const price = roadPrices[roadType];
        if (user.resources.dollar < price) {
            button.setAttribute("disabled", "true");
        } else {
            button.removeAttribute("disabled");
            button.addEventListener("click", () => {
                // go into tiling phase
                game.phase = tiling(road(roadType, 0));
                render(game);
            });
        }

    }
}

function accessibleFreeTiles(game: Game, user: User): Point[] {
    const startPoint = userCapital[user.color];
    // assume we have a crossroad at the capital
    const visited: Point[] = [startPoint];
    const toVisit: Point[] = [
        point(startPoint.x, startPoint.y - 1), // up
        point(startPoint.x, startPoint.y + 1), // down
        point(startPoint.x - 1, startPoint.y), // left
        point(startPoint.x + 1, startPoint.y), // right
    ];
    const accessible: Point[] = [];

    while (toVisit.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: -
        const p = toVisit.pop()!;
        visited.push(p)
        const tile = game.tiles[p.y][p.x];
        if (tile.owned && tile.owner === user.color) {
            switch (tile.content.type_) {
                case "empty": {
                    accessible.push({ x: tile.x, y: tile.y });
                    break;
                }
                case "road": {
                    const directions = accessibleDirections(tile.content);
                    if (directions.up ) {

                    }

                }
            }
        }
    }

    return accessible;
}

function renderTiling(game: Game, user: User, tile: Tilable) {
    switch (tile.type_) {
        case "road": {
            // Find accessible tiles.

            break;
        }
        case "production": {
            break;
        }
        case "action": {
            break;
        }
    }
}


function addTile(game: Game, tile: OwnedTile) {
    if (game.turn !== tile.owner) {
        throw Error("player is playing on a tile they do not own!")
    }

    const prevTile = game.tiles[tile.y][tile.y];

    if (prevTile.owned) {
        throw Error("player is playing on a tile that is already full!")
    }

    game.tiles[tile.y][tile.y] = tile;
}


function endTurn(game: Game) {
    game.turn = next(game.turn);
    game.turns += 1;
    if (game.turns % 4 === 0) {
        // production time
        for (const user of game.users) {
            for (const resource of resourceTypes) {
                user.resources[resource] += user.production[resource];
            }
        }
    }
}