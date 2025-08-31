[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ErrorCode

# Enumeration: ErrorCode

Defined in: [src/errors.ts:7](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L7)

Defines standard error codes for the ART framework.
These codes categorize errors originating from different subsystems.

## Enumeration Members

### ADAPTER\_INSTANTIATION\_ERROR

> **ADAPTER\_INSTANTIATION\_ERROR**: `"ADAPTER_INSTANTIATION_ERROR"`

Defined in: [src/errors.ts:122](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L122)

Failed to instantiate an adapter for a provider.

***

### AGENT\_PROCESSING\_ERROR

> **AGENT\_PROCESSING\_ERROR**: `"AGENT_PROCESSING_ERROR"`

Defined in: [src/errors.ts:58](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L58)

A general error occurred during the agent's process method.

***

### ALREADY\_CONNECTED

> **ALREADY\_CONNECTED**: `"ALREADY_CONNECTED"`

Defined in: [src/errors.ts:82](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L82)

A connection is already established.

***

### API\_QUEUE\_TIMEOUT

> **API\_QUEUE\_TIMEOUT**: `"API_QUEUE_TIMEOUT"`

Defined in: [src/errors.ts:120](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L120)

Timeout waiting for an available instance of an API provider.

***

### CONFIGURATION\_ERROR

> **CONFIGURATION\_ERROR**: `"CONFIGURATION_ERROR"`

Defined in: [src/errors.ts:14](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L14)

General configuration-related error.

***

### CORS\_EXTENSION\_REQUIRED

> **CORS\_EXTENSION\_REQUIRED**: `"CORS_EXTENSION_REQUIRED"`

Defined in: [src/errors.ts:106](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L106)

A CORS browser extension is required to proceed.

***

### CORS\_PERMISSION\_REQUIRED

> **CORS\_PERMISSION\_REQUIRED**: `"CORS_PERMISSION_REQUIRED"`

Defined in: [src/errors.ts:108](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L108)

CORS permissions are required but have not been granted.

***

### DELEGATION\_FAILED

> **DELEGATION\_FAILED**: `"DELEGATION_FAILED"`

Defined in: [src/errors.ts:60](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L60)

An A2A (Agent-to-Agent) task delegation failed.

***

### DUPLICATE\_TASK\_ID

> **DUPLICATE\_TASK\_ID**: `"DUPLICATE_TASK_ID"`

Defined in: [src/errors.ts:78](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L78)

A task with the same ID already exists.

***

### EXTERNAL\_SERVICE\_ERROR

> **EXTERNAL\_SERVICE\_ERROR**: `"EXTERNAL_SERVICE_ERROR"`

Defined in: [src/errors.ts:70](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L70)

An error occurred with an external service.

***

### HEALTH\_CHECK\_FAILED

> **HEALTH\_CHECK\_FAILED**: `"HEALTH_CHECK_FAILED"`

Defined in: [src/errors.ts:100](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L100)

A health check for a service failed.

***

### HTTP\_ERROR

> **HTTP\_ERROR**: `"HTTP_ERROR"`

Defined in: [src/errors.ts:96](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L96)

An HTTP error occurred.

***

### INVALID\_CONFIG

> **INVALID\_CONFIG**: `"INVALID_CONFIG"`

Defined in: [src/errors.ts:10](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L10)

Invalid or malformed configuration provided.

***

### INVALID\_REQUEST

> **INVALID\_REQUEST**: `"INVALID_REQUEST"`

Defined in: [src/errors.ts:76](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L76)

The request was invalid or malformed.

***

### LLM\_PROVIDER\_ERROR

> **LLM\_PROVIDER\_ERROR**: `"LLM_PROVIDER_ERROR"`

Defined in: [src/errors.ts:26](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L26)

An error occurred while communicating with the LLM provider.

***

### LOCAL\_INSTANCE\_BUSY

> **LOCAL\_INSTANCE\_BUSY**: `"LOCAL_INSTANCE_BUSY"`

Defined in: [src/errors.ts:118](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L118)

The requested local LLM instance is currently busy.

***

### LOCAL\_PROVIDER\_CONFLICT

> **LOCAL\_PROVIDER\_CONFLICT**: `"LOCAL_PROVIDER_CONFLICT"`

Defined in: [src/errors.ts:116](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L116)

Attempted to activate a local provider when another is already active.

***

### MISSING\_API\_key

> **MISSING\_API\_key**: `"MISSING_API_KEY"`

Defined in: [src/errors.ts:12](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L12)

A required API key was not provided.

***

### MISSING\_CONFIG

> **MISSING\_CONFIG**: `"MISSING_CONFIG"`

Defined in: [src/errors.ts:84](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L84)

A required configuration is missing.

***

### NETWORK\_ERROR

> **NETWORK\_ERROR**: `"NETWORK_ERROR"`

Defined in: [src/errors.ts:64](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L64)

A network error occurred.

***

### NO\_HTTP\_URL

> **NO\_HTTP\_URL**: `"NO_HTTP_URL"`

Defined in: [src/errors.ts:94](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L94)

The provided URL is not an HTTP/HTTPS URL.

***

### NO\_STDIN

> **NO\_STDIN**: `"NO_STDIN"`

Defined in: [src/errors.ts:92](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L92)

Standard input is not available.

***

### NOT\_CONNECTED

> **NOT\_CONNECTED**: `"NOT_CONNECTED"`

Defined in: [src/errors.ts:88](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L88)

No active connection is available.

***

### NOT\_IMPLEMENTED

> **NOT\_IMPLEMENTED**: `"NOT_IMPLEMENTED"`

Defined in: [src/errors.ts:86](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L86)

The requested feature is not implemented.

***

### OUTPUT\_PARSING\_FAILED

> **OUTPUT\_PARSING\_FAILED**: `"OUTPUT_PARSING_FAILED"`

Defined in: [src/errors.ts:30](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L30)

Failed to parse the output from the LLM.

***

### PLANNING\_FAILED

> **PLANNING\_FAILED**: `"PLANNING_FAILED"`

Defined in: [src/errors.ts:52](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L52)

The planning phase of the agent failed.

***

### PROMPT\_ASSEMBLY\_FAILED

> **PROMPT\_ASSEMBLY\_FAILED**: `"PROMPT_ASSEMBLY_FAILED"`

Defined in: [src/errors.ts:32](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L32)

Error during prompt template rendering or initial structure creation.

***

### PROMPT\_FRAGMENT\_NOT\_FOUND

> **PROMPT\_FRAGMENT\_NOT\_FOUND**: `"PROMPT_FRAGMENT_NOT_FOUND"`

Defined in: [src/errors.ts:34](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L34)

The requested prompt fragment does not exist.

***

### PROMPT\_GENERATION\_FAILED

> **PROMPT\_GENERATION\_FAILED**: `"PROMPT_GENERATION_FAILED"`

Defined in: [src/errors.ts:28](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L28)

Failed to generate a prompt.

***

### PROMPT\_TRANSLATION\_FAILED

> **PROMPT\_TRANSLATION\_FAILED**: `"PROMPT_TRANSLATION_FAILED"`

Defined in: [src/errors.ts:38](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L38)

Failed to translate the ART standard prompt to a provider-specific format.

***

### PROMPT\_VALIDATION\_FAILED

> **PROMPT\_VALIDATION\_FAILED**: `"PROMPT_VALIDATION_FAILED"`

Defined in: [src/errors.ts:36](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L36)

The constructed prompt object failed schema validation.

***

### REPOSITORY\_ERROR

> **REPOSITORY\_ERROR**: `"REPOSITORY_ERROR"`

Defined in: [src/errors.ts:80](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L80)

A generic error occurred in a repository.

***

### REQUEST\_TIMEOUT

> **REQUEST\_TIMEOUT**: `"REQUEST_TIMEOUT"`

Defined in: [src/errors.ts:90](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L90)

The request timed out.

***

### SAVE\_FAILED

> **SAVE\_FAILED**: `"SAVE_FAILED"`

Defined in: [src/errors.ts:22](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L22)

Failed to save data to the storage layer.

***

### SERVER\_NOT\_FOUND

> **SERVER\_NOT\_FOUND**: `"SERVER_NOT_FOUND"`

Defined in: [src/errors.ts:98](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L98)

The requested server was not found.

***

### STORAGE\_ERROR

> **STORAGE\_ERROR**: `"STORAGE_ERROR"`

Defined in: [src/errors.ts:18](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L18)

A generic error occurred in the storage layer.

***

### SYNTHESIS\_FAILED

> **SYNTHESIS\_FAILED**: `"SYNTHESIS_FAILED"`

Defined in: [src/errors.ts:56](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L56)

The synthesis phase of the agent failed.

***

### TASK\_NOT\_FOUND

> **TASK\_NOT\_FOUND**: `"TASK_NOT_FOUND"`

Defined in: [src/errors.ts:72](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L72)

The requested task was not found.

***

### THREAD\_NOT\_FOUND

> **THREAD\_NOT\_FOUND**: `"THREAD_NOT_FOUND"`

Defined in: [src/errors.ts:20](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L20)

The requested thread could not be found in storage.

***

### TIMEOUT

> **TIMEOUT**: `"TIMEOUT"`

Defined in: [src/errors.ts:68](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L68)

An operation timed out (duplicate of TIMEOUT_ERROR).

***

### TIMEOUT\_ERROR

> **TIMEOUT\_ERROR**: `"TIMEOUT_ERROR"`

Defined in: [src/errors.ts:66](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L66)

An operation timed out.

***

### TOOL\_DISABLED

> **TOOL\_DISABLED**: `"TOOL_DISABLED"`

Defined in: [src/errors.ts:48](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L48)

The requested tool is disabled for the current thread.

***

### TOOL\_DISCOVERY\_FAILED

> **TOOL\_DISCOVERY\_FAILED**: `"TOOL_DISCOVERY_FAILED"`

Defined in: [src/errors.ts:102](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L102)

Failed to discover tools from a remote source.

***

### TOOL\_EXECUTION\_ERROR

> **TOOL\_EXECUTION\_ERROR**: `"TOOL_EXECUTION_ERROR"`

Defined in: [src/errors.ts:46](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L46)

A generic error occurred during tool execution.

***

### TOOL\_EXECUTION\_FAILED

> **TOOL\_EXECUTION\_FAILED**: `"TOOL_EXECUTION_FAILED"`

Defined in: [src/errors.ts:54](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L54)

An error occurred within the ToolSystem execution loop.

***

### TOOL\_NOT\_FOUND

> **TOOL\_NOT\_FOUND**: `"TOOL_NOT_FOUND"`

Defined in: [src/errors.ts:42](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L42)

The requested tool could not be found in the registry.

***

### TOOL\_SCHEMA\_VALIDATION\_FAILED

> **TOOL\_SCHEMA\_VALIDATION\_FAILED**: `"TOOL_SCHEMA_VALIDATION_FAILED"`

Defined in: [src/errors.ts:44](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L44)

The provided tool schema failed validation.

***

### UNKNOWN\_ERROR

> **UNKNOWN\_ERROR**: `"UNKNOWN_ERROR"`

Defined in: [src/errors.ts:110](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L110)

An unknown or unexpected error occurred.

***

### UNKNOWN\_PROVIDER

> **UNKNOWN\_PROVIDER**: `"UNKNOWN_PROVIDER"`

Defined in: [src/errors.ts:114](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L114)

The requested LLM provider is not known or configured.

***

### UNSUPPORTED\_TRANSPORT

> **UNSUPPORTED\_TRANSPORT**: `"UNSUPPORTed_TRANSPORT"`

Defined in: [src/errors.ts:104](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L104)

The requested transport protocol is not supported.

***

### VALIDATION\_ERROR

> **VALIDATION\_ERROR**: `"VALIDATION_ERROR"`

Defined in: [src/errors.ts:74](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L74)

Input data failed validation.
