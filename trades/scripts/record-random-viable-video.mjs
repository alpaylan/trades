import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://trades-web-3703.fly.dev";
const OUTPUT_DIR = path.resolve("artifacts/videos");
const DURATION_MS = 40_000;
const STEP_DELAY_MS = 180;

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function main() {
	await ensureDir(OUTPUT_DIR);
	const rawDir = path.join(OUTPUT_DIR, "raw", "gameplay-random-viable-fuzzer");
	await ensureDir(rawDir);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		recordVideo: {
			dir: rawDir,
			size: { width: 1280, height: 720 },
		},
	});
	const page = await context.newPage();
	const video = page.video();
	if (!video) {
		throw new Error("Video handle unavailable");
	}

	try {
		await page.goto(BASE_URL);
		await page.waitForLoadState("networkidle");
		await page.waitForFunction(
			() => Boolean(window.__TRADES_TEST_HOOKS__),
			{ timeout: 10_000 },
		);

		const started = Date.now();
		let steps = 0;

		while (Date.now() - started < DURATION_MS) {
			const result = await page.evaluate(() => {
				const hooks = window.__TRADES_TEST_HOOKS__;
				if (!hooks) {
					return { ok: false, reason: "missing-hooks" };
				}
				const viable = hooks.listViableMoves();
				if (!Array.isArray(viable) || viable.length === 0) {
					return { ok: false, reason: "no-viable-moves" };
				}
				const choice = viable[Math.floor(Math.random() * viable.length)];
				hooks.dispatch(choice);
				return {
					ok: true,
					type:
						choice && typeof choice === "object" && "type" in choice
							? String(choice.type)
							: "unknown",
				};
			});

			if (!result.ok && result.reason === "missing-hooks") {
				await page.waitForTimeout(200);
				continue;
			}
			if (!result.ok && result.reason === "no-viable-moves") {
				break;
			}
			steps += 1;
			await page.waitForTimeout(STEP_DELAY_MS);
		}

		console.log(`Random viable steps executed: ${steps}`);

		const elapsed = Date.now() - started;
		if (elapsed < DURATION_MS) {
			await page.waitForTimeout(DURATION_MS - elapsed);
		}
	} finally {
		await context.close();
	}

	const finalPath = path.join(OUTPUT_DIR, "gameplay-random-viable-fuzzer.webm");
	await video.saveAs(finalPath);
	console.log(`Saved: ${finalPath}`);
	await browser.close();
}

await main();
