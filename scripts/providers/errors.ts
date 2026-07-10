import type { ProviderErrorInfo, ErrorKind } from "./provider.js";

export class ProviderError extends Error {
  readonly kind: ErrorKind;
  readonly fatal: boolean;

  constructor(kind: ErrorKind, message: string, fatal = false) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.fatal = fatal;
  }

  toInfo(): ProviderErrorInfo {
    return { kind: this.kind, safeMessage: this.message, fatal: this.fatal };
  }
}

export class AllModelsFailedError extends Error {
  readonly failures: ProviderErrorInfo[];

  constructor(failures: ProviderErrorInfo[]) {
    const summary = failures.map((f) => `${f.kind}: ${f.safeMessage}`).join("; ");
    super(`All models failed: ${summary}`);
    this.name = "AllModelsFailedError";
    this.failures = failures;
  }
}

/** Builds a non-fatal ProviderError */
export function modelError(kind: ErrorKind, message: string): ProviderError {
  return new ProviderError(kind, message, false);
}

/** Builds a fatal ProviderError */
export function fatalError(kind: ErrorKind, message: string): ProviderError {
  return new ProviderError(kind, message, true);
}

export function isFatalError(error: unknown): error is ProviderError {
  return error instanceof ProviderError && error.fatal;
}
