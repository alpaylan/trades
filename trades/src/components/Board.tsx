import { accessibleCanalTiles, accessibleFreeTiles, hasPlayerSelectedWell } from "../logic/Game";
import { useGlobalContext } from "../logic/State";
import Tile from "./Tile";

export default function Board() {
	const { state } = useGlobalContext();
	const { game } = state;

	const user = game.users[game.turn];
	const accessibles = accessibleFreeTiles(game, user);
	const canalAccessibles = accessibleCanalTiles(game, user);
	const wellSelectionMode =
		game.round === 1 && !hasPlayerSelectedWell(game, game.turn);

	const roll = state.speculativeInvestmentRoll;
	const speculativeTargetByKey: Record<string, "downgrade" | "upgrade"> = {};
	if (roll === 1 || roll === 2 || roll === 5 || roll === 6) {
		const current = game.turn;
		for (const key of Object.keys(game.tiles)) {
			const t = game.tiles[key];
			if (
				!t.owned ||
				t.owner !== current ||
				t.content.type_ !== "production" ||
				t.content.production !== "dollar"
			)
				continue;
			if (roll === 1 || roll === 2) {
				speculativeTargetByKey[key] = "downgrade";
			} else if (t.content.level < 3) {
				speculativeTargetByKey[key] = "upgrade";
			}
		}
	}

	return (
		<div>
			{wellSelectionMode && (
				<div
					style={{
						textAlign: "center",
						padding: "0.2rem 0.4rem",
						backgroundColor: "rgba(33, 150, 243, 0.12)",
						borderRadius: 4,
						marginBottom: "0.25rem",
						fontSize: "0.7rem",
						fontWeight: 600,
						color: "#1565c0",
					}}
				>
					Select the location of your water well
				</div>
			)}
			{Array.from({ length: 18 }, (_, y) => {
				return (
					<div
						style={{ display: "flex", flexDirection: "row" }}
						key={`row-${y}`}
					>
						{Array.from({ length: 18 }, (_, x) => {
							const tile = game.tiles[`${y}-${x}`];

							const accessible = accessibles.find(
								(t) => t.x === tile.x && t.y === tile.y,
							);
							const canalAccessible = canalAccessibles.find(
								(t) => t.x === tile.x && t.y === tile.y,
							);

							const speculativeTarget =
								speculativeTargetByKey[`${tile.y}-${tile.x}`] ?? null;
							return Tile({
								tile,
								accessible: accessible ?? null,
								canalAccessible: canalAccessible ?? null,
								speculativeTarget,
							});
						})}
					</div>
				);
			})}
		</div>
	);
}
// function render(game: Game) {

//     for (let y = 0; y < 18; y += 1) {
//         const tileRow = board.classList.contains("rendered")
//             ? document.getElementById(`tilerow-${y}`)
//             : (() => {
//                 const tileRow = document.createElement("div");
//                 tileRow.classList.add("tilerow");
//                 tileRow.id = `tilerow-${y}`;
//                 board.appendChild(tileRow);
//                 return tileRow;
//             })();

//         if (!tileRow) {
//             throw Error("tile does not exist in the page!");
//         }

//         for (let x = 0; x < 18; x += 1) {
//             const tileElement = board.classList.contains("rendered")
//                 ? document.getElementById(`tile-${y}-${x}`)
//                 : (() => {
//                     const tileElement = document.createElement("div");
//                     tileElement.classList.add("tile");
//                     tileElement.id = `tile-${y}-${x}`;
//                     tileRow.appendChild(tileElement);
//                     return tileElement;
//                 })();

//             if (!tileElement) {
//                 throw Error("tile does not exist in the page!");
//             }

//             const tile = game.tiles[y][x];
//             if (!tile.owned) {
//                 tileElement.classList.add("free");
//             } else {
//                 tileElement.classList.add("owned");
//                 tileElement.classList.add(tile.owner);
//                 tileElement.classList.add(tile.content.type_)
//             }
//         }
//     }

//     // biome-ignore lint/style/noNonNullAssertion:
//     const turnIdentifier = document.getElementById("turn-identifier")!;
//     turnIdentifier.classList.remove(prev(game.turn));
//     turnIdentifier.classList.add(game.turn);

//     const user = game.users.filter((user) => user.color === game.turn)[0];
//     const productions = document.getElementsByClassName("production");
//     const resources = document.getElementsByClassName("resource");
//     console.log(game);
//     for (let i = 0; i < productions.length; i++) {
//         const production = productions[i];
//         // biome-ignore lint/style/noNonNullAssertion: resource is always valid
//         const resource = production.getAttribute("data-resource")!;
//         // biome-ignore lint/style/noNonNullAssertion: owner is always valid
//         const owner = production.getAttribute("data-owner")!;
//         const user = game.users.filter((user) => user.color === owner)[0];
//         production.textContent = user.production[resource];
//     }

//     for (let i = 0; i < resources.length; i++) {
//         const resource = resources[i];
//         // biome-ignore lint/style/noNonNullAssertion: resource is always valid
//         const resourceTyp = resource.getAttribute("data-resource")!;
//         // biome-ignore lint/style/noNonNullAssertion: owner is always valid
//         const owner = resource.getAttribute("data-owner")!;
//         const user = game.users.filter((user) => user.color === owner)[0];
//         resource.textContent = user.resources[resourceTyp];
//     }

//     if (game.phase.tag === "planning") {
//         renderPlanning(game, user);
//     } else {
//         renderTiling(game, user, game.phase.tile)
//     }
// }

// function renderPlanning(game: Game, user: User) {
//     const roadButtons = document.getElementsByClassName("road-button");
//     for (let i = 0; i < roadButtons.length; i++) {
//         const button = roadButtons[i];
//         const roadType = button.getAttribute("data-road-type") as RoadType;
//         const price = roadPrices[roadType];
//         if (user.resources.dollar < price) {
//             button.setAttribute("disabled", "true");
//         } else {
//             button.removeAttribute("disabled");
//             button.addEventListener("click", () => {
//                 // go into tiling phase
//                 game.phase = tiling(road(roadType, 0));
//                 render(game);
//             });
//         }

//     }
// }

// function renderTiling(game: Game, user: User, tile: Tilable) {
//     switch (tile.type_) {
//         case "road": {
//             // Find accessible tiles.

//             break;
//         }
//         case "production": {
//             break;
//         }
//         case "action": {
//             break;
//         }
//     }
// }
