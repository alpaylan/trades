# Trades

Trades is a trade route optimization and city building game. The board is a 18x18 square board, with a 6x6 squares neutral area in the middle, and is divided into 4 equal 9x9 regions allocated to each player. For more than 4 players, additional blocks are going to be added.

The game is divided into two phases, where the first phase is mostly route building, diplomacy and strategy design, and the second part is the city building, as well as preventing other players from building their cities.


![an illustration of the board](board.png)


## Rounds


Each round consists of multiple turns for each player, where each player can take maximum 2 actions per turn. If a player passes their turn, they cannot take any action until the next round. The round ends when all players pass their turns. The players receive their gold production at the beginning of each round, and they can use their gold to buy tiles or pay tolls.


At the end of each round, an “event” is drawn from the event deck. The event deck consists of 25 events, where the “switch to phase 2” event resides between 20th to 25th place randomly.


## Gold Production


The players start with a base gold production of 6 golds per round and need to buy and build production tiles to increase their gold inputs. There are 3 production tiles;


1. 1 gold production tile: costs 5 golds
2. 2 gold production tile: costs 15 golds
3. 3 gold production tile: costs 30 golds


In the second phase of the game, gold production can be switched to a different source according to the position of the player.


<?
   Kaynaklar neler?
   Günün sonunda temel amaç ne? Oyunu kazanan nasıl kazanıyor?
![production tiles](production.png)


At any point, a player receives half of their gold production at the beginning of their route, and the other half at the end. If production is an odd number, the extra gold goes to the beginning. (7 becomes 4 + 3 instead of 3 + 4)


The players can only receive payment for production tiles they have "routes" to, where routes consist of contiguous
road tiles.


## Road Tiles


There are 4 rectangular road tiles. The rectangular roads can be used to connect 2, 2, 3, and 4 tiles together.


Below is an illustration of the road tiles and their costs.


1. Straight road: costs 2 golds  
2. L-shaped road: costs 3 golds  
3. T-shaped road: costs 4 golds  
4. Crossroad: costs 7 golds
<?
   Random alınacak tile neye göre belirlenecek?
>
The players can also buy random road tiles for 4 gold. This is a risky move, as crossroads are rare, and the player might end up overpaying for a straight or L-shaped road.
<!
>
When a player gets a random tile, the player specifies where to place it and rolls a die. If the dice the player rolls is 1, the player gets the right to place it as straight road, if 2, the player gets the right to place it as L-shaped road, if 3, the player gets the right to place it as T-shaped road and if 4, the player gets the right to place it as Crossroad. However, if 5 or 6 is rolled, the dice is rolled again. If the re-roll is performed 3 times, the road becomes blocked (Blocked Tile status). The player can remove this in the next round by spending extra gold.
<


![road tiles](road.png)


Typically, building one route to a production tile might be insufficient, as the other players might block the route with roadblocks, which cuts access to production. Such roadblocks are parts of action tiles.


## Action Tiles


There are 4 action tiles, they can only be bought for 5 gold.


1. Turn road: rotates any selected road tile 90 or 180 degrees
2. Roadblock: blocks any selected road tile
3. Unblock: unblocks any selected road tile
4. Toll: forces a player to pay 1 gold every time they pass through a road tile
![action tiles](action.png)


## Buff Tiles (??)


Buff tiles are stronger than action tiles, and they cannot be bought, but only earned.


1. Quite Steps: Player pays no tolls for 3 rounds
2. Greedy Inn: Player doubles their tolls for 3 rounds
3. Road Guardian: Player can mark a road tile as unblockable.
4. Bridge: A player can upgrade a road file by adding a new direction to it(up, down, left diagonal, right diagonal).
5. Banker: Player can upgrade a production tile.
6. Roadster: Player gets 2 random road tiles for free.


![buff tiles](buff.png)


## Phase 1


As mentioned before, Trades is a two-phase game, where the first phase is mostly about route building, diplomacy, and strategy design. The players start with a base gold production of 6 gold, buy and lay road and production tiles, and use the road tiles to connect their city centers to production tiles. Players can put roadblocks to prevent other players from accessing
their production tiles, and build tolls onto their road infrastructures to tax other players.


After “Switched to phase 2” event card is drawn,  8 buff tiles are randomly drawn from the deck. The first player looks at all the cards, picks 2 of them, and gives the remaining 6 to the next player. The next player picks 2 of them and gives the remaining 4 to the next player, and so on.


After all players have their 2 cards, they put 1 of their cards to their corner of the board face down, and they put the second card to the shared hub with one of their neighbors. Shared hubs are 9-10,0, 18,9-10, 9-10,18, and 0,9-10 coordinates on the board.


The cards in the shared hubs are {todo:X'd}.


Once any two players reach one of the 4 center tiles, the game moves into the second phase.


## Phase 2


Players can produce any source, including other players' one, in the neutral area. Additionally, any player reaching that source can produce the same source.


<?
   Bir kaynağa birden fazla oyuncu ulaşırsa kaynak miktarı ulaşan oyuncu sayısına mı bölünür yoksa herkes tam kapasite üretim mi yapar?
>


The players need all the resources to complete the game. Therefore, a trade is almost inevitable. The only way is to use neutral area production.


The players will upgrade their city centers 4 times. The first upgrade will require using only their own resources, the second will require using 2 different resources, the third will require using 3 different resources, and the last upgrade will require using all 4 resources. The player who upgrades their own city 4 times first wins the game.


The upgrades will require randomized compositions of resources, with a specific order according to the players' affinity. The nations are Romans that excel in Science, Vikings that excel as Warriors, Egyptians that excel in Agriculture, and Aztecs who are excellent Builders. The players will be assigned to one of these nations, and they will be able to produce resources according to their nations. The players will be able to trade resources with each other, but they will not be able to produce resources that are not in their affinity. The nations are as follows:


1. Romans: Crystal
2. Vikings: Steel
3. Egyptians: Food
4. Aztecs: Stone




















1. Long Rulebook Opening – Immersive Lore Introduction
(This version goes at the beginning of the rulebook. It’s immersive, detailed, and sets the stage for the game’s strategic depth and narrative atmosphere.)

Trades: The Chronicles of the Great Conflux
In an age when the world was still shaped by the ambitions of empires and the whisper of trade winds echoed across vast frontiers… four great civilizations rose to power.
The Romans, masters of science and crystal, envisioned cities of enlightenment.
The Vikings, forged from steel and storm, sought dominance through might.
The Egyptians, blessed by fertile lands and ancient knowledge, grew prosperity from the earth.
And the Aztecs, builders of temples and wonders, saw every stone as a prayer to the gods.
But a challenge stood before them all.
At the heart of the known world lies the Neutral Zone — a land rich in rare resources but unclaimed by any.
 Though no city may rise there, it is a land where production thrives, and only those bold enough to build routes into its heart may tap into its wealth.
To complete the four stages of city development, each civilization must not only rely on its own strengths, but also trade, bargain, or compete for the resources it lacks.
 Only by uniting all four key resources — Crystal, Steel, Food, and Stone — can a player ascend their city to greatness.
But beware:
 Paths can be blocked.
 Tolls can be levied.
 And trust, like a trade route, is fragile.
The first civilization to complete all four upgrades will be immortalized in history.
 Whether through diplomacy, sabotage, or brilliance, only one city shall lead the new era.
Welcome to Trades.
 Build wisely, trade strategically, and rise above all others.

📦 2. Back of the Box Summary – Clear & Catchy
(This version is shorter, clear, and designed to entice players browsing the game on shelves.)

Trades
A Strategic Game of Trade Routes, Resource Power, and City Domination
In Trades, you are the leader of a legendary civilization:
 The scientific Romans, the powerful Vikings, the fertile Egyptians, or the master builders, the Aztecs.
Your goal?
 To be the first to fully upgrade your city, advancing through four stages of development.
Build roads. Control resources. Block rivals. Set tolls.
 Access to the neutral zone is vital — it holds the resources you need but belongs to no one.
You’ll need your own nation’s strength — but also the others’ power.
 Only through trade, negotiation, and clever strategy can you gather the four unique resources:
 Crystal, Steel, Food, and Stone.
Will you forge alliances, build empires — or burn bridges?
The road to victory is never straight. Welcome to the world of Trades.









