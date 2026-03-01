# Trades — Rulebook TODO Checklist (Open Design Decisions)

This file is a checklist of **missing / underspecified gameplay rules** inferred from the current `README.md` description. It intentionally contains **no new details or proposals**—only questions to answer.

---

## Setup & Player Count

- [ ] **Player count support**: What player counts are supported (min/max)?
- [ ] **Board scaling**: For >4 players, what does “additional blocks” mean (shape/placement), and how does it preserve fairness?
- [ ] **Starting positions**: Confirm starting city hall locations for each player and how they change with board scaling.
- [ ] **Starting state**: Define starting **gold/resources**, starting **inventory**, and any **free placements** at game start.
- [ ] **Nation assignment**: How are nations assigned/chosen? Can multiple players be the same nation?
- [ ] **Nation effects**: Beyond resource affinity, do nations confer any other gameplay effects?

## Terminology (Must Be Defined Precisely)

- [ ] **“Route”**: What is a route in rules terms (connectivity only vs movement/traversal)?
- [ ] **“Pass through”**: What constitutes passing through a road tile (movement event, production collection event, entering/exiting, etc.)?
- [ ] **“Reach” / “reach a tile”**: What counts as reaching a center tile or a source?
- [ ] **“Produce”**: What does “produce a source” mean mechanically and when does it happen?
- [ ] **Coordinates**: Standardize coordinate system and how tiles/areas are referenced in rules.

## Turn / Round Structure

- [ ] **Turn structure**: Define the exact sequence of steps in a player’s turn.
- [ ] **Action limit**: What counts as an “action” (buying, placing, using an action tile, trading, etc.)?
- [ ] **Passing**: Can a player un-pass within the same round? Is passing public? Are any non-action activities allowed after passing?
- [ ] **Round end**: Confirm when the round ends and what happens at round end (and in what order).
- [ ] **Income timing**: “Gold production at beginning of each round” vs “half at beginning of route, half at end” — reconcile timing and define the authoritative flow.

## Board Regions, Ownership, and Placement Rules

- [ ] **Where tiles may be placed**: Which tiles can be placed in:
  - [ ] A player’s own 9x9 region
  - [ ] Another player’s region
  - [ ] The neutral area
- [ ] **Ownership in neutral**: If players place in neutral area, who owns those placed tiles (if anyone)?
- [ ] **Crossing boundaries**: Can roads connect across region borders? If yes, what permissions/constraints apply?
- [ ] **Overwriting**: Can a tile replace an existing tile? If yes, which types can overwrite which?
- [ ] **Illegal placements**: Define what makes a placement illegal and what happens if a player attempts it.

## Roads (Tile Shapes, Connectivity, and Legality)

- [ ] **Road shapes**: Precisely define the connectivity of each road tile type and allowed rotations.
- [ ] **Supply**: Are road tiles unlimited supply, limited supply, or deck/bag-based?
- [ ] **Placement constraints**: Are dead ends allowed? Must roads connect to existing network? Any restrictions near city halls/production?
- [ ] **Diagonal connectivity**: If any mechanic introduces diagonals, define whether diagonal adjacency/connectivity exists globally or only via specific effects.

## Production Tiles & Gold Production

- [ ] **Production tile placement**: Where can production tiles be placed and how many (limits per player/type/level)?
- [ ] **Connectivity requirement**: Define exactly when a production tile counts as connected to a player’s city/roads for earning.
- [ ] **Production payout model**: Formalize “half at beginning / half at end” (what begins/ends, how it triggers, and whether it implies movement).
- [ ] **Odd production split**: Confirm odd-split rule and how it applies across multiple sources.
- [ ] **Phase 2 conversion**: “Gold production can be switched to a different source according to the position” — define:
  - [ ] What positions qualify
  - [ ] What sources are available
  - [ ] Whether this is temporary or permanent
  - [ ] Whether conversion is 1:1 or otherwise (no numbers here—just define the rule shape)

## Buying Tiles (Store / Costs / Limits)

- [ ] **Purchase timing**: When can players buy tiles (during their turn only, limited times, etc.)?
- [ ] **Purchase limits**: Any per-turn/per-round caps?
- [ ] **Tile availability**: Is everything always buyable, or does stock run out / rotate?
- [ ] **Currency naming**: Standardize “gold” vs other currency terminology.

## Random Road Tile Purchase Mechanic

- [ ] **Random selection method**: Define distribution (uniform vs weighted vs deck/bag).
- [ ] **Placement-before-roll flow**: If the player picks a location before rolling, define:
  - [ ] What happens if the rolled shape/rotation can’t be legally placed there
  - [ ] Whether the player may change the target after seeing the roll
- [ ] **Reroll loop**: Define exact reroll conditions and limits (the README mentions rerolling on 5/6 and a 3-reroll blocked outcome).
- [ ] **Blocked outcome**: Define “blocked tile status” produced by this system:
  - [ ] What it blocks (movement/production/placement)
  - [ ] Duration
  - [ ] Removal timing and cost structure (shape only; no numbers)

## Action Tiles (Turn / Block / Unblock / Toll)

- [ ] **Target rules**: Can action tiles target any road tile or only specific subsets (own tiles, connected tiles, within region, etc.)?
- [ ] **Turn action**: Clarify allowed rotations (90 and/or 180) and whether player chooses freely.
- [ ] **Block action**: Define what “blocked” means mechanically (impassable for whom, effect on production connectivity, etc.).
- [ ] **Unblock action**: Can any block be removed? Are there protected/unblockable states?
- [ ] **Toll action**: Define:
  - [ ] Who pays whom
  - [ ] When toll triggers (“pass through” definition)
  - [ ] Whether toll stacks, can be toggled, or can be removed
  - [ ] Whether owners pay their own tolls

## Events Deck

- [ ] **Event timing**: Events occur “at end of round” — define exact ordering relative to income, passing, and phase checks.
- [ ] **Event effects**: Define the categories of events and whether they target one player, multiple, or global state.
- [ ] **Duration rules**: How long event effects last and how they expire.
- [ ] **Phase switch card placement**: Define how the “switch to phase 2” card is inserted (and whether it can be manipulated/known).

## Buff Tiles (Earned, Not Bought)

- [ ] **How to earn**: Define how buff tiles are obtained (events, milestones, etc.).
- [ ] **Timing of acquisition/use**: When can buffs be played/activated?
- [ ] **Duration & stacking**: For multi-round buffs, define stacking/refresh rules and how rounds are counted.
- [ ] **Buff definitions (need formal rules)**:
  - [ ] **Quiet Steps**: Exactly which toll interactions are negated and when.
  - [ ] **Greedy Inn**: Does it double tolls paid or tolls collected? Which tiles are affected?
  - [ ] **Road Guardian**: What does “unblockable” mean, for how long, and can it be overridden?
  - [ ] **Bridge**: Define “upgrade a road tile by adding a new direction” (and how this interacts with diagonal rules, if any).
  - [ ] **Banker**: Define what “upgrade a production tile” means (caps, eligibility, permanence).
  - [ ] **Roadster**: Define randomness method and whether it follows the same rules as random road purchase.

## Phase 1 → Phase 2 Transition

- [ ] **Authoritative trigger**: README currently mentions both:
  - [ ] Phase 2 starts when the “switch to phase 2” event is drawn
  - [ ] Phase 2 starts once any two players reach one of the 4 center tiles
  - [ ] Decide how these interact (which is required, sufficient, or if one replaces the other)
- [ ] **Transition procedure**: Define what happens immediately when Phase 2 begins (cleanup, new rules toggled, new decks/buffs, etc.).
- [ ] **Buff draft procedure**: The “8 buff tiles / pick-and-pass / place to corner + shared hub” flow needs precise rules:
  - [ ] What exactly is a “shared hub” (tile/space/zone)?
  - [ ] Where are shared hubs exactly (coordinates must be unambiguous)
  - [ ] What does “cards in shared hubs are X’d” mean mechanically?
  - [ ] When and how can players reveal/use the face-down cards placed in corners/hubs?

## Phase 2: Neutral Zone Production & Contention

- [ ] **Neutral production rule**: “Players can produce any source, including other players’, in the neutral area” — formalize:
  - [ ] What counts as “other players’ source” in neutral context
  - [ ] Whether production is duplicated or shared when multiple players reach the same source
  - [ ] Timing of gaining access (immediate vs next round)
- [ ] **Building restrictions in neutral**: Confirm whether city buildings are forbidden in neutral and what that implies for tile placement types.

## Trading / Diplomacy System

- [ ] **When trades can happen**: Any time vs only on your turn vs only during a phase/step.
- [ ] **What can be traded**: Resources only vs also tiles, future production, promises, etc.
- [ ] **Binding/enforcement**: Are trades enforced by rules/components or purely social agreements?
- [ ] **Visibility**: Are trades public or private?

## City Upgrades & Victory

- [ ] **Upgrade requirements**: You describe “1/2/3/4 different resources” — define:
  - [ ] The amounts required
  - [ ] Whether requirements are fixed or randomized and how randomization works
  - [ ] Whether requirements differ by nation/affinity
- [ ] **Upgrade timing**: When can upgrades be performed (turn step, action cost, etc.)?
- [ ] **Upgrade effects**: What each upgrade changes mechanically (if anything besides progress to win).
- [ ] **Blocking victory**: What does “preventing other players from building their cities” mean mechanically (what tools exist, what’s allowed/disallowed)?

## Consistency Checks (Rules ↔ Implementation ↔ Assets)

- [ ] **Resource set**: README uses a 4-resource set (nation affinities) while implementation/assets currently reference different resource names/types—choose the canonical set and reconcile everywhere.
- [ ] **Costs**: Road/action tile costs and random-road rules should be consistent across sections.
- [ ] **Phase rules**: Ensure Phase 1/2 rules don’t contradict (trigger conditions, production rules, placement permissions).

