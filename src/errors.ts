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
    PROMPT_ASSEMBLY_FAILED = 'PROMPT_ASSEMBLY_FAILED', // Added for PromptManager refactor
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

    // General Errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for ART framework specific errors.
 */
export class ARTError extends Error {
    public readonly code: ErrorCode;
    public readonly originalError?: Error;

    constructor(message: string, code: ErrorCode, originalError?: Error) {
        super(message);
        this.name = 'ARTError';
        this.code = code;
        this.originalError = originalError;

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