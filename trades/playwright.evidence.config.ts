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
	retries: 0,
	preserveOutput: "always",
	reporter: [["list"], ["html", { open: "never" }]],
	outputDir: "test-results/evidence",
	use: {
		baseURL,
		trace: "on",
		screenshot: "on",
		video: "on",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
