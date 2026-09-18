#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/* ============================================================================
   Checks the built lists. Run by `npm test` here and by the published
   repository's CI (it travels there with `scripts/sync.mjs`), so it depends
   on nothing the monorepo alone has: the official schema, ajv, viem and,
   when present, the SDK for a second opinion.

   What fails the check:
     1. a list that does not satisfy the OFFICIAL schema
        (`@uniswap/token-lists/src/tokenlist.schema.json`, through ajv);
     2. a token whose `chainId` is not the file's, or a file whose name is
        not `<chainId>.tokenlist.json`;
     3. a `logoURI` that is not served from this repository's `logos/`, or
        that points at a file with no row in `logos/SOURCES.md`, or a logo
        file on disk with no row (and a row with no file);
     4. a version that does not carry the bump the standard requires over the
        previous committed list (`--git-ref`, default HEAD; skipped when the
        list is not in git yet);
     5. with `--chain`: a token whose decimals, symbol or name on chain differ
        from the list (Multicall3 through the probed public endpoints).

   Usage:
     node scripts/check.mjs [--dir <lists dir>] [--git-ref <ref>] [--chain]
                            [--rpcs <rpc-endpoints.json>]
   ============================================================================ */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { createPublicClient, fallback, http } from "viem";

import { LOGO_FILE_RE, logoFilesOnDisk, sourcedLogoFiles } from "./sources.mjs";

const require = createRequire(import.meta.url);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const DIR = resolve(opt("--dir") ?? join(ROOT, "dist"));
const LOGOS = join(ROOT, "logos");
const GIT_REF = opt("--git-ref") ?? "HEAD";
const CHAIN_CHECK = args.includes("--chain");
const RPCS_FILE = opt("--rpcs") ?? join(ROOT, "rpc-endpoints.json");

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const NATIVE = "0x0000000000000000000000000000000000000000";

/* ----------------------------------------------------------------- schema --- */

const schema = require("@uniswap/token-lists/src/tokenlist.schema.json");
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

/** The SDK's dependency-free validator, when the SDK is installed beside us; `null` otherwise. */
async function sdkValidator() {
  try {
    const sdk = await import("@latchprotocol/sdk");
    return typeof sdk.validateTokenList === "function" ? sdk.validateTokenList : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- versioning --- */

function previous(fileName) {
  try {
    const text = execFileSync("git", ["show", `${GIT_REF}:./${fileName}`], { cwd: DIR, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function requiredBump(prevTokens, nextTokens) {
  const prev = new Map(prevTokens.map((t) => [t.address.toLowerCase(), t]));
  const next = new Map(nextTokens.map((t) => [t.address.toLowerCase(), t]));
  for (const key of prev.keys()) if (!next.has(key)) return "major";
  for (const key of next.keys()) if (!prev.has(key)) return "minor";
  for (const [key, t] of next) if (JSON.stringify(t) !== JSON.stringify(prev.get(key))) return "patch";
  return null;
}

function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/* ------------------------------------------------------------- chain check --- */

const ERC20_META_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
];

/** Endpoints from `rpc-endpoints.json` (the published repo) or the SDK (the monorepo); nodeflare last either way. */
async function endpointsFor(chainId) {
  let urls = [];
  if (existsSync(RPCS_FILE)) {
    const table = JSON.parse(readFileSync(RPCS_FILE, "utf8"));
    urls = table[String(chainId)] ?? [];
  } else {
    try {
      const sdk = await import("@latchprotocol/sdk");
      urls = sdk.resolveEndpoints(chainId, process.env);
    } catch {
      urls = [];
    }
  }
  const priv = (process.env[`LATCH_RPC_${chainId}`] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const all = [...new Set([...priv, ...urls])];
  const slow = all.filter((u) => u.includes("nodeflare"));
  return [...all.filter((u) => !slow.includes(u)), ...slow];
}

async function checkOnChain(chainId, tokens) {
  const urls = await endpointsFor(chainId);
  if (urls.length === 0) return [`${chainId}: no RPC endpoint known; set LATCH_RPC_${chainId}`];
  const client = createPublicClient({ transport: fallback(urls.map((u) => http(u, { timeout: 20_000, retryCount: 1, retryDelay: 500 })), { rank: false }) });
  const erc20s = tokens.filter((t) => t.address.toLowerCase() !== NATIVE);
  const drift = [];
  const BATCH = 25;
  for (let i = 0; i < erc20s.length; i += BATCH) {
    const slice = erc20s.slice(i, i + BATCH);
    const results = await client.multicall({
      multicallAddress: MULTICALL3,
      allowFailure: true,
      contracts: slice.flatMap((t) => ["decimals", "symbol", "name"].map((functionName) => ({ address: t.address, abi: ERC20_META_ABI, functionName }))),
    });
    slice.forEach((t, j) => {
      const [dec, sym, nam] = [results[j * 3], results[j * 3 + 1], results[j * 3 + 2]];
      const failed = [dec, sym, nam].find((r) => r.status !== "success");
      if (failed !== undefined) {
        drift.push(`${chainId}: ${t.symbol} ${t.address}: ${failed.error?.shortMessage ?? "did not answer"}`);
        return;
      }
      if (Number(dec.result) !== t.decimals) drift.push(`${chainId}: ${t.symbol} ${t.address}: decimals on chain ${Number(dec.result)}, list says ${t.decimals}`);
      if (sym.result !== t.symbol) drift.push(`${chainId}: ${t.address}: symbol on chain "${sym.result}", list says "${t.symbol}"`);
      /* The list holds at most the first 60 characters of the on-chain name (schema cap). */
      const onChain = String(nam.result).trim();
      if (onChain !== t.name && !(onChain.length > 60 && onChain.slice(0, 60).trimEnd() === t.name)) {
        drift.push(`${chainId}: ${t.symbol} ${t.address}: name on chain "${onChain}", list says "${t.name}"`);
      }
    });
  }
  return drift;
}

/* -------------------------------------------------------------------- main --- */

async function main() {
  const problems = [];
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".tokenlist.json")).sort() : [];
  if (files.length === 0) {
    console.error(`no *.tokenlist.json in ${DIR}`);
    process.exit(1);
  }
  const sdkValidate = await sdkValidator();
  const sourced = sourcedLogoFiles(LOGOS);
  const onDisk = logoFilesOnDisk(LOGOS);

  /* 3b. the ledger and the directory agree, both ways */
  for (const f of onDisk) {
    if (!LOGO_FILE_RE.test(f)) problems.push(`logos/${f}: not a logo path (<chainId>/<0x address>.png|svg or shared/<name>.png|svg)`);
    if (!sourced.has(f)) problems.push(`logos/${f}: no row in logos/SOURCES.md. Record where it came from or delete it.`);
  }
  for (const f of sourced) {
    if (!existsSync(join(LOGOS, f))) problems.push(`logos/SOURCES.md names logos/${f}, which does not exist`);
  }

  const summary = [];
  for (const fileName of files) {
    const path = join(DIR, fileName);
    let list;
    try {
      list = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      problems.push(`${fileName}: not JSON (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }
    const chainId = Number(/^(\d+)\.tokenlist\.json$/.exec(fileName)?.[1]);
    if (!Number.isInteger(chainId)) {
      problems.push(`${fileName}: file name is not <chainId>.tokenlist.json`);
      continue;
    }

    /* 1. the official schema */
    if (!validateSchema(list)) {
      for (const err of validateSchema.errors ?? []) problems.push(`${fileName}: schema: ${err.instancePath || "/"} ${err.message ?? ""}`);
    }
    if (sdkValidate !== null) {
      for (const issue of sdkValidate(list)) problems.push(`${fileName}: sdk validator: ${issue.path}: ${issue.message}`);
    }
    const tokens = Array.isArray(list.tokens) ? list.tokens : [];

    /* 2. one chain per file */
    for (const t of tokens) {
      if (t.chainId !== chainId) problems.push(`${fileName}: ${t.symbol} ${t.address} is on chain ${t.chainId}`);
    }
    if (list.extensions?.latch?.chainId !== undefined && list.extensions.latch.chainId !== chainId) {
      problems.push(`${fileName}: extensions.latch.chainId is ${list.extensions.latch.chainId}`);
    }
    const seen = new Set();
    for (const t of tokens) {
      const key = String(t.address).toLowerCase();
      if (seen.has(key)) problems.push(`${fileName}: ${t.address} appears twice`);
      seen.add(key);
    }

    /* 3. every logo is ours and sourced */
    for (const t of tokens) {
      if (t.logoURI === undefined) continue;
      const m = /\/logos\/(.+)$/.exec(t.logoURI);
      if (m === null || !/^https:\/\//.test(t.logoURI)) {
        problems.push(`${fileName}: ${t.symbol}: logoURI ${t.logoURI} is not served from this repository's logos/ over https`);
        continue;
      }
      const rel = m[1];
      if (!LOGO_FILE_RE.test(rel)) problems.push(`${fileName}: ${t.symbol}: logo path ${rel} is not <chainId>/<address>.png or shared/<name>.svg`);
      else if (!existsSync(join(LOGOS, rel))) problems.push(`${fileName}: ${t.symbol}: logoURI names logos/${rel}, which does not exist`);
      else if (!sourced.has(rel)) problems.push(`${fileName}: ${t.symbol}: logos/${rel} has no row in logos/SOURCES.md`);
      if (rel.startsWith("shared/")) {
        if (String(t.address).toLowerCase() !== NATIVE) problems.push(`${fileName}: ${t.symbol}: only the native asset may use a shared/ logo`);
      } else if (!rel.startsWith(`${chainId}/`) || rel.split("/")[1]?.split(".")[0]?.toLowerCase() !== String(t.address).toLowerCase()) {
        problems.push(`${fileName}: ${t.symbol}: logo path ${rel} does not name this token on this chain`);
      }
    }

    /* 4. the version carries the bump the standard requires */
    const prev = previous(fileName);
    let change = "not in git";
    if (prev !== null && list.version !== undefined && prev.version !== undefined) {
      const need = requiredBump(prev.tokens ?? [], tokens);
      const cmp = compareVersions(list.version, prev.version);
      const bumped =
        need === null
          ? "none"
          : list.version.major > prev.version.major
            ? "major"
            : list.version.minor > prev.version.minor
              ? "minor"
              : list.version.patch > prev.version.patch
                ? "patch"
                : "none";
      const rank = { none: 0, patch: 1, minor: 2, major: 3 };
      if (need === null && cmp !== 0) problems.push(`${fileName}: tokens are unchanged since ${GIT_REF} but the version moved`);
      if (need !== null && cmp <= 0) problems.push(`${fileName}: tokens changed (${need}) since ${GIT_REF} but the version did not increase`);
      if (need !== null && rank[bumped] < rank[need]) problems.push(`${fileName}: tokens changed (${need}) since ${GIT_REF}; the version bump is only ${bumped}`);
      change = need ?? "unchanged";
    }

    /* 5. on chain */
    if (CHAIN_CHECK) problems.push(...(await checkOnChain(chainId, tokens)));

    summary.push({ fileName, tokens: tokens.length, version: list.version ? `${list.version.major}.${list.version.minor}.${list.version.patch}` : "?", change, verified: list.extensions?.latch?.verifiedOnChain });
  }

  for (const s of summary) {
    console.log(`${s.fileName}: ${s.tokens} tokens, v${s.version}, ${s.change} vs ${GIT_REF}${s.verified === false ? ", built OFFLINE (verifiedOnChain: false)" : ""}`);
  }
  console.log(`schema: ${schema.$id}${sdkValidate === null ? " (SDK validator not installed; official schema only)" : " + SDK validator"}${CHAIN_CHECK ? "; decimals, symbol and name re-read on chain" : ""}`);
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("ok");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
