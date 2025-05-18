# Utility: `XmlMatcher`

The `XmlMatcher` is a utility class provided by the ART Framework designed to find and extract content within a specific XML-like tag from a stream of text or a complete string. It's particularly useful for parsing LLM outputs where "thinking" steps or other structured information might be embedded within tags (e.g., `<think>...</think>`).

*   **Source:** `src/utils/xml-matcher.ts`

## Purpose

LLMs sometimes interleave their reasoning or intermediate thoughts with the main content of their response. A common convention is to wrap these thoughts in XML-like tags. The `XmlMatcher` provides a way to process text (either incrementally or all at once) and separate the content found inside a specified tag from the content outside it.

## `XmlMatcherChunk` Interface

When processing text, `XmlMatcher` yields or returns chunks of data represented by the `XmlMatcherChunk` interface:

```typescript
export interface XmlMatcherChunk {
  matched: boolean; // True if this chunk was inside the matched XML tag
  data: string;     // The text content of this chunk
}
```

## Constructor

```typescript
constructor(
    readonly tagName: string,
    readonly transform?: (chunk: XmlMatcherChunk) => Result, // Result defaults to XmlMatcherChunk
    readonly position = 0
)
```

*   **`tagName: string` (Required):** The name of the XML tag to match (e.g., `"think"`, `"reflection"`). The matching is case-sensitive.
*   **`transform?: (chunk: XmlMatcherChunk) => Result` (Optional):**
    *   A function that can be provided to transform each `XmlMatcherChunk` into a different `Result` type.
    *   If not provided, the methods return `XmlMatcherChunk` objects directly.
*   **`position = 0` (Optional):**
    *   The character position in the input stream at which active matching for the *start* of the `tagName` should begin.
    *   If `0` (default), matching for `<tagName>` starts from the beginning of the input.
    *   If greater than `0`, characters before this `position` are treated as unmatched text (`matched: false`) until the opening tag is encountered at or after this `position`.
    *   The internal logic (`this.pointer > this.position || this.isCurrentlyMatched || this.tagDepth > 0`) means matching for the tag itself can start if:
        *   The current character pointer is past the specified `position`.
        *   Or, if the matcher is already inside a matched tag (`this.isCurrentlyMatched` is true, e.g., for nested tags of the same name or handling content after the initial match).
        *   Or, if `tagDepth > 0` (meaning it's already inside one or more instances of the target tag). This handles nested tags of the same name correctly, ensuring only the outermost pair defines the matched content block.

## Key Methods

1.  **`update(chunk: string): Result[]`**
    *   **Purpose:** Processes an incoming chunk of text incrementally. This is useful if you are receiving text in a stream.
    *   **Process:**
        *   It iterates through the input `chunk` character by character, maintaining an internal state (e.g., `S_TEXT`, `S_TAG_OPEN`, `S_TAG_NAME`, `S_TAG_CLOSING_SLASH`, `S_IGNORE_UNTIL_GT`).
        *   When it encounters `<`, it transitions to a state expecting a tag name or a closing slash, but only if the `position` condition (or already being matched) is met.
        *   If it matches the opening tag (e.g., `<think>`), it transitions `isCurrentlyMatched` to `true`, increments `tagDepth`, and starts collecting subsequent characters as `matched: true` data.
        *   If it encounters another opening tag (even a nested one of the same name), it increments `tagDepth`.
        *   If it matches the corresponding closing tag (e.g., `</think>`), it decrements `tagDepth`. Only when `tagDepth` returns to `0` does `isCurrentlyMatched` become `false`.
        *   Characters outside the specified tags, or within other tags, are collected as `matched: false` data.
        *   It accumulates characters in an internal buffer (`cachedBuffer`). When the state changes (e.g., from text to tag, or tag to text, or at the end of a chunk), it flushes this buffer into an `XmlMatcherChunk` and adds it to an internal list (`currentChunks`).
    *   **Return Value:** Returns an array of `Result` objects (which are `XmlMatcherChunk`s if no `transform` function was provided). This array contains all the fully formed chunks identified *within the current `update` call*. It's possible that a tag might span multiple `update` calls, in which case the complete matched content will be spread across chunks returned by different `update` calls.

2.  **`final(chunk?: string): Result[]`**
    *   **Purpose:** Finalizes the processing, flushing any remaining buffered text. This should be called when you know there's no more input text.
    *   **Parameters:**
        *   `chunk?: string` (Optional): An optional final text chunk to process before finalizing.
    *   **Process:**
        1.  If a `chunk` is provided, it calls `this.update(chunk)` to process it.
        2.  It then collects any data remaining in its internal `cachedBuffer` (this would be text that didn't end with a state change, typically the last segment of text).
        3.  Flushes all accumulated `currentChunks`.
    *   **Return Value:** Returns an array of `Result` objects representing all segments identified since the last flush or from the beginning if `update` wasn't called in a way that flushed everything.

## How It's Used (Example: `OutputParser`)

The `OutputParser` in ART uses `XmlMatcher` to extract content from `<think>...</think>` tags in the LLM's planning output:

```typescript
// Simplified from OutputParser.ts
// import { XmlMatcher, XmlMatcherChunk } from 'art-framework'; // Path from art-framework/utils

// async parsePlanningOutput(output: string): Promise<...> {
//   const thoughtsList: string[] = [];
//   let nonThinkingContent = "";

//   const xmlMatcher = new XmlMatcher('think'); // Match the <think> tag
//   const chunks: XmlMatcherChunk[] = xmlMatcher.final(output); // Process the entire output string at once

//   chunks.forEach(chunk => {
//     if (chunk.matched) { // Content was inside <think>...</think>
//       thoughtsList.push(chunk.data.trim());
//     } else { // Content was outside
//       nonThinkingContent += chunk.data;
//     }
//   });

//   const result = { thoughts: thoughtsList.join("\n\n---\n\n") };

//   // ... then parse Intent, Plan, Tool Calls from nonThinkingContent ...
//   return result;
// }
```

In this usage:
*   `xmlMatcher.final(output)` processes the entire LLM output string in one go.
*   It iterates through the returned `XmlMatcherChunk[]`.
*   If `chunk.matched` is `true`, `chunk.data` is considered part of the LLM's "thoughts."
*   If `chunk.matched` is `false`, `chunk.data` is part of the regular output to be parsed for Intent, Plan, etc.

## When to Use `XmlMatcher`

Developers might use `XmlMatcher` directly if:

*   They are creating custom output parsers for LLM responses that use XML-like tags other than `<think>` to demarcate specific sections.
*   They are processing text streams that contain embedded XML-like structures and need to differentiate between the tagged content and the surrounding text.
*   They need to handle potentially malformed or non-standard XML where a full XML parser might be too strict or overkill.

The `XmlMatcher` provides a relatively lightweight and flexible way to handle simple XML tag extraction from text.