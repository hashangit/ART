# ART Framework - Sample CLI Test App Plan

This document outlines the plan for creating a basic CLI application to test the core functionality of the ART framework.

## User Story

*   **As a developer testing ART, I want to run a simple CLI command that takes a math-related query (e.g., "What is 5 + 7?"), processes it using the ART framework's default PES agent configured with the Gemini adapter and CalculatorTool, and displays the agent's final response to the console, so that I can verify the basic end-to-end functionality including tool usage.**

## Plan

1.  **Project Setup (`sample-app/`):**
    *   Initialize a Node.js project (`package.json`).
    *   Set up TypeScript configuration (`tsconfig.json`).
    *   **Link the local ART framework** as a dependency (using `npm link` or similar).
    *   Create the main CLI entry point file (`index.ts`).
2.  **ART Instance Configuration (`index.ts`):**
    *   Import necessary ART components (`createArtInstance`, `PESAgent`, `CalculatorTool`, `ThreadConfig`, etc.).
    *   Use `dotenv` to load the `GEMINI_API_KEY` from a `.env` file in the `sample-app` directory.
    *   Configure and initialize the ART instance using `createArtInstance`, passing an `AgentFactoryConfig` object specifying:
        *   Storage type (`memory`).
        *   Reasoning provider (`gemini`) and API key.
        *   Tool instances (`CalculatorTool`).
3.  **CLI Logic (`index.ts`):**
    *   Implement logic to read a query from command-line arguments.
    *   Define a static `threadId`.
    *   **Set Default Thread Configuration:** Use the `art.stateManager` to set a default `ThreadConfig` for the `threadId`, enabling the `CalculatorTool` and specifying the Gemini model.
    *   **Subscribe to Observations:** Use `art.uiSystem.getObservationSocket()` to subscribe to agent observations (INTENT, PLAN, TOOL_EXECUTION, etc.) for the `threadId` and log them to the console.
    *   Call `art.process()` with the query and `threadId`.
    *   Unsubscribe from observations after processing.
    *   Print the final AI response content (`response.content`) and metadata to the console.
    *   Include basic error handling.
4.  **Execution:**
    *   Add `build` and `start` scripts to `package.json` to compile and execute the CLI application using `ts-node`.

## Architecture Diagram

```mermaid
graph TD
    subgraph "CLI App (sample-app/index.ts)"
        A[Parse CLI Args (Query)] --> B(Load .env);
        B --> C(Prepare AgentFactoryConfig);
        C --> D{Call createArtInstance(config)};
        D --> E{Get ArtInstance (process, uiSystem, stateManager, ... )};
        E --> F[Set Default ThreadConfig via stateManager];
        F --> G[Subscribe to Observations via uiSystem];
        G --> H{Call art.process(query, threadId)};
        H -- Observations --> G;
        H --> I[Handle Final Response];
        I --> J(Log Final Output to Console);
        H --> K[Handle Errors];
        K --> L(Log Error to Console);
    end

    subgraph "ART Framework (Linked Locally)"
        M[createArtInstance] --> N(AgentFactory);
        N -- Initializes --> O(All Subsystems);
        O --> P(PESAgent);
        P -- Uses --> Q(ReasoningSystem w/ GeminiAdapter);
        P -- Uses --> R(ContextSystem w/ StateManager);
        P -- Uses --> S(StorageSystem - InMemory);
        P -- Uses --> T(ObservationSystem);
        P -- Uses --> U(ToolSystem w/ CalculatorTool);
        P -- Uses --> V(UISystem);
        T -- Notifies --> V;
    end

    D --> M;
    H --> P;
    I --> H;
    K --> H;

    style M fill:#f9f,stroke:#333,stroke-width:2px
    style N fill:#ccf,stroke:#333,stroke-width:2px
    style O fill:#eee,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5
    style P fill:#ccf,stroke:#333,stroke-width:2px
    style Q fill:#cfc,stroke:#333,stroke-width:2px
    style R fill:#ffc,stroke:#333,stroke-width:2px
    style S fill:#fcc,stroke:#333,stroke-width:2px
    style T fill:#cff,stroke:#333,stroke-width:2px
    style U fill:#fcf,stroke:#333,stroke-width:2px
    style V fill:#fec,stroke:#333,stroke-width:2px
```

## Notes

*   The ART framework needs to be linked locally as it's not yet packaged.
*   Ensure the Gemini API key is available in `sample-app/.env`.