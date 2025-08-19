// src/errors.ts

/**
 * Defines standard error codes for the ART framework.
 */
export enum ErrorCode {
    // Configuration Errors
    INVALID_CONFIG = 'INVALID_CONFIG',
    MISSING_API_KEY = 'MISSING_API_KEY',

    // Storage Errors
    STORAGE_ERROR = 'STORAGE_ERROR',
    THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
    SAVE_FAILED = 'SAVE_FAILED',

    // Reasoning Errors
    LLM_PROVIDER_ERROR = 'LLM_PROVIDER_ERROR',
    PROMPT_GENERATION_FAILED = 'PROMPT_GENERATION_FAILED',
    OUTPUT_PARSING_FAILED = 'OUTPUT_PARSING_FAILED',
    PROMPT_ASSEMBLY_FAILED = 'PROMPT_ASSEMBLY_FAILED', // Error during prompt template rendering or initial structure creation (legacy, might be removed)
    PROMPT_FRAGMENT_NOT_FOUND = 'PROMPT_FRAGMENT_NOT_FOUND', // Requested prompt fragment does not exist
    PROMPT_VALIDATION_FAILED = 'PROMPT_VALIDATION_FAILED', // Constructed prompt object failed schema validation
    PROMPT_TRANSLATION_FAILED = 'PROMPT_TRANSLATION_FAILED', // Added for Adapter translation

    // Tool Errors
    TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
    TOOL_SCHEMA_VALIDATION_FAILED = 'TOOL_SCHEMA_VALIDATION_FAILED',
    TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR', // Generic tool execution error
    TOOL_DISABLED = 'TOOL_DISABLED',

    // Agent Core / Orchestration Errors
    PLANNING_FAILED = 'PLANNING_FAILED',
    TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED', // Error within the ToolSystem execution loop
    SYNTHESIS_FAILED = 'SYNTHESIS_FAILED',
    AGENT_PROCESSING_ERROR = 'AGENT_PROCESSING_ERROR', // General error during agent.process
    DELEGATION_FAILED = 'DELEGATION_FAILED', // A2A task delegation failed

    // General Errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    TIMEOUT = 'TIMEOUT',
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    TASK_NOT_FOUND = 'TASK_NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    DUPLICATE_TASK_ID = 'DUPLICATE_TASK_ID',
    REPOSITORY_ERROR = 'REPOSITORY_ERROR',
    ALREADY_CONNECTED = 'ALREADY_CONNECTED',
    MISSING_CONFIG = 'MISSING_CONFIG',
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
    NOT_CONNECTED = 'NOT_CONNECTED',
    REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
    NO_STDIN = 'NO_STDIN',
    NO_HTTP_URL = 'NO_HTTP_URL',
    HTTP_ERROR = 'HTTP_ERROR',
    SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
    HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
    TOOL_DISCOVERY_FAILED = 'TOOL_DISCOVERY_FAILED',
    UNSUPPORTED_TRANSPORT = 'UNSUPPORTED_TRANSPORT',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',

    // Provider Manager Errors
    UNKNOWN_PROVIDER = 'UNKNOWN_PROVIDER', // Checklist item 4.7
    LOCAL_PROVIDER_CONFLICT = 'LOCAL_PROVIDER_CONFLICT', // Checklist item 4.7
    LOCAL_INSTANCE_BUSY = 'LOCAL_INSTANCE_BUSY', // Checklist item 4.7
    API_QUEUE_TIMEOUT = 'API_QUEUE_TIMEOUT', // Checklist item 4.7 (optional)
    ADAPTER_INSTANTIATION_ERROR = 'ADAPTER_INSTANTIATION_ERROR', // Checklist item 4.7
}

/**
 * Custom error class for ART framework specific errors.
 */
export class ARTError extends Error {
    public readonly code: ErrorCode;
    public readonly originalError?: Error;
    public details: Record<string, any>;

    constructor(message: string, code: ErrorCode, originalError?: Error, details: Record<string, any> = {}) {
        super(message);
        this.name = 'ARTError';
        this.code = code;
        this.originalError = originalError;
        this.details = details;

        // Maintains proper stack trace in V8 environments (Node, Chrome)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ARTError);
        }
    }

    toString(): string {
        let str = `${this.name} [${this.code}]: ${this.message}`;
        if (this.originalError) {
            str += `\nCaused by: ${this.originalError.stack || this.originalError.toString()}`;
        }
        return str;
    }
}

// Specific error classes for Provider Manager (Checklist item 4.7)
export class UnknownProviderError extends ARTError {
    constructor(providerName: string) {
        super(`Unknown provider requested: ${providerName}`, ErrorCode.UNKNOWN_PROVIDER);
        this.name = 'UnknownProviderError';
    }
}

export class LocalProviderConflictError extends ARTError {
    constructor(requestedProvider: string, activeProvider: string) {
        super(`Cannot activate local provider '${requestedProvider}'. Local provider '${activeProvider}' is already active.`, ErrorCode.LOCAL_PROVIDER_CONFLICT);
        this.name = 'LocalProviderConflictError';
    }
}

export class LocalInstanceBusyError extends ARTError {
    constructor(providerName: string, modelId: string) {
        super(`Local provider instance '${providerName}:${modelId}' is currently busy.`, ErrorCode.LOCAL_INSTANCE_BUSY);
        this.name = 'LocalInstanceBusyError';
    }
}

export class ApiQueueTimeoutError extends ARTError {
    constructor(providerName: string) {
        super(`Timeout waiting for an available instance of API provider '${providerName}'.`, ErrorCode.API_QUEUE_TIMEOUT);
        this.name = 'ApiQueueTimeoutError';
    }
}

export class AdapterInstantiationError extends ARTError {
    constructor(providerName: string, originalError: Error) {
        super(`Failed to instantiate adapter for provider '${providerName}'.`, ErrorCode.ADAPTER_INSTANTIATION_ERROR, originalError);
        this.name = 'AdapterInstantiationError';
    }
}