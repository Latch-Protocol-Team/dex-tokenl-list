// SPDX-License-Identifier: MIT
/* ============================================================================
   The STOCK checks a token list entry tagged `stock` must pass. Run by
   scripts/check.mjs here and in the published repository's CI, so it depends
   on viem alone.

   WHY THIS EXISTS. Since 2026-09-18 the published list is the runtime source
   of truth for "this token is a stock" (owner decision): a pull request to
   the public repository can add one without any SDK release. The reads the
   SDK's registry demanded of a human (docs/stocks-by-chain.md) therefore run
   here, on every push, for every stock in every list:

     shape      `extensions.stock` = { issuer, ticker, rebasing, controls,
                verifiedAt? }, `controls` the seven booleans, `rebasing`
                agreeing with `controls.rebasing`, the `stock` tag present
                (and `rebasing` tag iff rebasing). Offline.
     rebasing   a share-accounting face (`balancePerShare`, `sharesOf`,
                `convertToAssets`, `convertToShares`, `getCurrentMultiplier`,
                the ERC-4626 `asset`) that ANSWERS, or an issuer documented
                as rebasing (Dinari, Backed), means the entry MUST say
                `rebasing: true`. The check can only turn the flag on; it
                never trusts an absence to turn it off.
     pause      the pause views that answer (`tokenPaused`, `paused`,
                `pauseManager().isTokenPaused(token)`, `pausedFeatures`)
                must read "not paused", and any that answers means
                `controls.pause` must be true.
     blocklist  the block/sanction views that answer, on the token or on the
                registry it names (`ACCESS_CONTROLLED_REGISTRY`, `compliance`,
                `transferRestrictor`, `sanctionsList`), must not block
                Multicall3 or the Latch Vault, and any that answers means
                `controls.blocklist` must be true.
     transfer   `transfer(Multicall3, 1)` simulated from a real holder (found
                through recent `Transfer` logs) must return true, unless the
                entry declares `controls.allowlist: true`. No holder found ⇒
                SKIPPED with a message, never a pass.

   `false` in `controls` is a claim of proof; a read that contradicts it fails
   the list. `true` is never contradicted by an absence: a power that could
   not be observed may still exist.
   ============================================================================ */

import { encodeFunctionData, parseAbi } from "viem";

export const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
/** The Latch Vault on 4663; on other chains it is only an arbitrary second contract. */
const LATCH_VAULT = "0x78e8359c6D34Df797b8A793dE8c7c6bffA97fB6c";
const ZERO = "0x0000000000000000000000000000000000000000";

export const CONTROL_KEYS = ["pause", "blocklist", "allowlist", "issuerBurn", "upgradeable", "uiMultiplier", "rebasing"];

/** Issuers whose token designs rebase `balanceOf`, from docs/stocks-by-chain.md. Matched on the issuer string, case-insensitively. */
export const REBASING_ISSUERS = [/\bdinari\b/i, /\bbacked\b/i];

const ABI = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function tokenPaused() view returns (bool)",
  "function paused() view returns (bool)",
  "function pausedFeatures() view returns (uint8[])",
  "function pauseManager() view returns (address)",
  "function isTokenPaused(address) view returns (bool)",
  "function ACCESS_CONTROLLED_REGISTRY() view returns (address)",
  "function compliance() view returns (address)",
  "function transferRestrictor() view returns (address)",
  "function sanctionsList() view returns (address)",
  "function isBlocked(address) view returns (bool)",
  "function isBlacklisted(address) view returns (bool)",
  "function isSanctioned(address) view returns (bool)",
  "function checkIsCompliant(address token, address user) view",
  "function balancePerShare() view returns (uint256)",
  "function sharesOf(address) view returns (uint256)",
  "function convertToAssets(uint256) view returns (uint256)",
  "function convertToShares(uint256) view returns (uint256)",
  "function getCurrentMultiplier() view returns (uint256)",
  "function asset() view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
const TRANSFER_EVENT = ABI.find((x) => x.type === "event");

/* ---------------------------------------------------------------- shape --- */

/** `extensions.stock` when the entry is a stock, else null; `problems` gets every objection. */
export function stockShape(fileName, t, problems) {
  const tags = Array.isArray(t.tags) ? t.tags : [];
  const ext = t.extensions?.stock;
  const tagged = tags.includes("stock");
  if (ext === undefined && !tagged) return null;
  const who = `${fileName}: ${t.symbol} ${t.address}`;
  if (ext === undefined) {
    problems.push(`${who}: tagged stock but has no extensions.stock`);
    return null;
  }
  if (!tagged) problems.push(`${who}: has extensions.stock but no stock tag`);
  if (typeof ext !== "object" || ext === null) {
    problems.push(`${who}: extensions.stock is not an object`);
    return null;
  }
  if (typeof ext.issuer !== "string" || ext.issuer.length === 0) problems.push(`${who}: extensions.stock.issuer must be a non-empty string`);
  if (typeof ext.ticker !== "string" || ext.ticker.length === 0) problems.push(`${who}: extensions.stock.ticker must be a non-empty string`);
  if (typeof ext.rebasing !== "boolean") problems.push(`${who}: extensions.stock.rebasing must be a boolean`);
  const c = ext.controls;
  if (typeof c !== "object" || c === null) {
    problems.push(`${who}: extensions.stock.controls is required for a stock (the seven booleans: ${CONTROL_KEYS.join(", ")})`);
  } else {
    for (const k of CONTROL_KEYS) if (typeof c[k] !== "boolean") problems.push(`${who}: extensions.stock.controls.${k} must be a boolean`);
    if (typeof c.rebasing === "boolean" && typeof ext.rebasing === "boolean" && c.rebasing !== ext.rebasing) {
      problems.push(`${who}: extensions.stock.rebasing (${ext.rebasing}) and controls.rebasing (${c.rebasing}) disagree`);
    }
  }
  if (ext.verifiedAt !== undefined && !(typeof ext.verifiedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ext.verifiedAt) && !Number.isNaN(Date.parse(ext.verifiedAt)))) {
    problems.push(`${who}: extensions.stock.verifiedAt must be an ISO day (YYYY-MM-DD)`);
  }
  const rebasing = ext.rebasing === true || c?.rebasing === true;
  if (rebasing && !tags.includes("rebasing")) problems.push(`${who}: a rebasing stock must carry the rebasing tag`);
  if (!rebasing && tags.includes("rebasing")) problems.push(`${who}: tagged rebasing but extensions.stock says it is not`);
  if (REBASING_ISSUERS.some((re) => re.test(String(ext.issuer))) && !rebasing) {
    problems.push(`${who}: issuer "${ext.issuer}" is documented as rebasing (docs/stocks-by-chain.md); the entry must say rebasing: true`);
  }
  if (String(t.address).toLowerCase() === ZERO) problems.push(`${who}: the native asset cannot be a stock`);
  return ext;
}

/* ------------------------------------------------------------- on chain --- */

/** eth_call a view; `{ ok: true, data }` when it answered with data, `{ ok: false }` when it reverted or returned nothing. */
async function probe(client, to, functionName, args = [], account) {
  try {
    const res = await client.call({ to, data: encodeFunctionData({ abi: ABI, functionName, args }), ...(account === undefined ? {} : { account }) });
    if (res.data === undefined || res.data === "0x") return { ok: false, reason: "no data" };
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, reason: String(e.shortMessage ?? e.message).slice(0, 100) };
  }
}
const asBool = (data) => /^0x0*1$/.test(data);
const asAddress = (data) => (data.length >= 66 ? "0x" + data.slice(26, 66) : null);

/**
 * A holder with a non-zero balance, from the most recent `Transfer` logs.
 * Windows adapt to the endpoint's range cap: public endpoints refuse a wide
 * range in their own words ("Invalid parameters", "exceeds limit", a bare
 * "RPC Request failed"), so ANY getLogs failure halves the window, never
 * below `minWindow` (BSC's thirdweb endpoint caps at 1,000 blocks; Robinhood's
 * canonical endpoint caps a busy token by result count). At most `budget`
 * requests. `holder: null` when none was found, with the reason.
 */
export async function findHolder(client, token, { head, startWindow = 8_000n, minWindow = 500n, budget = 40 } = {}) {
  let win = startWindow;
  let to = head;
  let requests = 0;
  const tried = new Set();
  while (requests < budget && to > 0n) {
    const from = to - win + 1n > 0n ? to - win + 1n : 0n;
    let logs;
    try {
      requests++;
      logs = await client.getLogs({ address: token, event: TRANSFER_EVENT, fromBlock: from, toBlock: to });
    } catch (e) {
      const m = String(e.shortMessage ?? e.message).replace(/\s+/g, " ");
      if (win > minWindow) {
        win = win / 2n < minWindow ? minWindow : win / 2n;
        continue;
      }
      return { holder: null, requests, reason: `getLogs failed at a ${win}-block window: ${m.slice(0, 100)}` };
    }
    for (const l of logs.reverse()) {
      const h = l.args?.to;
      if (!h || h === ZERO || tried.has(h.toLowerCase())) continue;
      tried.add(h.toLowerCase());
      const bal = await probe(client, token, "balanceOf", [h]);
      if (bal.ok && BigInt(bal.data) > 0n) return { holder: h, block: l.blockNumber, requests, window: win };
      if (tried.size >= 12) break; /* enough candidates from one window; move on */
    }
    to = from - 1n;
  }
  return { holder: null, requests, reason: `no Transfer to a current holder in the last ${requests} window(s)` };
}

/**
 * Every on-chain stock check for one entry. Returns `{ problems, skipped, facts }`:
 * problems fail the list, skipped are reported, facts are what was read.
 */
export async function checkStockOnChain(client, chainId, t, ext, head) {
  const problems = [];
  const skipped = [];
  const facts = {};
  const who = `${chainId}: ${t.symbol} ${t.address}`;
  const token = t.address;
  const c = ext.controls ?? {};

  /* --- rebasing: a share-accounting face that answers is proof --- */
  const shareFaces = [
    ["balancePerShare", []],
    ["sharesOf", [MULTICALL3]],
    ["convertToAssets", [1000000000000000000n]],
    ["convertToShares", [1000000000000000000n]],
    ["getCurrentMultiplier", []],
    ["asset", []],
  ];
  const answered = [];
  for (const [fn, args] of shareFaces) {
    const r = await probe(client, token, fn, args);
    if (r.ok) answered.push(fn);
  }
  facts.shareFaces = answered;
  const declaredRebasing = ext.rebasing === true || c.rebasing === true;
  if (answered.length > 0 && !declaredRebasing) {
    problems.push(`${who}: answers share-accounting selector(s) ${answered.join(", ")} — a rebasing design; the entry must say rebasing: true`);
  }

  /* --- pause --- */
  const pauseReads = [];
  for (const fn of ["tokenPaused", "paused"]) {
    const r = await probe(client, token, fn);
    if (r.ok) pauseReads.push([fn, asBool(r.data)]);
  }
  const pm = await probe(client, token, "pauseManager");
  if (pm.ok && asAddress(pm.data) !== null && asAddress(pm.data) !== ZERO) {
    const r = await probe(client, asAddress(pm.data), "isTokenPaused", [token]);
    if (r.ok) pauseReads.push(["pauseManager.isTokenPaused", asBool(r.data)]);
  }
  const pf = await probe(client, token, "pausedFeatures");
  if (pf.ok) {
    /* uint8[]: offset, length, items. Non-empty means some feature is paused. */
    const len = pf.data.length >= 130 ? BigInt("0x" + pf.data.slice(66, 130)) : 0n;
    pauseReads.push(["pausedFeatures", len > 0n]);
  }
  facts.pause = pauseReads;
  for (const [fn, paused] of pauseReads) {
    if (paused) problems.push(`${who}: ${fn}() reads paused — a paused token cannot be listed as tradable`);
  }
  if (pauseReads.length > 0 && c.pause === false) problems.push(`${who}: controls.pause is false but ${pauseReads.map(([f]) => f).join(", ")} answers: a pause switch exists`);

  /* --- blocklist: the token's own views and the registry it names --- */
  const blockReads = [];
  const subjects = [MULTICALL3, ...(chainId === 4663 ? [LATCH_VAULT] : [])];
  for (const fn of ["isBlocked", "isBlacklisted"]) {
    for (const a of subjects) {
      const r = await probe(client, token, fn, [a]);
      if (r.ok) blockReads.push([`${fn}(${a.slice(0, 6)}…)`, asBool(r.data)]);
    }
  }
  const registries = [
    ["ACCESS_CONTROLLED_REGISTRY", "isBlocked"],
    ["transferRestrictor", "isBlacklisted"],
    ["sanctionsList", "isSanctioned"],
  ];
  for (const [getter, view] of registries) {
    const g = await probe(client, token, getter);
    const reg = g.ok ? asAddress(g.data) : null;
    if (reg === null || reg === ZERO) continue;
    for (const a of subjects) {
      const r = await probe(client, reg, view, [a]);
      if (r.ok) blockReads.push([`${getter}().${view}(${a.slice(0, 6)}…)`, asBool(r.data)]);
    }
  }
  const comp = await probe(client, token, "compliance");
  if (comp.ok && asAddress(comp.data) !== null && asAddress(comp.data) !== ZERO) {
    for (const a of subjects) {
      /* reverts UserBlocked / UserSanctioned when blocked; a clean return is "not blocked" */
      const r = await probe(client, asAddress(comp.data), "checkIsCompliant", [token, a]);
      blockReads.push([`compliance().checkIsCompliant(token, ${a.slice(0, 6)}…)`, !r.ok && !/no data/.test(r.reason)]);
    }
  }
  facts.blocklist = blockReads;
  for (const [fn, blocked] of blockReads) {
    if (blocked) problems.push(`${who}: ${fn} reads blocked — an arbitrary contract is refused; the token cannot be a pool currency`);
  }
  if (blockReads.length > 0 && c.blocklist === false) problems.push(`${who}: controls.blocklist is false but ${blockReads.map(([f]) => f).join(", ")} answers: a blocklist exists`);

  /* --- transfer into an arbitrary contract, from a real holder --- */
  const h = await findHolder(client, token, { head });
  facts.holder = h;
  if (h.holder === null) {
    skipped.push(`${who}: transfer simulation SKIPPED — ${h.reason} (${h.requests} getLogs request(s)); no holder to simulate from`);
  } else {
    const r = await probe(client, token, "transfer", [MULTICALL3, 1n], h.holder);
    facts.transferToMulticall3 = r.ok ? asBool(r.data) : r.reason;
    if (r.ok && asBool(r.data)) {
      if (c.allowlist === true) problems.push(`${who}: controls.allowlist is true but transfer(Multicall3, 1) from ${h.holder} simulated true: an unregistered contract can receive, so no allowlist gates receipt`);
    } else if (c.allowlist === true) {
      skipped.push(`${who}: transfer(Multicall3, 1) from ${h.holder} did not succeed (${r.ok ? "returned " + r.data : r.reason}); consistent with the declared allowlist`);
    } else {
      problems.push(`${who}: transfer(Multicall3, 1) from holder ${h.holder} did not return true (${r.ok ? "returned " + r.data : r.reason}); controls.allowlist is false`);
    }
  }

  return { problems, skipped, facts };
}
