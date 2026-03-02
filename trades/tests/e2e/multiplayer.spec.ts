import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

async function switchToOnlineMode(page: Page) {
	await page.goto("/");
	await page.getByRole("button", { name: "Switch To Online Multiplayer" }).click();
	await expect(page.getByRole("button", { name: "Create Room" })).toBeVisible();
}

async function createRoomAsHost(page: Page, hostName: string): Promise<string> {
	await switchToOnlineMode(page);
	await page.getByPlaceholder("Your name").fill(hostName);
	await page.getByRole("button", { name: "Create Room" }).click();
	const roomCodeLabel = page.getByText(/^Room Code:/);
	await expect(roomCodeLabel).toBeVisible();
	const roomCodeText = (await roomCodeLabel.textContent()) ?? "";
	const match = roomCodeText.match(/Room Code:\s*([A-Z0-9]+)/);
	expect(match, `Could not parse room code from "${roomCodeText}"`).not.toBeNull();
	return match?.[1] ?? "";
}

async function joinRoom(page: Page, code: string, playerName: string) {
	await switchToOnlineMode(page);
	await page.getByPlaceholder("Your name").fill(playerName);
	await page.getByPlaceholder("Invite code").fill(code);
	await page.getByRole("button", { name: "Join Room" }).click();
	await expect(page.getByText(`Room Code: ${code}`)).toBeVisible();
}

async function setupTwoPlayers(context: BrowserContext) {
	const host = await context.newPage();
	const guest = await context.newPage();
	const code = await createRoomAsHost(host, "Host");
	await joinRoom(guest, code, "Guest");
	return { host, guest, code };
}

async function startGame(host: Page, guest: Page) {
	await host.getByRole("button", { name: "Start Game" }).click();
	await expect(host.getByText("Game started")).toBeVisible();
	await expect(guest.getByText("Game started")).toBeVisible();
}

async function newTestContext(browser: Browser): Promise<BrowserContext> {
	if (process.env.PLAYWRIGHT_RECORD_VIDEO === "1") {
		return browser.newContext({
			recordVideo: {
				dir: "test-results/evidence/videos",
				size: { width: 1280, height: 720 },
			},
		});
	}
	return browser.newContext();
}

test.describe.serial("multiplayer remote smoke", () => {
	test("host can create room and guest can join", async ({ browser }) => {
		const context = await newTestContext(browser);
		const { host, guest } = await setupTwoPlayers(context);

		await expect(host.getByText("Host - green (host)")).toBeVisible();
		await expect(host.getByText("Guest - orange")).toBeVisible();
		await expect(host.getByRole("button", { name: "Start Game" })).toBeVisible();
		await expect(guest.getByRole("button", { name: "Start Game" })).toHaveCount(0);

		await host.close();
		await guest.close();
		await context.close();
	});

	test("turn changes are synced between players after start", async ({ browser }) => {
		const context = await newTestContext(browser);
		const { host, guest } = await setupTwoPlayers(context);

		await host.getByRole("button", { name: "Start Game" }).click();
		await expect(host.getByText("Game started")).toBeVisible();
		await expect(guest.getByText("Game started")).toBeVisible();

		await expect(host.getByText(/Turn:\s*green/i)).toBeVisible();
		await expect(guest.getByText(/Turn:\s*green/i)).toBeVisible();

		await host.getByRole("button", { name: "End Turn" }).click();
		await expect(host.getByText(/Turn:\s*orange/i)).toBeVisible();
		await expect(guest.getByText(/Turn:\s*orange/i)).toBeVisible();

		await host.close();
		await guest.close();
		await context.close();
	});

	test("out-of-turn action gets rejected and visible to player", async ({ browser }) => {
		const context = await newTestContext(browser);
		const { host, guest } = await setupTwoPlayers(context);

		await host.getByRole("button", { name: "Start Game" }).click();
		await expect(guest.getByText(/Turn:\s*green/i)).toBeVisible();

		await guest.getByRole("button", { name: "End Turn" }).click();
		// At minimum, guest action must not advance turn.
		await expect(guest.getByText(/Turn:\s*green/i)).toBeVisible();
		await expect(host.getByText(/Turn:\s*green/i)).toBeVisible();

		await host.close();
		await guest.close();
		await context.close();
	});

	test("invalid invite code shows server error", async ({ page }) => {
		await switchToOnlineMode(page);
		await page.getByPlaceholder("Your name").fill("Guest");
		await page.getByPlaceholder("Invite code").fill("ZZZZZZ");
		await page.getByRole("button", { name: "Join Room" }).click();
		await expect(page.getByText(/room not found/i)).toBeVisible();
	});

	test("lobby updates when a guest disconnects before game start", async ({ browser }) => {
		const context = await newTestContext(browser);
		const { host, guest } = await setupTwoPlayers(context);

		await expect(host.getByText("Guest - orange")).toBeVisible();
		await guest.close();
		await expect(host.getByText("Guest - orange")).toHaveCount(0);

		await host.close();
		await context.close();
	});

	test("resource changes are synchronized across clients", async ({ browser }) => {
		const context = await newTestContext(browser);
		const { host, guest } = await setupTwoPlayers(context);
		await startGame(host, guest);

		const hostGreenBalance = host
			.locator(".player-balance-item")
			.filter({ hasText: "green" });
		const guestGreenBalance = guest
			.locator(".player-balance-item")
			.filter({ hasText: "green" });

		await expect(hostGreenBalance).toContainText("20");
		await expect(guestGreenBalance).toContainText("20");

		await host
			.locator('button[title*="Rotate a road tile 90°"]')
			.first()
			.click();

		await expect(hostGreenBalance).toContainText("15");
		await expect(guestGreenBalance).toContainText("15");

		await host.close();
		await guest.close();
		await context.close();
	});

	test("repeated create/join/start cycles stay stable", async ({ browser }) => {
		for (let i = 0; i < 3; i += 1) {
			const context = await newTestContext(browser);
			const { host, guest } = await setupTwoPlayers(context);
			await startGame(host, guest);
			await expect(host.getByText(/Turn:\s*green/i)).toBeVisible();
			await expect(guest.getByText(/Turn:\s*green/i)).toBeVisible();
			await host.close();
			await guest.close();
			await context.close();
		}
	});
});
