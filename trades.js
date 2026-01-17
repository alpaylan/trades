function point(x, y) { return { x: x, y: y }; }
;
function free(x, y) { return { x: x, y: y, owned: false }; }
function next(owner) {
    switch (owner) {
        case "green": return "orange";
        case "orange": return "blue";
        case "blue": return "red";
        case "red": return "green";
    }
}
function prev(owner) {
    switch (owner) {
        case "green": return "red";
        case "red": return "blue";
        case "blue": return "orange";
        case "orange": return "green";
    }
}
function owned(x, y, owner, content) {
    return { x: x, y: y, owned: true, owner: owner, content: content };
}
function empty() { return { type_: "empty" }; }
function cityHall(level) {
    return { type_: "hall", level: level };
}
function road(road, rotation) {
    return { type_: "road", road: road, rotation: rotation };
}
function directions(up, right, bottom, left) {
    return { up: up, right: right, bottom: bottom, left: left };
}
function accessibleDirections(road) {
    switch (road.road) {
        case "i": {
            switch (road.rotation) {
                case 0:
                case 180: // left or right
                    return directions(false, true, false, true);
                case 90:
                case 270: // up or down
                    return directions(true, false, true, false);
                default: throw Error("unreachable");
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
                default: throw Error("unreachable");
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
                default: throw Error("unreachable");
            }
        }
        case "plus": return directions(true, true, true, true);
        default: throw Error("unreachable");
    }
}
var roadPrices = {
    i: 2,
    l: 3,
    t: 5,
    plus: 8,
    random: 5
};
function production(production, level) {
    return { type_: "production", production: production, level: level };
}
function action(action) {
    return { type_: "action", action: action };
}
var actionPrices = {
    turn: 5,
    toll: 5,
    block: 5,
    unblock: 5
};
function planning() { return { tag: "planning" }; }
;
function tiling(tile) { return { tag: "tiling", tile: tile }; }
;
var resourceTypes = ["dollar", "wood", "steel", "stone", "coal"];
function zero() {
    return {
        dollar: 0,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}
function defaultResources() {
    return {
        dollar: 20,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}
function defaultProductions() {
    return {
        dollar: 6,
        wood: 0,
        steel: 0,
        stone: 0,
        coal: 0,
    };
}
function user(color, resources, production) {
    return { color: color, resources: resources, production: production };
}
var userCapital = {
    "green": point(4, 4),
    "orange": point(4, 13),
    "blue": point(13, 4),
    "red": point(13, 13),
};
function game() {
    var tiles = [];
    // Create each row
    for (var y = 0; y < 18; y += 1) {
        tiles.push([]);
    }
    // create 18x18 board, 6x6 free zone at the middle, the remaining parts of the 4 quarters to each player
    for (var y = 0; y < 18; y += 1) {
        for (var x = 0; x < 18; x += 1) {
            if (x >= 6 && x < 12 && y >= 6 && y < 12) { // free zone
                tiles[y].push(free(x, y));
            }
            else if (x < 9 && y < 9) { // Zone 1, green
                tiles[y].push(owned(x, y, "green", empty()));
            }
            else if (x >= 9 && y < 9) { // Zone 2, orange
                tiles[y].push(owned(x, y, "orange", empty()));
            }
            else if (x >= 9 && y >= 9) { // Zone 3, blue
                tiles[y].push(owned(x, y, "blue", empty()));
            }
            else { // Zone 4, red
                tiles[y].push(owned(x, y, "red", empty()));
            }
        }
    }
    // make the mid section of each zone a city hall
    tiles[4][4] = owned(4, 4, "green", cityHall(0));
    tiles[4][13] = owned(4, 13, "orange", cityHall(0));
    tiles[13][13] = owned(13, 13, "blue", cityHall(0));
    tiles[13][4] = owned(13, 4, "red", cityHall(0));
    var users = [
        user("green", defaultResources(), defaultProductions()),
        user("orange", defaultResources(), defaultProductions()),
        user("blue", defaultResources(), defaultProductions()),
        user("red", defaultResources(), defaultProductions()),
    ];
    return { turn: "green", turns: 0, tiles: tiles, users: users, phase: planning() };
}
function render(game) {
    var board = document.getElementById("board");
    if (!board) {
        throw Error("board does not exist in the page!");
    }
    var _loop_1 = function (y) {
        var tileRow = board.classList.contains("rendered")
            ? document.getElementById("tilerow-".concat(y))
            : (function () {
                var tileRow = document.createElement("div");
                tileRow.classList.add("tilerow");
                tileRow.id = "tilerow-".concat(y);
                board.appendChild(tileRow);
                return tileRow;
            })();
        if (!tileRow) {
            throw Error("tile does not exist in the page!");
        }
        var _loop_4 = function (x) {
            var tileElement = board.classList.contains("rendered")
                ? document.getElementById("tile-".concat(y, "-").concat(x))
                : (function () {
                    var tileElement = document.createElement("div");
                    tileElement.classList.add("tile");
                    tileElement.id = "tile-".concat(y, "-").concat(x);
                    tileRow.appendChild(tileElement);
                    return tileElement;
                })();
            if (!tileElement) {
                throw Error("tile does not exist in the page!");
            }
            var tile = game.tiles[y][x];
            if (!tile.owned) {
                tileElement.classList.add("free");
            }
            else {
                tileElement.classList.add("owned");
                tileElement.classList.add(tile.owner);
                tileElement.classList.add(tile.content.type_);
            }
        };
        for (var x = 0; x < 18; x += 1) {
            _loop_4(x);
        }
    };
    for (var y = 0; y < 18; y += 1) {
        _loop_1(y);
    }
    // biome-ignore lint/style/noNonNullAssertion:
    var turnIdentifier = document.getElementById("turn-identifier");
    turnIdentifier.classList.remove(prev(game.turn));
    turnIdentifier.classList.add(game.turn);
    var user = game.users.filter(function (user) { return user.color === game.turn; })[0];
    var productions = document.getElementsByClassName("production");
    var resources = document.getElementsByClassName("resource");
    console.log(game);
    var _loop_2 = function (i) {
        var production_1 = productions[i];
        // biome-ignore lint/style/noNonNullAssertion: resource is always valid
        var resource = production_1.getAttribute("data-resource");
        // biome-ignore lint/style/noNonNullAssertion: owner is always valid
        var owner = production_1.getAttribute("data-owner");
        var user_1 = game.users.filter(function (user) { return user.color === owner; })[0];
        production_1.textContent = user_1.production[resource];
    };
    for (var i = 0; i < productions.length; i++) {
        _loop_2(i);
    }
    var _loop_3 = function (i) {
        var resource = resources[i];
        // biome-ignore lint/style/noNonNullAssertion: resource is always valid
        var resourceTyp = resource.getAttribute("data-resource");
        // biome-ignore lint/style/noNonNullAssertion: owner is always valid
        var owner = resource.getAttribute("data-owner");
        var user_2 = game.users.filter(function (user) { return user.color === owner; })[0];
        resource.textContent = user_2.resources[resourceTyp];
    };
    for (var i = 0; i < resources.length; i++) {
        _loop_3(i);
    }
    if (game.phase.tag === "planning") {
        renderPlanning(game, user);
    }
    else {
        renderTiling(game, user, game.phase.tile);
    }
    if (!board.classList.contains("rendered")) {
        board.classList.add("rendered");
    }
}
function renderPlanning(game, user) {
    var roadButtons = document.getElementsByClassName("road-button");
    var _loop_5 = function (i) {
        var button = roadButtons[i];
        var roadType = button.getAttribute("data-road-type");
        var price = roadPrices[roadType];
        if (user.resources.dollar < price) {
            button.setAttribute("disabled", "true");
        }
        else {
            button.removeAttribute("disabled");
            button.addEventListener("click", function () {
                // go into tiling phase
                game.phase = tiling(road(roadType, 0));
                render(game);
            });
        }
    };
    for (var i = 0; i < roadButtons.length; i++) {
        _loop_5(i);
    }
}
function accessibleFreeTiles(game, user) {
    var startPoint = userCapital[user.color];
    // assume we have a crossroad at the capital
    var visited = [startPoint];
    var toVisit = [
        point(startPoint.x, startPoint.y - 1), // up
        point(startPoint.x, startPoint.y + 1), // down
        point(startPoint.x - 1, startPoint.y), // left
        point(startPoint.x + 1, startPoint.y), // right
    ];
    var accessible = [];
    while (toVisit.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: -
        var p = toVisit.pop();
        visited.push(p);
        var tile = game.tiles[p.y][p.x];
        if (tile.owned && tile.owner === user.color) {
            switch (tile.content.type_) {
                case "empty": {
                    accessible.push({ x: tile.x, y: tile.y });
                    break;
                }
                case "road": {
                    var directions_1 = accessibleDirections(tile.content);
                    if (directions_1.up) {
                    }
                }
            }
        }
    }
    return accessible;
}
function renderTiling(game, user, tile) {
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
function addTile(game, tile) {
    if (game.turn !== tile.owner) {
        throw Error("player is playing on a tile they do not own!");
    }
    var prevTile = game.tiles[tile.y][tile.y];
    if (prevTile.owned) {
        throw Error("player is playing on a tile that is already full!");
    }
    game.tiles[tile.y][tile.y] = tile;
}
function endTurn(game) {
    game.turn = next(game.turn);
    game.turns += 1;
    if (game.turns % 4 === 0) {
        // production time
        for (var _i = 0, _a = game.users; _i < _a.length; _i++) {
            var user_3 = _a[_i];
            for (var _b = 0, resourceTypes_1 = resourceTypes; _b < resourceTypes_1.length; _b++) {
                var resource = resourceTypes_1[_b];
                user_3.resources[resource] += user_3.production[resource];
            }
        }
    }
}
