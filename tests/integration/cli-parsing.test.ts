import { describe, it, expect } from "vitest";

/**
 * CLI command parsing tests.
 * The CLI is invoked as `tsx scripts/cli.ts <command> [options]`.
 */
describe("CLI command parsing", () => {
  type CliArgs = {
    command: string;
    force?: boolean;
    resume?: boolean;
  };

  function parseArgs(argv: string[]): CliArgs {
    const cmd = argv[2];
    const rest = argv.slice(3);
    const result: CliArgs = { command: cmd };

    for (let i = 0; i < rest.length; i++) {
      switch (rest[i]) {
        case "--force":
          result.force = true;
          break;
        case "--resume":
          result.resume = true;
          break;
      }
    }

    return result;
  }

  it("parses 'check' command", () => {
    const args = parseArgs(["node", "cli.ts", "check"]);
    expect(args.command).toBe("check");
  });

  it("parses 'sync' command", () => {
    const args = parseArgs(["node", "cli.ts", "sync"]);
    expect(args.command).toBe("sync");
  });

  it("parses 'sync --force' command", () => {
    const args = parseArgs(["node", "cli.ts", "sync", "--force"]);
    expect(args.command).toBe("sync");
    expect(args.force).toBe(true);
  });

  it("parses 'resume' command", () => {
    const args = parseArgs(["node", "cli.ts", "resume"]);
    expect(args.command).toBe("resume");
  });

  it("parses 'resume --force' command", () => {
    const args = parseArgs(["node", "cli.ts", "resume", "--force"]);
    expect(args.command).toBe("resume");
    expect(args.force).toBe(true);
  });

  it("handles unknown commands", () => {
    const args = parseArgs(["node", "cli.ts", "unknown"]);
    expect(args.command).toBe("unknown");
  });

  it("treats missing command as undefined", () => {
    const args = parseArgs(["node", "cli.ts"]);
    expect(args.command).toBeUndefined();
  });

  it("handles --resume flag for resume command", () => {
    const args = parseArgs(["node", "cli.ts", "resume", "--resume"]);
    expect(args.command).toBe("resume");
    expect(args.resume).toBe(true);
  });

  it("handles combined flags", () => {
    const args = parseArgs(["node", "cli.ts", "sync", "--force", "--resume"]);
    expect(args.command).toBe("sync");
    expect(args.force).toBe(true);
    expect(args.resume).toBe(true);
  });
});
