// src/errors.ts

/**
 * Defines standard error codes for the ART framework.
 * These codes categorize errors originating from different subsystems.
 */
export enum ErrorCode {
    // Configuration Errors
    /** Invalid or malformed configuration provided. */
    INVALID_CONFIG = 'INVALID_CONFIG',
    /** A required API key was not provided. */
    MISSING_API_key = 'MISSING_API_KEY',
    /** General configuration-related error. */
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

    // Storage Errors
    /** A generic error occurred in the storage layer. */
    STORAGE_ERROR = 'STORAGE_ERROR',
    /** The requested thread could not be found in storage. */
    THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
    /** Failed to save data to the storage layer. */
    SAVE_FAILED = 'SAVE_FAILED',

    // Reasoning Errors
    /** An error occurred while communicating with the LLM provider. */
    LLM_PROVIDER_ERROR = 'LLM_PROVIDER_ERROR',
    /** Failed to generate a prompt. */
    PROMPT_GENERATION_FAILED = 'PROMPT_GENERATION_FAILED',
    /** Failed to parse the output from the LLM. */
    OUTPUT_PARSING_FAILED = 'OUTPUT_PARSING_FAILED',
    /** Error during prompt template rendering or initial structure creation. */
    PROMPT_ASSEMBLY_FAILED = 'PROMPT_ASSEMBLY_FAILED',
    /** The requested prompt fragment does not exist. */
    PROMPT_FRAGMENT_NOT_FOUND = 'PROMPT_FRAGMENT_NOT_FOUND',
    /** The constructed prompt object failed schema validation. */
    PROMPT_VALIDATION_FAILED = 'PROMPT_VALIDATION_FAILED',
    /** Failed to translate the ART standard prompt to a provider-specific format. */
    PROMPT_TRANSLATION_FAILED = 'PROMPT_TRANSLATION_FAILED',

    // Tool Errors
    /** The requested tool could not be found in the registry. */
    TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
    /** The provided tool schema failed validation. */
    TOOL_SCHEMA_VALIDATION_FAILED = 'TOOL_SCHEMA_VALIDATION_FAILED',
    /** A generic error occurred during tool execution. */
    TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
    /** The requested tool is disabled for the current thread. */
    TOOL_DISABLED = 'TOOL_DISABLED',

    // Agent Core / Orchestration Errors
    /** The planning phase of the agent failed. */
    PLANNING_FAILED = 'PLANNING_FAILED',
    /** An error occurred within the ToolSystem execution loop. */
    TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
    /** The synthesis phase of the agent failed. */
    SYNTHESIS_FAILED = 'SYNTHESIS_FAILED',
    /** A general error occurred during the agent's process method. */
    AGENT_PROCESSING_ERROR = 'AGENT_PROCESSING_ERROR',
    /** An A2A (Agent-to-Agent) task delegation failed. */
    DELEGATION_FAILED = 'DELEGATION_FAILED',

    // General Errors
    /** A network error occurred. */
    NETWORK_ERROR = 'NETWORK_ERROR',
    /** An operation timed out. */
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    /** An operation timed out (duplicate of TIMEOUT_ERROR). */
    TIMEOUT = 'TIMEOUT',
    /** An error occurred with an external service. */
    EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
    /** The requested task was not found. */
    TASK_NOT_FOUND = 'TASK_NOT_FOUND',
    /** Input data failed validation. */
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    /** The request was invalid or malformed. */
    INVALID_REQUEST = 'INVALID_REQUEST',
    /** A task with the same ID already exists. */
    DUPLICATE_TASK_ID = 'DUPLICATE_TASK_ID',
    /** A generic error occurred in a repository. */
    REPOSITORY_ERROR = 'REPOSITORY_ERROR',
    /** A connection is already established. */
    ALREADY_CONNECTED = 'ALREADY_CONNECTED',
    /** A required configuration is missing. */
    MISSING_CONFIG = 'MISSING_CONFIG',
    /** The requested feature is not implemented. */
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
    /** No active connection is available. */
    NOT_CONNECTED = 'NOT_CONNECTED',
    /** The request timed out. */
    REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
    /** Standard input is not available. */
    NO_STDIN = 'NO_STDIN',
    /** The provided URL is not an HTTP/HTTPS URL. */
    NO_HTTP_URL = 'NO_HTTP_URL',
    /** An HTTP error occurred. */
    HTTP_ERROR = 'HTTP_ERROR',
    /** The requested server was not found. */
    SERVER_NOT_FOUND = 'SERVER_NOT_FOUND',
    /** A health check for a service failed. */
    HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
    /** Failed to discover tools from a remote source. */
    TOOL_DISCOVERY_FAILED = 'TOOL_DISCOVERY_FAILED',
    /** The requested transport protocol is not supported. */
    UNSUPPORTED_TRANSPORT = 'UNSUPPORTed_TRANSPORT',
    /** A CORS browser extension is required to proceed. */
    CORS_EXTENSION_REQUIRED = 'CORS_EXTENSION_REQUIRED',
    /** CORS permissions are required but have not been granted. */
    CORS_PERMISSION_REQUIRED = 'CORS_PERMISSION_REQUIRED',
    /** An unknown or unexpected error occurred. */
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',

    // Provider Manager Errors
    /** The requested LLM provider is not known or configured. */
    UNKNOWN_PROVIDER = 'UNKNOWN_PROVIDER',
    /** Attempted to activate a local provider when another is already active. */
    LOCAL_PROVIDER_CONFLICT = 'LOCAL_PROVIDER_CONFLICT',
    /** The requested local LLM instance is currently busy. */
    LOCAL_INSTANCE_BUSY = 'LOCAL_INSTANCE_BUSY',
    /** Timeout waiting for an available instance of an API provider. */
    API_QUEUE_TIMEOUT = 'API_QUEUE_TIMEOUT',
    /** Failed to instantiate an adapter for a provider. */
    ADAPTER_INSTANTIATION_ERROR = 'ADAPTER_INSTANTIATION_ERROR',
}

/**
 * Custom error class for ART framework specific errors.
 * It includes an error code, an optional original error for chaining,
 * and a details object for additional context.
 */
export class ARTError extends Error {
    /** The specific error code from the ErrorCode enum. */
    public readonly code: ErrorCode;
    /** The original error that caused this error, if any. */
    public readonly originalError?: Error;
    /** A record of additional details about the error. */
    public details: Record<string, any>;

    /**
     * Creates an instance of ARTError.
     * @param {string} message - The error message.
     * @param {ErrorCode} code - The error code.
     * @param {Error} [originalError] - The original error, if any.
     * @param {Record<string, any>} [details={}] - Additional details about the error.
     */
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

    /**
     * Returns a string representation of the error, including the original error if present.
     * @returns {string} The string representation of the error.
     */
    toString(): string {
        let str = `${this.name} [${this.code}]: ${this.message}`;
        if (this.originalError) {
            str += `\nCaused by: ${this.originalError.stack || this.originalError.toString()}`;
        }
        return str;
    }
}

/**
 * Error thrown when a requested LLM provider is not known or configured.
 */
export class UnknownProviderError extends ARTError {
    constructor(providerName: string) {
        super(`Unknown provider requested: ${providerName}`, ErrorCode.UNKNOWN_PROVIDER);
        this.name = 'UnknownProviderError';
    }
}

/**
 * Error thrown when attempting to activate a local provider while another is already active.
 */
export class LocalProviderConflictError extends ARTError {
    constructor(requestedProvider: string, activeProvider: string) {
        super(`Cannot activate local provider '${requestedProvider}'. Local provider '${activeProvider}' is already active.`, ErrorCode.LOCAL_PROVIDER_CONFLICT);
        this.name = 'LocalProviderConflictError';
    }
}

/**
 * Error thrown when a requested local LLM instance is currently busy.
 */
export class LocalInstanceBusyError extends ARTError {
    constructor(providerName: string, modelId: string) {
        super(`Local provider instance '${providerName}:${modelId}' is currently busy.`, ErrorCode.LOCAL_INSTANCE_BUSY);
        this.name = 'LocalInstanceBusyError';
    }
}

/**
 * Error thrown when a timeout occurs while waiting for an available instance of an API provider.
 */
export class ApiQueueTimeoutError extends ARTError {
    constructor(providerName: string) {
        super(`Timeout waiting for an available instance of API provider '${providerName}'.`, ErrorCode.API_QUEUE_TIMEOUT);
        this.name = 'ApiQueueTimeoutError';
    }
}

/**
 * Error thrown when an adapter for a provider fails to instantiate.
 */
export class AdapterInstantiationError extends ARTError {
    constructor(providerName: string, originalError: Error) {
        super(`Failed to instantiate adapter for provider '${providerName}'.`, ErrorCode.ADAPTER_INSTANTIATION_ERROR, originalError);
        this.name = 'AdapterInstantiationError';
    }
}