import { basename } from 'path';

abstract class Log {
  // TODO: improve typing to avoid repeating method declarations
  public log(...args: any[]): void {};
  public warn(...args: any[]): void {};
  public error(...args: any[]): void {};
}

class Logger extends Log {
  private readonly loggingEnabled: boolean;
  private readonly msgPrefix: string;

  constructor(private readonly moduleName: string) {
    super();

    this.moduleName = moduleName;
    this.loggingEnabled = process.env.NODE_ENV !== 'test';
    this.msgPrefix = `([Module: ${this.moduleName}]):: `;

    this.setupLogger();
  }

  private setupLogger() {
    type TLog = keyof Log;
    const allowedMethodNames: Array<TLog> = ['log', 'warn', 'error'];

    Object.keys(globalThis.console).forEach((methodName): void => {
      if (allowedMethodNames.includes(methodName as TLog)) {
        this[methodName as TLog] = (...args: unknown[]) => {
          if (this.loggingEnabled) {
            globalThis.console[methodName as TLog](this.msgPrefix, ...args);
          }
        };
      } else {
        this[methodName as TLog] = () => {
          throw new ReferenceError(`${methodName} is not implemented in logger!`);
        };
      }
    });
  }
}

function getLogger(moduleFileName: string): Logger {
  if (moduleFileName.endsWith('.spec.js')) {
    throw TypeError('Logger may not be used in *.spec.js files!');
  } else if (moduleFileName.includes('frontend')) {
    throw TypeError('Logger may not be used by modules from frontend/** directory!');
  }

  return new Logger(basename(moduleFileName));
}

export type TLogger = Logger;

export default getLogger;
