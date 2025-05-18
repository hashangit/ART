# Deep Dive: `OutputParser`

The `OutputParser` in the ART Framework is responsible for transforming the raw string output from Large Language Models (LLMs) into more structured and usable data, particularly after the agent's planning phase. It also handles basic cleaning of the synthesis output.

*   **Source:** `src/systems/reasoning/OutputParser.ts`
*   **Implements:** `OutputParser` interface from `src/core/interfaces.ts`

## Core Responsibilities & Methods

1.  **Parsing Planning Output:**
    *   **`async parsePlanningOutput(output: string): Promise<{ intent?: string; plan?: string; toolCalls?: ParsedToolCall[]; thoughts?: string; }>`**
        *   **Purpose:** To extract structured information from the LLM's response during the agent's planning phase. This typically includes the agent's understanding of the user's intent, its proposed plan, any tools it intends to call, and its internal "thinking" steps.
        *   **Process:**
            1.  **Extracting `<think>` Tags (Thoughts):**
                *   It first uses an `XmlMatcher` instance (from `src/utils/xml-matcher.ts`) configured to find and extract content within `<think>...</think>` XML-like tags.
                *   All content found within these tags is aggregated into a single `thoughts` string, with multiple thought blocks separated by `\n\n---\n\n`.
                *   The content *outside* these `<think>` tags is considered the "non-thinking" part of the output and is processed further.
            2.  **Extracting Intent, Plan, and Tool Calls from Non-Thinking Content:**
                *   It searches the non-thinking content for distinct sections, typically marked by keywords (case-insensitive):
                    *   `Intent:`: Extracts the text following this keyword as the `intent`.
                    *   `Plan:`: Extracts the text following this keyword as the `plan`.
                    *   `Tool Calls:`: Extracts the text following this keyword, expecting it to contain a JSON array of tool call requests.
                *   The extraction uses regular expressions to capture content until the next section keyword or the end of the string.
            3.  **Parsing Tool Calls JSON:**
                *   Within the "Tool Calls:" section, it looks for a JSON array. It's designed to handle:
                    *   Plain JSON arrays: `[{"callId": ..., "toolName": ..., "arguments": ...}]`
                    *   JSON arrays enclosed in Markdown code fences:
                        *   ````json`\n[...]\n` `````
                        *   ````\n[...]\n` `````
                *   It attempts to parse the identified JSON string into a JavaScript array.
                *   **Validation with Zod:** The parsed array is then validated against a Zod schema (`toolCallsSchema`) which ensures each element is an object with required `callId` (string), `toolName` (string), and `arguments` (any type, further validation happens in `ToolSystem`).
                *   If JSON parsing fails (e.g., malformed JSON), an error is logged, and `toolCalls` defaults to an empty array `[]`.
                *   If Zod validation fails (e.g., missing `callId`, `toolName`, or JSON is not an array), a warning is logged, and `toolCalls` defaults to an empty array `[]`.
            4.  **Return Value:** Returns an object containing the optional `intent`, `plan`, `toolCalls` (which will be an empty array `[]` if parsing/validation failed but the "Tool Calls:" section was present, or `undefined` if the section was missing entirely from non-thinking content), and `thoughts`.
        *   **Robustness:** The parser is designed to be somewhat resilient to variations in LLM output, such as extra whitespace or slight deviations in section ordering, as long as the keyword markers are present.
        *   **Logging:** It logs warnings or errors if sections are missing or if JSON parsing/validation fails.

2.  **Parsing Synthesis Output:**
    *   **`async parseSynthesisOutput(output: string): Promise<string>`**
        *   **Purpose:** To clean up the raw string output from the LLM during the agent's synthesis phase, preparing it as the final user-facing response.
        *   **Process (ART v0.2.7):**
            *   The current implementation is very straightforward: it simply calls `output.trim()` to remove leading and trailing whitespace.
            *   The `PESAgent` now directly uses the accumulated text from the synthesis stream as the final response content. This means complex parsing (like removing specific tags, unless they are `<think>` tags which wouldn't typically be in final synthesis) by `parseSynthesisOutput` is less critical for the core content itself. If an LLM includes extraneous prefixes/suffixes in its final answer that are not desired, this method could be enhanced to remove them.
        *   **Return Value:** Returns the trimmed string.

## Usage by `PESAgent`

*   After the planning LLM call, `PESAgent` accumulates the streamed text output and passes it to `outputParser.parsePlanningOutput()`. The resulting structured data (intent, plan, tool calls, thoughts) is then used to:
    *   Record observations.
    *   Pass `ParsedToolCall`s to the `ToolSystem` for execution.
    *   Formulate the context for the subsequent synthesis LLM call.
*   After the synthesis LLM call, `PESAgent` accumulates the streamed text. While `parseSynthesisOutput` is available, the `PESAgent` in `v0.2.7` directly uses the trimmed, accumulated synthesis stream text as the final `ConversationMessage.content`.

The `OutputParser` plays a vital role in bridging the gap between the often less structured, natural language (or mixed format) output of LLMs and the structured data needed by other ART systems like the `ToolSystem`. Its ability to handle `<think>` tags separately using `XmlMatcher` is key for agents that expose their "thought process."