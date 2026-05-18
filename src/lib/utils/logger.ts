type LogMethod = (...args: unknown[]) => void;

export const devLog: {
  log: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  logIf: (flag: string, ...args: unknown[]) => void;
} = {
  log: (...args) => {
    if (process.env.NODE_ENV !== "production") console.log(...args);
  },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  logIf: (flag, ...args) => {
    const enabled = process.env.DEBUG?.split(",").includes(flag) || process.env.NODE_ENV !== "production";
    if (enabled) console.log(...args);
  },
};
