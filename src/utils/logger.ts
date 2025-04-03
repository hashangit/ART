export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
}

export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
  };

  static configure(config: Partial<LoggerConfig>) {
    Logger.config = { ...Logger.config, ...config };
  }

  static debug(message: string, ...args: any[]) {
    if (Logger.config.level <= LogLevel.DEBUG) {
      console.debug(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    if (Logger.config.level <= LogLevel.INFO) {
      console.info(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (Logger.config.level <= LogLevel.WARN) {
      console.warn(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }

  static error(message: string, ...args: any[]) {
    if (Logger.config.level <= LogLevel.ERROR) {
      console.error(`${Logger.config.prefix || '[ART]'} ${message}`, ...args);
    }
  }
}