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

## Video and trace artifacts

Recognize when the user asks for **video** or **trace** (or both) and run the test with the right flags, then output the correct artifacts.

### Video

- **When the user asks for:** record, **video**, capture video, or show (me) the video (e.g. "run the test and record it", "test that X and show me the video").
- **Run with:** `PLAYWRIGHT_VIDEO=on` (e.g. `PLAYWRIGHT_VIDEO=on npm run test:e2e:scratch`).
- **Output:** Find the generated video under `test-results/<run-folder>/video.webm`. **Always** run `cursor <video_file_path>` so the video opens in the editor (do not skip this). Then report the path in your summary. If multiple tests produced videos, open at least the first one (or the one most relevant to the request).

### Trace

- **When the user asks for:** **trace**, trace viewer, or see where it clicked / action timeline (e.g. "run with trace", "show me the trace", "I want to see the trace").
- **Run with:** `--trace on` (e.g. `npx playwright test e2e/scratch/ --trace on`, or combined with video: `PLAYWRIGHT_VIDEO=on npx playwright test e2e/scratch/ --trace on`).
- **Output:** Find the trace under `test-results/<run-folder>/trace.zip`. Report the path and how to open it: `npx playwright show-trace test-results/<run-folder>/trace.zip`. Optionally run that command so the user can view the trace (in environments where a browser can open, or serve with `-h 0.0.0.0 -p 9323` for remote access).

### Default (no video/trace requested)

- Do not set `PLAYWRIGHT_VIDEO` and do not pass `--trace on`; no video or trace is recorded.

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
   - If the user asked for **video**, prefix with `PLAYWRIGHT_VIDEO=on`.
   - If the user asked for **trace**, append `--trace on`.
   - Example (both): `PLAYWRIGHT_VIDEO=on npx playwright test e2e/scratch/ --trace on`.

5. **Report results and output artifacts**
   - Summarize pass or fail. If the test failed, include the error output or a short explanation. Mention any screenshots or artifacts if relevant.
   - **If the user asked for video:** find `test-results/<run-folder>/video.webm` (or each `video.webm` when multiple tests ran). **Always** run `cursor <video_file_path>` to open the video in the editor—this step is required, not optional. If there are multiple videos, open at least the first. Then report the path(s) in your summary.
   - **If the user asked for trace:** find `test-results/<run-folder>/trace.zip`, report the path and the command to open it: `npx playwright show-trace <path-to-trace.zip>`. Optionally run that command (or serve with `-h 0.0.0.0 -p 9323` if in a headless environment).

## Conventions

- One scenario per request in `e2e/scratch/`; use a single spec file and name it as you see fit (e.g. `scratch.spec.ts` or a descriptive name like `members.spec.ts`).
- The user may ask for **video**, **trace**, or **both**; apply the corresponding flags and output each requested artifact.
- Do not add a full E2E suite or many committed test files unless the user asks for it.
- Base URL: default is `http://localhost:5173` (client2). Override with `PLAYWRIGHT_BASE_URL` for client on 5174 or another URL.
