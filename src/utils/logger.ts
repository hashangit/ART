/**
 * Defines the available logging levels, ordered from most verbose to least verbose.
 */
export enum LogLevel {
  /** Detailed debugging information, useful for development. */
  DEBUG = 0,
  /** General informational messages about application flow. */
  INFO = 1,
  /** Potential issues or unexpected situations that don't prevent execution. */
  WARN = 2,
  /** Errors that indicate a failure or problem. */
  ERROR = 3,
}

/**
 * Configuration options for the static Logger class.
 */
export interface LoggerConfig {
  /** The minimum log level to output messages for. Messages below this level will be ignored. */
  level: LogLevel;
  /** An optional prefix string to prepend to all log messages (e.g., '[MyApp]'). Defaults to '[ART]'. */
  prefix?: string;
}

/**
 * A simple static logger class for outputting messages to the console at different levels.
 * Configuration is global via the static `configure` method.
 */
export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
  };

  /**
   * Configures the static logger settings.
   * @param config - A partial `LoggerConfig` object. Provided settings will override defaults.
   */
  static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Logs a message at the DEBUG level.
   * Only outputs if the configured log level is DEBUG.
   * @param message - The main log message string.
   * @param args - Additional arguments to include in the console output (e.g., objects, arrays).
   */
  static debug(message: string, ...args: any[]): void {
    if (Logger.config.level <= LogLevel.DEBUG) {
      console.debug(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  /**
   * Logs a message at the INFO level.
   * Outputs if the configured log level is INFO or DEBUG.
   * @param message - The main log message string.
   * @param args - Additional arguments to include in the console output.
   */
  static info(message: string, ...args: any[]): void {
    if (Logger.config.level <= LogLevel.INFO) {
      console.info(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  /**
   * Logs a message at the WARN level.
   * Outputs if the configured log level is WARN, INFO, or DEBUG.
   * @param message - The main log message string.
   * @param args - Additional arguments to include in the console output.
   */
  static warn(message: string, ...args: any[]): void {
    if (Logger.config.level <= LogLevel.WARN) {
      console.warn(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  /**
   * Logs a message at the ERROR level.
   * Outputs if the configured log level is ERROR, WARN, INFO, or DEBUG.
   * @param message - The main log message string.
   * @param args - Additional arguments to include in the console output (often an error object).
   */
  static error(message: string, ...args: any[]): void {
    if (Logger.config.level <= LogLevel.ERROR) {
      console.error(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }
}