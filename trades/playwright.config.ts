import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://trades-web-3703.fly.dev";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false,
	workers: 1,
	retries: 1,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
