# Multiplayer MVP Manual Test Plan

## Setup

1. Run `npm install` in `trades/`.
2. Run `npm install` in `server/`.
3. Start both apps with `npm run dev:all` from `trades/`.

## Two-Browser Checklist

- Browser A creates a room and copies the invite code.
- Browser B joins using the invite code.
- Host starts the game when both players are present.
- Player turns are enforced (out-of-turn actions are rejected).
- Place tiles and buy items from each client, confirm both boards stay synchronized.
- Trigger an invalid action (stale turn/version) and verify error is shown.
- Disconnect one browser tab and verify remaining player sees room update.
- Rejoin with a new tab and verify room can continue.

## Automated Checks

- Client engine tests: `npm test` in `trades/`.
- Server room/action tests: `npm test` in `server/`.
