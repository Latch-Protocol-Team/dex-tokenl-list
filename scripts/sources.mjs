// SPDX-License-Identifier: MIT
/**
 * `logos/SOURCES.md` is the provenance ledger: a Markdown table whose `File`
 * column names every logo under `logos/` relative to that directory. This
 * module reads the ledger so the generator and the checker agree on what is
 * "sourced", and so the published repository's CI can enforce the same rule
 * without a copy of the generator.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** `<chainId>/<0x address>.png|svg` or `shared/<name>.svg|png`. Anything else is not a logo path. */
export const LOGO_FILE_RE = /^(?:\d+\/0x[0-9a-fA-F]{40}|shared\/[a-z0-9-]+)\.(?:png|svg)$/;

/**
 * The relative paths the ledger records, from every table row whose first
 * cell is a backticked file name. Header and separator rows are skipped.
 */
export function sourcedLogoFiles(logosDir) {
  const ledger = join(logosDir, "SOURCES.md");
  if (!existsSync(ledger)) return new Set();
  const out = new Set();
  for (const line of readFileSync(ledger, "utf8").split(/\r?\n/)) {
    const m = /^\|\s*`([^`]+)`\s*\|/.exec(line);
    if (m !== null) out.add(m[1].replace(/\\/g, "/"));
  }
  return out;
}

/** Every file under `logos/` except the ledger itself, relative with forward slashes. */
export function logoFilesOnDisk(logosDir) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name !== "SOURCES.md") out.push(relative(logosDir, p).replace(/\\/g, "/"));
    }
  };
  walk(logosDir);
  return out.sort();
}
