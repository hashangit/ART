# Utility: JSON Schema Validation

The ART Framework includes a utility function for validating JavaScript objects against a [JSON Schema](https://json-schema.org/) definition. This is particularly important for validating the input arguments provided to tools before execution.

*   **Source:** `src/utils/validation.ts`
*   **Underlying Library:** Uses [Ajv (Another JSON Schema Validator)](https://ajv.js.org/) for robust and efficient schema validation.

## `validateJsonSchema` Function

*   **`validateJsonSchema(schema: object, data: any): { isValid: boolean; errors: ValidateFunction['errors'] | null }`**
    *   **Purpose:** To check if a given `data` object conforms to the structure and constraints defined by a `schema` object.
    *   **Parameters:**
        *   `schema: object`: The JSON Schema object to validate against. It's assumed to be a valid JSON Schema structure.
        *   `data: any`: The JavaScript data (typically an object) to be validated.
    *   **Return Value:** An object with two properties:
        *   `isValid: boolean`: `true` if the `data` is valid according to the `schema`, `false` otherwise.
        *   `errors: AjvErrorObject[] | null`:
            *   If `isValid` is `false`, this property contains an array of Ajv validation error objects, providing details about why the validation failed (e.g., missing required properties, incorrect data types).
            *   If `isValid` is `true`, this is `null`.
            *   If the provided `schema` itself fails to compile with Ajv, `isValid` will be `false`, and `errors` will contain a single error object indicating schema compilation failure.
    *   **Caching:** The function caches compiled Ajv validation functions based on a stringified version of the schema. This improves performance for repeated validations against the same schema, as schema compilation can be an expensive operation.
        *   The cache can be cleared using `clearJsonSchemaValidatorCache()`.

## How It's Used

The primary use case within the ART Framework is in the **`ToolSystem`**:

1.  When the `ToolSystem` is about to execute a tool, it retrieves the tool's `IToolExecutor` instance from the `ToolRegistry`.
2.  It accesses `executor.schema.inputSchema`, which is the JSON Schema defining the expected input arguments for that tool.
3.  It calls `validateJsonSchema(inputSchema, argumentsFromLLM)` to validate the arguments provided by the LLM (from a `ParsedToolCall`) against the tool's declared input requirements.
4.  If `isValid` is `false`, the `ToolSystem` generates an error `ToolResult` for that tool call, including details from the `validationResult.errors`. The tool's `execute` method is not called.
5.  If `isValid` is `true`, the (now validated) arguments are passed to the tool's `execute` method.

**Example (`ToolSystem` conceptual usage):**

```typescript
// import { validateJsonSchema } from 'art-framework'; // Path from art-framework/utils
// import { ToolSchema, ParsedToolCall } from 'art-framework'; // Path from art-framework/types

// async function processToolCall(toolSchema: ToolSchema, parsedCall: ParsedToolCall) {
//     const validationResult = validateJsonSchema(toolSchema.inputSchema, parsedCall.arguments);

//     if (!validationResult.isValid) {
//         const errorMessages = validationResult.errors?.map(e => `${e.instancePath || 'input'} ${e.message}`).join(', ');
//         console.error(`Argument validation failed for tool ${toolSchema.name}: ${errorMessages}`);
//         // Return an error ToolResult
//         return { status: 'error', error: `Invalid arguments: ${errorMessages}` };
//     }

//     // Proceed with tool execution using parsedCall.arguments
//     // const output = await executor.execute(parsedCall.arguments, ...);
//     // return { status: 'success', output };
// }
```

## `clearJsonSchemaValidatorCache` Function

*   **`clearJsonSchemaValidatorCache(): void`**
    *   **Purpose:** Clears the internal cache of compiled Ajv validation functions.
    *   **Use Cases:**
        *   Primarily useful in testing scenarios where you might be redefining schemas or want to ensure a clean state for validator performance tests.
        *   In production, it's generally not needed unless schemas are being dynamically generated and updated in a way that requires recompilation for correctness.

This validation utility helps ensure that tools receive input in the format they expect, reducing runtime errors within tool execution logic and providing clearer feedback when LLMs generate malformed tool arguments.