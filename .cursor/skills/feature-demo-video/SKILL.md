---
name: feature-demo-video
description: Create a demo of a given set of features using the browser and produce a video. Use when the user asks for a demo, demo video, or to show a video of features (not for testing or verifying behavior).
user-invokable: true
args:
  - name: features
    description: The set of features or flows to demonstrate (e.g. "invite member and roles", "create location and add event", "riders list and search")
    required: false
---

Produce a **demo video** of requested features by writing a Playwright spec that demonstrates them (narrative flow), running it with video recording on, and delivering the generated video. Goal is to **show** the product, not to assert correctness.

## When to use

- User asks for a **demo** of features, a **demo video**, or to "show a video of" a set of features.
- User wants to **record** or **capture** a walkthrough of the app.
- Do **not** use for "test this behavior" or "verify that X works" — use the ui-test-playwright skill instead.

## Difference from ui-test-playwright

| Aspect       | ui-test-playwright     | feature-demo-video           |
|-------------|------------------------|-----------------------------|
| Intent      | Verify behavior        | Show features (narrative)   |
| Video       | Optional when requested | Always produced             |
| Spec style  | Assertions required    | Demo flow; minimal or none  |
| Trigger     | "Test X"               | "Demo X", "Demo video of Y" |

## Steps

1. **Ensure the app is running**
   - Frontend: e.g. `npm run dev -w client2` (default port 5173) or `npm run dev -w client` (port 5174).
   - If the app uses SpacetimeDB, ensure the backend is running (e.g. `npm run dev` at root).
   - For client on 5174, set `PLAYWRIGHT_BASE_URL=http://localhost:5174` when running; config defaults to 5173 (client2).

2. **Ensure Playwright browsers are available**
   - If `npx playwright test` fails with missing browsers, run `npx playwright install-deps` then `npx playwright install chromium` (or `npx playwright install`).

3. **Implement the demo in the scratch folder**
   - Write a single spec file in `e2e/scratch/` that **demonstrates** the requested features by interacting **as a real user would**. Name the file appropriately (e.g. `demo-members.spec.ts`, `demo-locations.spec.ts`).
   - Use `@playwright/test`: `test()`, `page.goto()`, `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`. Prefer `getByRole`, `getByLabel`, `getByTestId` over CSS.
   - **Realistic input:** In search/filter inputs, type **real, meaningful text** (e.g. actual names or terms from seeded data, or plausible values a user would type)—not single characters or placeholders like "a" or "test". In forms, use realistic names, dates, and descriptions. This makes the video show real results and believable flows.
   - **Relevant interactions:** Interact with the UI elements a user would: buttons, links, modals, dropdowns, filters, scrollable areas. Demonstrate the full flow, not just the minimum steps.
   - **Assertions**: minimal or none; the goal is a visible walkthrough. Optional soft checks (e.g. key text visible) are fine. Use relative URLs with `page.goto('/path')` so `baseURL` applies.
   - Add short waits (e.g. for key elements or brief time) where needed so the video shows each step clearly.

4. **Run the demo with video on**
   - From the **repo root**: `PLAYWRIGHT_VIDEO=on npm run test:e2e:scratch` (or `PLAYWRIGHT_VIDEO=on npx playwright test e2e/scratch/`). Use `PLAYWRIGHT_BASE_URL` if not using default.

5. **Deliver the video**
   - Find the generated video at `test-results/<run-folder>/video.webm`. **Always** run `cursor <video_file_path>` so the video opens in the editor, then report the path in your summary. If multiple tests produced videos, open at least the first (or most relevant) and report all paths.

## Conventions

- One demo per request in `e2e/scratch/`; one spec file, named for the demo (e.g. `demo-<feature>.spec.ts`).
- **Interact like a real user:** Use real or plausible text in search/filter/form inputs; interact with buttons, modals, dropdowns, and other relevant elements so the video shows a believable flow.
- Video is **always** recorded and delivered; no flag to turn it off for this skill.
- Base URL: default `http://localhost:5173` (client2). Override with `PLAYWRIGHT_BASE_URL` for client on 5174 or another URL.
