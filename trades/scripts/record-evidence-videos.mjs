import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://trades-web-3703.fly.dev";
const OUTPUT_DIR = path.resolve("artifacts/videos");
const TARGET_DURATION_MS = 36_000;
const STEP_PAUSE_MS = 1_200;

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function switchToOnline(page) {
	await page.goto(BASE_URL);
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { name: "Switch To Online Multiplayer" }).click();
	await page.getByRole("button", { name: "Create Room" }).waitFor();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function createRoomAsHost(page, hostName) {
	await switchToOnline(page);
	await page.getByPlaceholder("Your name").fill(hostName);
	await page.getByRole("button", { name: "Create Room" }).click();
	const label = page.getByText(/^Room Code:/);
	await label.waitFor();
	const text = (await label.textContent()) ?? "";
	const match = text.match(/Room Code:\s*([A-Z0-9]+)/);
	if (!match) {
		throw new Error(`Could not parse room code from "${text}"`);
	}
	await page.waitForTimeout(STEP_PAUSE_MS);
	return match[1];
}

async function joinRoom(page, code, playerName) {
	await switchToOnline(page);
	await page.getByPlaceholder("Your name").fill(playerName);
	await page.getByPlaceholder("Invite code").fill(code);
	await page.getByRole("button", { name: "Join Room" }).click();
	await page.getByText(`Room Code: ${code}`).waitFor();
	await page.waitForTimeout(STEP_PAUSE_MS);
}

async function recordExperiment(browser, name, run) {
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
		throw new Error(`Video handle unavailable for experiment "${name}"`);
	}

	const startedAt = Date.now();
	try {
		await run({ context, page });
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
		await recordExperiment(browser, "invalid-invite-code", async ({ page }) => {
			await switchToOnline(page);
			await page.getByPlaceholder("Your name").fill("Guest");
			await page.getByPlaceholder("Invite code").fill("ZZZZZZ");
			await page.getByRole("button", { name: "Join Room" }).click();
			await page.getByText(/room not found/i).waitFor();
			await page.waitForTimeout(STEP_PAUSE_MS);
		});

		await recordExperiment(browser, "create-join-start-host-view", async ({ context, page }) => {
			const guest = await context.newPage();
			const code = await createRoomAsHost(page, "Host");
			await joinRoom(guest, code, "Guest");
			await page.getByRole("button", { name: "Start Game" }).click();
			await page.getByText("Game started").waitFor();
			await page.waitForTimeout(STEP_PAUSE_MS);
			await guest.close();
		});

		await recordExperiment(browser, "out-of-turn-rejected-guest-view", async ({ context, page }) => {
			const host = await context.newPage();
			const code = await createRoomAsHost(host, "Host");
			await joinRoom(page, code, "Guest");
			await host.getByRole("button", { name: "Start Game" }).click();
			await page.getByText(/Turn:\s*green/i).waitFor();
			await page.getByRole("button", { name: "End Turn" }).click();
			await page.getByText(/Turn:\s*green/i).waitFor();
			await page.waitForTimeout(STEP_PAUSE_MS);
			await host.close();
		});
	} finally {
		await browser.close();
	}
}

await main();
