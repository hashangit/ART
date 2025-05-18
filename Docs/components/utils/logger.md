# Utility: `Logger`

The ART Framework includes a simple, static `Logger` class for handling console log messages at different severity levels. This helps in debugging and monitoring the framework's internal operations as well as application-specific events.

*   **Source:** `src/utils/logger.ts`

## Features

*   **Static Class:** No need to instantiate; methods are called directly (e.g., `Logger.info(...)`).
*   **Configurable Log Level:** You can set a minimum log level to control the verbosity of the output.
*   **Standard Log Levels:** Supports `DEBUG`, `INFO`, `WARN`, and `ERROR` levels.
*   **Optional Prefix:** A prefix (defaulting to `[ART]`) can be added to all log messages for easy identification.
*   **Console Output:** Uses standard `console.debug`, `console.info`, `console.warn`, and `console.error`.

## `LogLevel` Enum

Defines the available logging levels, ordered by severity (lower number is more verbose):

```typescript
export enum LogLevel {
  DEBUG = 0, // Detailed debugging information
  INFO = 1,  // General informational messages
  WARN = 2,  // Potential issues or unexpected situations
  ERROR = 3  // Errors indicating a failure
}
```

## Configuration

The `Logger` is configured globally using the static `configure` method.

*   **`Logger.configure(config: Partial<LoggerConfig>): void`**
    *   `config: Partial<LoggerConfig>`: An object that can contain:
        *   `level?: LogLevel`: The minimum log level to output. Messages below this level will be ignored. Defaults to `LogLevel.INFO` if not configured.
        *   `prefix?: string`: An optional string to prepend to all log messages. Defaults to `[ART]` if not set during configuration.

**Example Configuration (typically done once at application startup):**

```typescript
import { Logger, LogLevel, ArtInstanceConfig /* ... */ } from 'art-framework';

// Example within your ArtInstanceConfig setup
const artConfig: ArtInstanceConfig = {
    // ... other configurations ...
    logger: {
        level: LogLevel.DEBUG, // Show all messages including debug
        // prefix: "[MyAgentApp]" // Optional: Custom prefix
    },
};

// If you are not using ArtInstanceConfig to set it, or want to change it later:
// Logger.configure({ level: LogLevel.WARN, prefix: "[MyApp-ART]" });

// Note: If ArtInstanceConfig.logger is provided to createArtInstance,
// the AgentFactory will internally call Logger.configure.
// If you call Logger.configure manually, it will affect the global logger state.
```
If `ArtInstanceConfig.logger` is provided to `createArtInstance`, the `AgentFactory` will call `Logger.configure` internally.

## Logging Methods

All logging methods are static:

*   **`Logger.debug(message: string, ...args: any[]): void`**
    *   Logs a message at the `DEBUG` level.
    *   Only outputs if the configured `level` is `LogLevel.DEBUG`.

*   **`Logger.info(message: string, ...args: any[]): void`**
    *   Logs a message at the `INFO` level.
    *   Outputs if the configured `level` is `LogLevel.INFO` or `LogLevel.DEBUG`.

*   **`Logger.warn(message: string, ...args: any[]): void`**
    *   Logs a message at the `WARN` level.
    *   Outputs if the configured `level` is `LogLevel.WARN`, `LogLevel.INFO`, or `LogLevel.DEBUG`.

*   **`Logger.error(message: string, ...args: any[]): void`**
    *   Logs a message at the `ERROR` level.
    *   Outputs for any configured `level` (as `ERROR` is the highest severity).

**Usage Example:**

```typescript
import { Logger, LogLevel } from 'art-framework';

Logger.configure({ level: LogLevel.INFO });

Logger.debug("This debug message will not be shown."); // Below configured level
Logger.info("Application started successfully.", { version: "1.0.0" });
Logger.warn("A minor configuration issue was detected.", { setting: "someSetting" });
Logger.error("A critical error occurred!", new Error("Something went wrong"));

// Output (if prefix is default '[ART]'):
// [ART] Application started successfully. { version: '1.0.0' }
// [ART] A minor configuration issue was detected. { setting: 'someSetting' }
// [ART] A critical error occurred! Error: Something went wrong
//     at ... (stack trace)
```

The `Logger` is used extensively throughout the ART Framework internals to provide insights into its operations. Application developers can also use it for their own logging needs, benefiting from the same level and prefix configuration.