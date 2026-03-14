---
name: ui-test-playwright
description: Run ad-hoc browser tests for a specific behavior using Playwright. When the user asks to test something in the app in a real browser, write a one-off test, run it, and report results.
user-invokable: true
args:
  - name: scenario
    description: The behavior or flow to test (e.g. "members page shows invite button", "creating a location opens the modal")
    required: false
---

Use Playwright to test a specific UI behavior or flow in the app on demand. No permanent E2E suite—always implement the requested scenario in the **scratch folder** (`e2e/scratch/`), run it, and report pass/fail.

## When to use

- User asks to **test** a specific behavior, flow, or UI in the app using a **real browser** (or "with Playwright").
- User asks to verify that something works in the browser (e.g. "check that the login redirects", "test that the modal opens").

## Video recording

- **Only when the user asks:** Enable video recording only if the user explicitly asks to **record**, **video**, **capture video**, or **show (me) the video** of the run (e.g. "run the test and record it", "test X and show me the video").
- **When they ask for video:** Run the scratch test with `PLAYWRIGHT_VIDEO=on` (e.g. `PLAYWRIGHT_VIDEO=on npm run test:e2e:scratch`). After the run, report the path to the generated video (under `test-results/.../video.webm`) so they can open it.
- **When they do not ask for video:** Run the test without setting `PLAYWRIGHT_VIDEO`; no video is recorded (default is off).

## Steps

1. **Ensure the app is running**
   - Frontend: e.g. `npm run dev -w client2` (default port 5173) or `npm run dev -w client` (port 5174).
   - If the app uses SpacetimeDB, ensure the backend is running (e.g. `npm run dev` at root starts SpacetimeDB; run the client in another terminal).
   - For client on 5174, set `PLAYWRIGHT_BASE_URL=http://localhost:5174` when running the test, or the config will default to 5173 (client2).

2. **Ensure Playwright browsers are available**
   - If `npx playwright test` fails with missing browsers or "Executable doesn't exist", run:
     - `npx playwright install-deps` (may require `sudo` in devcontainers),
     - then `npx playwright install chromium` (or `npx playwright install` for all browsers).
   - In a **devcontainer**, browser launch failures often mean system deps or browsers are not installed; run the above once.

3. **Implement the scenario in the scratch folder**
   - Write a single spec file in `e2e/scratch/` that exercises the requested behavior. Name the spec file however is appropriate (e.g. `scratch.spec.ts`, `members.spec.ts`, or a descriptive name). Replace or create the file as needed; one scenario per request.
   - Use `@playwright/test`: `test()`, `page.goto()`, `page.getByRole()`, `page.getByLabel()`, `page.getByTestId()`, `expect()`.
   - Prefer Playwright’s recommended locators: `getByRole`, `getByLabel`, `getByTestId` over brittle CSS.
   - Use relative URLs with `page.goto('/path')` so `baseURL` from config is applied.

4. **Run the scratch test**
   - From the **repo root**: `npm run test:e2e:scratch` or `npx playwright test e2e/scratch/`.

5. **Report results**
   - Summarize pass or fail. If the test failed, include the error output or a short explanation. Mention any screenshots or artifacts if relevant.
   - If the user asked for video, report the path to the recording (e.g. `test-results/.../video.webm`) so they can open it.

## Conventions

- One scenario per request in `e2e/scratch/`; use a single spec file and name it as you see fit (e.g. `scratch.spec.ts` or a descriptive name like `members.spec.ts`).
- Do not add a full E2E suite or many committed test files unless the user asks for it.
- Base URL: default is `http://localhost:5173` (client2). Override with `PLAYWRIGHT_BASE_URL` for client on 5174 or another URL.
