import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import pkg from "../package.json" with { type: "json" };

function runCli(flag: string) {
  return spawnSync("pnpm", ["exec", "tsx", "index.ts", flag], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 3000,
  });
}

describe("CLI metadata flags", () => {
  it("prints the package version without starting the server", () => {
    const result = runCli("--version");

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), pkg.version);
    assert.equal(result.stderr, "");
  });

  it("prints help without starting the server", () => {
    const result = runCli("--help");

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /--version/);
    assert.equal(result.stderr, "");
  });
});
