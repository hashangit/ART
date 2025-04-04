# E2E Testing Plan for ART Framework (Phase 6.1)

**Goal:** Implement Phase 6.1 of the checklist: Setup and run End-to-End (E2E) tests for the core Plan-Execute-Synthesize (PES) flow using Playwright, targeting a dedicated `e2e-test-app/` web server, utilizing live LLM API calls, and organizing tests within a new `e2e/` directory.

**Prerequisites:**

*   Necessary LLM API keys (e.g., `GEMINI_API_KEY`) must be available as environment variables in the shell where the E2E tests will be executed.

**Detailed Plan:**

1.  **Install Playwright:**
    *   Add Playwright as a development dependency to the root `package.json`.
    *   Command: `npm install --save-dev @playwright/test`

2.  **Initialize Playwright & Create Directory:**
    *   Run the Playwright installation command to download necessary browser binaries.
    *   Command: `npx playwright install`
    *   Create the `e2e/` directory at the project root to store test specifications.

3.  **Configure Playwright:**
    *   Create a `playwright.config.ts` file in the project root.
    *   Configure it to:
        *   Define the `webServer` command to start the `e2e-test-app` server.
        *   Ensure environment variables (like `GEMINI_API_KEY`) are passed through or accessible to the test environment (Playwright typically inherits environment variables from the shell it's run in).
        *   Specify target browsers (e.g., Chromium).

4.  **Add E2E Test Script:**
    *   Add a new script to the `scripts` section of the root `package.json`.
    *   Example: `"test:e2e": "playwright test"`

5.  **Create Dedicated E2E Test App (`e2e-test-app/`):**
    *   Create the `e2e-test-app/` directory.
    *   Initialize a new Node.js/TypeScript project within it (`npm init -y`).
    *   Install dependencies: `express`, `@types/express`, `typescript`, `@types/node`, `art-framework@file:../`, `dotenv`, `ts-node`.
    *   Create `e2e-test-app/tsconfig.json` configured for a Node.js ESM server.
    *   Update `e2e-test-app/package.json` with `"type": "module"` and add `build`, `start`, `dev` scripts.
    *   Create `e2e-test-app/src/` directory.
    *   Implement a minimal Express server in `e2e-test-app/src/index.ts` with a `/process` endpoint that initializes ART based on request parameters (`query`, `storageType`) and returns the `AgentFinalResponse`.

6.  **Update Root Playwright Configuration (`playwright.config.ts`):**
    *   Configure the `webServer` section to run the `dev` script of the `e2e-test-app` using `npm run dev --prefix e2e-test-app`.
    *   Set the `baseURL` to the test app's URL (e.g., `http://localhost:3001`).

7.  **Write E2E Test Specification (`e2e/pes-flow.spec.ts`):**
    *   Create the test file `e2e/pes-flow.spec.ts`.
    *   Use Playwright's `request` context to make POST requests to the `/process` endpoint of the `e2e-test-app` server.
    *   **Test Suite 1: InMemoryStorageAdapter**
        *   Send requests with `storageType: 'memory'`.
        *   Test Case 1.1: Simple query. Assert on the JSON response.
        *   Test Case 1.2: Tool query. Assert on the JSON response, checking for expected tool output (e.g., calculation result).
    *   **Test Suite 2: IndexedDBStorageAdapter**
        *   Send requests with `storageType: 'indexeddb'`.
        *   Test Case 2.1: Simple query. Assert on the JSON response.
        *   Test Case 2.2: Tool query. Assert on the JSON response.
        *   *Note:* Initial tests verify successful completion with IndexedDB. Deeper persistence testing is a future enhancement.

8.  **Update Checklist (`ART-PRD-Checklist-plan.md`):**
    *   Modify the status of tasks 6.1.1, 6.1.2, and 6.1.3 to `[D]` (Done).

9.  **Update Changelog (`changelog.md`):**
    *   Add a new entry detailing the setup of Playwright, creation of the `e2e-test-app`, and implementation of initial E2E tests covering the PES flow with InMemory/IndexedDB storage using live LLM calls via the test app.

**Mermaid Diagram of E2E Setup (Live LLM):**

**Mermaid Diagram of E2E Setup (Revised - Live LLM via Test App):**

```mermaid
graph TD
    subgraph Test Runner (Playwright)
        A[playwright.config.ts] -- Configures --> WS(webServer: e2e-test-app)
        A -- Defines --> BaseURL(baseURL: http://localhost:3001)
        B[Test Scripts e.g., e2e/pes-flow.spec.ts] -- Uses --> BaseURL
        B -- Makes API Calls --> E2EApp(e2e-test-app Server)
        B -- Reads --> EnvVars(Environment Variables e.g., GEMINI_API_KEY)
    end

    subgraph E2E Test App Server (e2e-test-app)
        E2EApp -- Listens on --> Port(3001)
        E2EApp -- Handles Request --> Endpoint(/process)
        Endpoint -- Uses --> ART(ART Framework Instance)
        ART -- Configured with --> Storage{Storage Adapter}
        ART -- Uses --> RS(Reasoning System)
        ART -- Uses --> TS(Tool System)
        RS -- Uses API Key from Env --> LLM([Live LLM API])
        TS -- Uses --> Calc(CalculatorTool)
        Storage -- Can be --> IM(InMemoryStorageAdapter)
        Storage -- Can be --> IDB(IndexedDBStorageAdapter)
        Endpoint -- Returns --> JsonResponse(AgentFinalResponse)
    end

    B -- Asserts on --> JsonResponse
    LLM -.- EnvVars

    style LLM fill:#ccf,stroke:#333,stroke-width:2px
```