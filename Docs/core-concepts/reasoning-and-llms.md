# Reasoning and LLMs in ART

The "Reasoning" part of ART (Agent-Reasoning-Tooling) refers to how an agent "thinks" and makes decisions, primarily by interacting with Large Language Models (LLMs). The **Reasoning System** in ART orchestrates these interactions.

## Core Components of the Reasoning System

1.  **`ReasoningEngine` (`src/systems/reasoning/ReasoningEngine.ts`):**
    *   **Role:** Acts as the central gateway for all LLM calls within the framework. It doesn't directly make API calls itself but delegates this task to a `ProviderAdapter`.
    *   **Key Method: `call(prompt: ArtStandardPrompt, options: CallOptions)`:**
        *   Receives a standardized prompt (`ArtStandardPrompt`) constructed by the agent logic (e.g., `PESAgent`).
        *   Receives `CallOptions` which crucially include a `RuntimeProviderConfig`. This config specifies which LLM provider and model to use for *this specific call*, along with necessary `adapterOptions` (like API keys).
        *   Uses the `ProviderManager` to obtain a managed instance (`ManagedAdapterAccessor`) of the appropriate `ProviderAdapter` based on the `RuntimeProviderConfig`.
        *   Invokes the `call` method on the obtained adapter.
        *   Returns an `AsyncIterable<StreamEvent>`, allowing the agent to process LLM responses token by token if streaming is enabled.
        *   Ensures the adapter instance is `release()`d back to the `ProviderManager` after the stream is consumed or an error occurs.
    *   **Interaction:** The `PESAgent` calls `reasoningEngine.call()` for both its planning and synthesis phases.

2.  **`ProviderManager` (`src/providers/ProviderManagerImpl.ts`):**
    *   **Role:** Manages the lifecycle and access to various `ProviderAdapter` implementations. It allows ART to be LLM provider-agnostic.
    *   **Functionality:**
        *   Configured at startup (`ArtInstanceConfig.providers`) with a list of `AvailableProviderEntry` objects, each defining an adapter class (e.g., `OpenAIAdapter`), a unique name, and whether it's a local provider.
        *   Handles instantiation, caching/pooling of API adapter instances, and enforces constraints (e.g., singleton for local providers, concurrency limits for API providers).
        *   See the [Provider Management](./provider-management.md) page for a detailed explanation.

3.  **`ProviderAdapter` (`src/core/interfaces.ts` and `src/adapters/reasoning/`):**
    *   **Role:** Bridges the ART framework's standard interfaces with the specific APIs of different LLM providers. Each supported LLM (OpenAI, Anthropic, Gemini, Ollama, etc.) has its own adapter.
    *   **Key Responsibilities:**
        *   **Prompt Translation:** Translates the incoming `ArtStandardPrompt` (an array of `ArtStandardMessage` objects) into the specific request format required by the target LLM provider's API. This includes mapping roles (e.g., ART's `assistant` to Gemini's `model`), content structures, and tool call formats.
        *   **API Interaction:** Makes the actual HTTP request to the LLM provider's endpoint, handling authentication (e.g., API keys from `adapterOptions`) and other provider-specific headers or parameters.
        *   **Response Streaming:** If streaming is requested (`CallOptions.stream: true`), the adapter processes the provider's streaming response (e.g., Server-Sent Events) and converts each chunk into a standard ART `StreamEvent` (`TOKEN`, `METADATA`, `ERROR`, `END`).
        *   **Non-Streaming Handling:** If not streaming, it makes a regular request, gets the full response, and typically yields a minimal sequence of `StreamEvent`s (e.g., one `TOKEN` event with the full content, `METADATA`, and `END`).
        *   **Tool Support:** Adapters are responsible for formatting `ToolSchema`s (from `CallOptions.tools`) in a way the LLM can understand for function calling, and for parsing tool call requests from the LLM's response back into a standard format if necessary (though often `ArtStandardPrompt`'s `tool_calls` structure is close to what providers expect). They also format `tool_result` messages for the LLM.

4.  **`PromptManager` (`src/systems/reasoning/PromptManager.ts`):**
    *   **Role:** In ART `v0.2.7`, the `PromptManager`'s primary roles are:
        *   **`getFragment(name: string, context?: Record<string, any>): string`:** Retrieves pre-defined, named prompt pieces (fragments). These fragments can be static text or simple templates with basic `{{variable}}` substitution. Agent logic (like `PESAgent`) can use these fragments when constructing the `ArtStandardPrompt` object.
        *   **`validatePrompt(prompt: ArtStandardPrompt): ArtStandardPrompt`:** Validates a fully constructed `ArtStandardPrompt` object against the Zod schema defined in `src/types/schemas.ts` (`ArtStandardPromptSchema`). This helps catch structural errors before the prompt is sent to an adapter.
    *   **Note:** The `PESAgent` (and other agent logic) is now directly responsible for *assembling* the `ArtStandardPrompt` object (an array of `ArtStandardMessage`s). It might use `promptManager.getFragment()` to get parts of the content for those messages but doesn't rely on the `PromptManager` to render a full template into the final prompt structure.

5.  **`OutputParser` (`src/systems/reasoning/OutputParser.ts`):**
    *   **Role:** Extracts structured information from the raw text output of LLM calls, particularly during the planning phase.
    *   **Key Methods:**
        *   **`async parsePlanningOutput(output: string)`:**
            *   Processes the LLM's response from the planning phase.
            *   **Handles `<think>` tags:** It uses an `XmlMatcher` (`src/utils/xml-matcher.ts`) to find and extract content embedded within `<think>...</think>` tags. This "thinking" content is aggregated.
            *   Extracts distinct sections labeled "Intent:", "Plan:", and "Tool Calls:" from the non-thinking part of the output.
            *   For "Tool Calls:", it attempts to parse a JSON array (potentially enclosed in markdown fences like ` ```json ... ``` `) and validates its structure against a Zod schema to produce `ParsedToolCall[]`.
            *   Returns an object like `{ intent?: string, plan?: string, toolCalls?: ParsedToolCall[], thoughts?: string }`.
        *   **`async parseSynthesisOutput(output: string)`:**
            *   In ART `v0.2.7`, this method is very simple: it primarily trims whitespace from the synthesis LLM's output. The `PESAgent` now consumes the raw text directly from the synthesis stream for the final response, so complex parsing here is less critical.
    *   **Interaction:** The `PESAgent` uses `outputParser.parsePlanningOutput()` after the planning LLM call to understand the LLM's plan and any requested tool uses.

## The Flow of Reasoning

1.  **Agent Logic (e.g., `PESAgent`) Prepares Context:**
    *   Gathers necessary information: system prompt, conversation history, available tools, current user query, and (if applicable) results from previous tool executions.

2.  **Agent Logic Constructs `ArtStandardPrompt`:**
    *   The agent directly creates an array of `ArtStandardMessage` objects.
    *   It might use `promptManager.getFragment()` to fetch reusable pieces of text for the `content` fields of these messages.
    *   Example: For planning, it might create a system message, several user/assistant messages from history, and a final user message detailing the task, available tools, and desired output format.
    *   Optionally, it can call `promptManager.validatePrompt()` on the constructed object.

3.  **Agent Logic Calls `ReasoningEngine`:**
    *   `reasoningEngine.call(artStandardPrompt, callOptions)` is invoked.
    *   `callOptions` includes `stream: true` (usually) and the `RuntimeProviderConfig` specifying the LLM provider, model, and adapter options (like API key).

4.  **`ReasoningEngine` Orchestrates:**
    *   It requests a `ManagedAdapterAccessor` from the `ProviderManager` using the `RuntimeProviderConfig`.

5.  **`ProviderAdapter` Takes Over:**
    *   The obtained adapter's `call` method is invoked.
    *   The adapter translates the `ArtStandardPrompt` into the specific format its target LLM API expects.
    *   It makes the API call to the LLM.
    *   It processes the LLM's response (streaming or non-streaming) and converts it into an `AsyncIterable<StreamEvent>`.

6.  **Agent Logic Consumes `StreamEvent`s:**
    *   The agent iterates over the `StreamEvent`s.
    *   `TOKEN` events are accumulated to form the complete text response for that phase (e.g., planning output or synthesis output).
    *   `METADATA`, `ERROR`, and `END` events are handled appropriately.
    *   The `LLMStreamSocket` is notified of each event for UI updates.

7.  **Agent Logic Uses `OutputParser` (for Planning):**
    *   After the planning stream completes, the accumulated text output is passed to `outputParser.parsePlanningOutput()`.
    *   This extracts the intent, plan, and any `ParsedToolCall`s.

8.  **Agent Continues:**
    *   Based on the parsed plan, the agent might proceed to tool execution or directly to synthesizing a final response. The synthesis phase follows a similar pattern of prompt construction and `ReasoningEngine` interaction.

This system allows ART to abstract away the complexities of different LLM APIs, enabling developers to focus on the agent's logic and prompt engineering using a consistent, standardized approach.