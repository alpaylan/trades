import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://trades-web-3703.fly.dev";
const OUTPUT_DIR = path.resolve("artifacts/videos");
const TARGET_DURATION_MS = 36_000;
const STEP_PAUSE_MS = 350;

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function startLocalMode(page) {
	await page.goto(BASE_URL);
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function clickStore(page, titlePart) {
	await page.locator(`button[title*="${titlePart}"]`).first().click();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function clickTile(page, x, y) {
	await page.locator(`#tile-${y}-${x}`).click();
}

async function clickFirstEnabledBoardTile(page) {
	await page
		.locator("#board-area button.tile:not([disabled])")
		.first()
		.click();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function selectFirstInventoryTile(page) {
	const inventoryButton = page.locator("#inventory .inventory-item button").first();
	await inventoryButton.waitFor({ state: "visible" });
	await inventoryButton.click();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function placeOnFirstPulsingTile(page) {
	const pulsing = page.locator("#board-area button.tile.pulsing:not([disabled])").first();
	await pulsing.waitFor({ state: "visible" });
	await pulsing.click();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function clickEndTurn(page) {
	await page.getByRole("button", { name: "End Turn" }).click();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function clickUndo(page) {
	const undo = page.getByRole("button", { name: "Undo" });
	await undo.waitFor({ state: "visible" });
	const enabled = await undo.isEnabled();
	if (!enabled) {
		return false;
	}
	await undo.click();
	await page.waitForTimeout(STEP_PAUSE_MS);
	return true;
}

async function playValidProductionTurn(page, turnLabel) {
	await page.getByText(new RegExp(`Turn:\\s*${turnLabel}`, "i")).waitFor();
	await clickStore(page, "+1 gold production");
	await selectFirstInventoryTile(page);
	await placeOnFirstPulsingTile(page);
	await clickEndTurn(page);
}

async function playValidRoadTurn(page, turnLabel) {
	await page.getByText(new RegExp(`Turn:\\s*${turnLabel}`, "i")).waitFor();
	await clickStore(page, "Straight road");
	await selectFirstInventoryTile(page);
	await placeOnFirstPulsingTile(page);
	await clickEndTurn(page);
}

async function playRoadRound(page) {
	await playValidRoadTurn(page, "green");
	await playValidRoadTurn(page, "orange");
	await playValidRoadTurn(page, "blue");
	await playValidRoadTurn(page, "red");
}

async function recordScenario(browser, name, run) {
	const rawDir = path.join(OUTPUT_DIR, "raw", name);
	await ensureDir(rawDir);
	const context = await browser.newContext({
		recordVideo: {
			dir: rawDir,
			size: { width: 1280, height: 720 },
		},
	});
	const page = await context.newPage();
	const video = page.video();
	if (!video) {
		throw new Error(`Missing video handle for scenario "${name}"`);
	}

	const startedAt = Date.now();
	try {
		await run(page);
		const elapsed = Date.now() - startedAt;
		if (elapsed < TARGET_DURATION_MS) {
			await page.waitForTimeout(TARGET_DURATION_MS - elapsed);
		}
	} finally {
		await context.close();
	}

	const finalPath = path.join(OUTPUT_DIR, `${name}.webm`);
	await video.saveAs(finalPath);
	console.log(`Saved: ${finalPath}`);
}

async function main() {
	await ensureDir(OUTPUT_DIR);
	const browser = await chromium.launch({ headless: true });
	try {
		await recordScenario(browser, "gameplay-multi-turn", async (page) => {
			await startLocalMode(page);
			// Three full rounds at high speed for denser progression evidence.
			await playRoadRound(page);
			await playRoadRound(page);
			await playRoadRound(page);
		});

		await recordScenario(browser, "gameplay-invalid-actions", async (page) => {
			await startLocalMode(page);
			await clickStore(page, "+1 gold production");
			// Free-zone center tile should reject placement.
			await page.locator("#tile-7-7").click({ force: true });
			await page.waitForTimeout(400);
			// Opponent corner tile should reject placement for current player.
			await page.locator("#tile-0-12").click({ force: true });
			await page.waitForTimeout(400);
			// Valid placement after invalid attempts.
			await clickFirstEnabledBoardTile(page);
			await page.waitForTimeout(500);
		});

		await recordScenario(browser, "gameplay-undo-chain", async (page) => {
			await startLocalMode(page);
			await clickStore(page, "Straight road");
			await selectFirstInventoryTile(page);
			await placeOnFirstPulsingTile(page);
			await clickStore(page, "Straight road");
			await selectFirstInventoryTile(page);
			await placeOnFirstPulsingTile(page);
			for (let i = 0; i < 6; i += 1) {
				// Keep undoing until history is exhausted.
				const clicked = await clickUndo(page);
				if (!clicked) {
					break;
				}
			}
		});

		await recordScenario(browser, "gameplay-round-end-flow", async (page) => {
			await startLocalMode(page);
			// Two full end-of-round cycles back-to-back.
			for (let i = 0; i < 2; i += 1) {
				await clickEndTurn(page);
				await clickEndTurn(page);
				await clickEndTurn(page);
				await clickEndTurn(page);
				await page.locator(".event-card-overlay").waitFor();
				await page.locator(".event-card-overlay").click();
				await page.waitForTimeout(STEP_PAUSE_MS);
			}
		});
	} finally {
		await browser.close();
	}
}

await main();
