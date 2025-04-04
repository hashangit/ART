## Changelog

### April 4, 2025: Sample CLI App Setup & Framework Fixes

1.  **Reviewed Initial State:** Examined `sample-app/README.md` plan and initial `sample-app/src/index.ts`.
2.  **Updated `sample-app/package.json`:**
    *   Added missing dependencies (`typescript`, `@types/node`).
    *   Moved `dotenv` to regular dependencies.
    *   Added `art-framework` as a local file dependency (`file:../`).
    *   Added `build` and `start` scripts.
    *   Corrected `main` and added `types` fields to point to `dist/`.
3.  **Updated `sample-app/tsconfig.json`:**
    *   Changed `module` and `moduleResolution` from `NodeNext` to `CommonJS` and `Node` respectively to align with `package.json`.
4.  **Installed `sample-app` Dependencies:** Ran `npm install` in the `sample-app` directory.
5.  **Fixed Framework Exports (`src/index.ts`):**
    *   Added exports for core components (`createArtInstance`, `PESAgent`), adapters (`InMemoryStorageAdapter`, `IndexedDBStorageAdapter`, `GeminiAdapter`, etc.), tools (`CalculatorTool`), types (`*`), and interfaces (`*`).
6.  **Corrected Adapter Paths (`src/index.ts`):**
    *   Fixed file paths used in export statements for storage and reasoning adapters (e.g., changed `InMemoryStorageAdapter` path to `./adapters/storage/inMemory`).
7.  **Corrected Adapter Export Name (`src/index.ts`):**
    *   Fixed the export name for the OpenRouter adapter from `OpenRouterProvider` to `OpenRouterAdapter`.
8.  **Added `createArtInstance` Function (`src/core/agent-factory.ts`):**
    *   Created a convenience function to simplify framework initialization, encapsulating factory instantiation and initialization.
9.  **Updated `ArtInstance` Interface (`src/core/interfaces.ts`):**
    *   Added `stateManager`, `conversationManager`, `toolRegistry`, and `observationManager` to the interface returned by `createArtInstance`.
    *   Updated `UISystem` interface to return concrete socket class types instead of interfaces to resolve type conflicts.
10. **Added Getters to `AgentFactory` (`src/core/agent-factory.ts`):**
    *   Implemented `getStateManager`, `getConversationManager`, `getObservationManager` methods.
11. **Fixed `AgentFactory` Initialization Logic (`src/core/agent-factory.ts`):**
    *   Corrected import paths for repositories and managers.
    *   Corrected instantiation logic for `UISystemImpl` (passing repositories).
    *   Corrected instantiation logic for `ObservationManagerImpl` and `ConversationManagerImpl` (passing correct socket instances).
    *   Corrected `ToolSystemImpl` constructor call (removed `observationManager` argument).
    *   Added instantiation logic for all supported reasoning adapters based on config.
12. **Added `setThreadConfig` to `StateManager`:**
    *   Added the method signature to the `StateManager` interface (`src/core/interfaces.ts`).
    *   Implemented the method in the `StateManager` class (`src/systems/context/managers/StateManager.ts`), delegating to the repository.
    *   Imported `ThreadConfig` type into `StateManager.ts`.
13. **Added Static `toolName` to `CalculatorTool` (`src/tools/CalculatorTool.ts`):**
    *   Added `public static readonly toolName = "calculator";`.
    *   Updated the tool's schema definition to use `CalculatorTool.toolName`.
14. **Enhanced `sample-app/src/index.ts`:**
    *   Corrected the call to `createArtInstance` to use the `AgentFactoryConfig` structure.
    *   Added logic to set a default `ThreadConfig` for the test thread using `art.stateManager.setThreadConfig`.
    *   Imported `ThreadConfig` type.
    *   Used `CalculatorTool.toolName` in the default config.
    *   Added subscription to `ObservationSocket` to log various observation types (INTENT, PLAN, TOOL_EXECUTION, ERROR, etc.) during processing.
    *   Corrected the observation subscription filter from `null` to `undefined`.
15. **Created `sample-app/.env`:** Added the file with a placeholder for the `GEMINI_API_KEY`.
16. **Rebuilt Framework:** Ran `npm run build` multiple times in the root directory to incorporate framework changes.
17. **Successfully Ran Sample App:** Executed `npm start -- "What is 5 * 9?"` in the `sample-app` directory, verifying the end-to-end flow and observation logging.
18. **Output Parser Enhancements (`src/systems/reasoning/OutputParser.ts`):**

    *   **Initial Problem:** Identified that the parser failed when LLM output included markdown code fences (```json ... ```) around the `Tool Calls:` JSON array.
    *   **Second Problem:** Identified a subsequent failure when the LLM included introductory text before the JSON array within the `Tool Calls:` section.
    *   **Fix Implemented:**
        *   Modified `parsePlanningOutput` to actively search for the first valid JSON array (`[...]`) within the text following `Tool Calls:`.
        *   The search correctly handles arrays optionally wrapped in markdown fences (```json ... ``` or ``` ... ```).
        *   Successfully parsed JSON arrays are now validated against a Zod schema (`toolCallsSchema`) derived from the `ParsedToolCall` type to ensure structural correctness (required `callId`, `toolName`, `arguments`).
        *   Added `zod` as a project dependency.
    *   **Testing:** Updated unit tests (`src/systems/reasoning/OutputParser.test.ts`) to cover new parsing scenarios (markdown fences, introductory text, Zod validation failures).

19. **Prompt Manager Refinement (`src/systems/reasoning/PromptManager.ts`):**

    *   **Investigation:** Confirmed that the planning prompt already included instructions specifying the correct JSON format for tool calls.
    *   **Refinement Implemented:** Updated the `defaultPlanningPromptTemplate` to make the instruction for the `Tool Calls:` section more explicit, instructing the LLM to output *only* the JSON array or `[]` to further discourage extraneous text.

20. **Checklist Updates (`ART-PRD-Checklist-plan.md`):**

    *   Marked tasks related to `OutputParser` enhancements (dependency addition, parsing logic changes, Zod integration, test updates) as complete.
    *   Added the prompt refinement task (marked as optional initially, now completed).
21. **Enhanced `CalculatorTool` Schema (`src/tools/CalculatorTool.ts`):** Added `examples` field to the tool schema to provide concrete usage examples, aiming to improve LLM guidance for tool input formatting.