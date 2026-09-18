# Latch token lists

Token lists for the Latch Protocol DEX and launchpad, one file per chain, in the
[Uniswap Token Lists](https://github.com/Uniswap/token-lists) standard
(`https://uniswap.org/tokenlist.schema.json`). MIT licensed.

**These files are generated.** They are built in the Latch monorepo
(`packages/tokenlists`) from the SDK's address book and its verified stock
registry, checked against the chain, and copied here by `scripts/sync.mjs`.
Nothing in a list is hand-typed, and a pull request that edits a list JSON
directly will be regenerated over. Send the change to the source tables instead
(see "Adding a token").

## The lists

| Chain | Chain id | Tokens | Version | URL |
| --- | --- | --- | --- | --- |
| Ethereum Sepolia | 11155111 | 4 | 1.0.0 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/11155111.tokenlist.json` |
| Robinhood Chain | 4663 | 11 | 1.1.0 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/4663.tokenlist.json` |
| BNB Smart Chain | 56 | 73 | 1.0.1 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/56.tokenlist.json` |
| Base | 8453 | 23 | 1.0.1 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/8453.tokenlist.json` |

Load one by URL in any wallet or interface that accepts a token list, or through
`@latchprotocol/sdk`:

```ts
import { fetchTokenList, latchTokenListUrl } from "@latchprotocol/sdk";

const { list } = await fetchTokenList(latchTokenListUrl(4663));
```

`latchTokenListUrl(chainId)` returns the URL above for that chain; the base is
`LATCH_TOKENLIST_DEFAULT_BASE` and an app can pass its own.

## What is in a list

- **The native asset** (address `0x0000…0000`, tag `native`) on every chain where
  Latch is deployed, and the ERC-20s the Latch address book has transacted with.
- **Tokenised stocks** (tag `stock`), with
  `extensions.stock = { issuer, ticker, rebasing, controls, verifiedAt }`. Every
  entry was read from the chain on `verifiedAt`: name, symbol, decimals, the
  issuer's control surface (`controls`: pause, blocklist, allowlist, issuerBurn,
  upgradeable, uiMultiplier, rebasing), and a simulated transfer from a real
  holder into an arbitrary contract. A stock tagged `rebasing` has a `balanceOf`
  the issuer rescales and is **not usable as a pool currency** in the Latch
  Vault; it is listed so a UI can label it, not so a pool can be opened in it.
  These lists are the runtime source of truth for which tokens are stocks: see
  "Adding a stock".
- **Test tokens** (tag `test`) on testnets only. A mainnet list never carries a
  demo token.

Names are the token's on-chain `name()`, trimmed of surrounding whitespace and
cut to the schema's 60-character cap where longer. Symbols and decimals are the
on-chain values exactly. `extensions.latch.verifiedOnChain` at the root of a list
is `true` when the build re-read every token on chain and `false` when it was
built offline.

## Logos

A token has a `logoURI` **only** when a file exists under
`logos/<chainId>/<address>.png` (or `.svg`) with a row in `logos/SOURCES.md`
recording where it came from. The rule for that ledger is the same as for the
chain marks on the Latch site: the asset must come from the token issuer's own
website, its own asset CDN or its official GitHub organisation, downloaded as-is.
No aggregator copies (CoinGecko, CoinMarketCap, TrustWallet assets, block
explorers), no redrawn or recoloured marks. An equity ticker's logo belongs to the
listed company, which publishes no kit for this use, so tokenised stocks have no
logo here; interfaces draw a monogram from the symbol.

CI fails a logo file with no ledger row, a ledger row with no file, and a
`logoURI` that points anywhere else.

## Adding a stock (no deploy, no release)

**These lists are the runtime source of truth for "this token is a stock."**
The Latch SDK, the dapp and every hosted launchpad and DEX site read the
chain's list at runtime (`resolveStockTokens` in `@latchprotocol/sdk`) and
merge it over the SDK's built-in registry, so a stock added here is offered as
a quote currency everywhere as soon as the list is published. Nothing is
deployed and no package is released.

A pull request that adds a stock needs exactly this, in `<chainId>.tokenlist.json`:

```json
{
  "chainId": 4663,
  "address": "0x…",
  "decimals": 18,
  "name": "…",
  "symbol": "…",
  "tags": ["stock"],
  "extensions": {
    "stock": {
      "issuer": "Robinhood",
      "ticker": "COST",
      "rebasing": false,
      "controls": {
        "pause": true, "blocklist": true, "allowlist": false, "issuerBurn": true,
        "upgradeable": true, "uiMultiplier": true, "rebasing": false
      },
      "verifiedAt": "2026-09-18"
    }
  }
}
```

- `address` EIP-55 checksummed; `decimals`, `symbol`, `name` exactly as the
  contract answers (name trimmed, cut to 60 characters).
- `tags`: `stock`, plus `rebasing` when `balanceOf` itself is rescaled by the issuer.
- `extensions.stock.issuer`: the issuer as it names itself; `ticker`: the
  exchange ticker of the underlying; `rebasing` as above.
- `controls`: the issuer's powers. `true` = the power exists or could not be
  ruled out; `false` = **proven** absent (verified source or an on-chain read).
  When in doubt, `true`.
- `verifiedAt`: the UTC day you made the reads.
- In the PR description: **a link to the issuer's own documentation of the
  token** (its contract page, product docs or published registry).
- The version bump is `minor`. **No logo** unless the issuer publishes one for
  this use, with a `logos/SOURCES.md` row linking it; an equity ticker's mark
  belongs to the listed company and stays typographic.

CI does the rest, and a `stock` entry that fails any of it fails the PR:

| Check | What passes |
| --- | --- |
| shape | `extensions.stock` has issuer, ticker, rebasing, the seven `controls` booleans (an optional `verifiedAt`); the tags agree with it |
| decimals / symbol / name | re-read on chain, must match |
| rebasing | none of `balancePerShare`, `sharesOf`, `convertToAssets`, `convertToShares`, `getCurrentMultiplier`, `asset` answers on the token, or the entry says `rebasing: true`; an issuer documented as rebasing (Dinari, Backed) must say `rebasing: true` |
| pause | every pause view that answers (`tokenPaused`, `paused`, `pauseManager().isTokenPaused`, `pausedFeatures`) reads not paused; one answering means `controls.pause` is `true` |
| blocklist | every block/sanction view that answers, on the token or the registry it names, does not block Multicall3 (or the Latch Vault on 4663); one answering means `controls.blocklist` is `true` |
| transfer | `transfer(Multicall3, 1)` simulated from a real holder (found through recent `Transfer` logs) returns `true`, unless `controls.allowlist` is declared. No holder found is **skipped with a message, never a pass** |

`false` in `controls` is a claim of proof and a read that contradicts it fails
the list; `true` is never contradicted by an absence. A rebasing stock is
listed so a UI can label it: the SDK never offers one as a pool currency, and
it keeps `rebasing: true` even if a later list says otherwise.

## Adding any other token

1. Add it to the source table in the Latch monorepo — `packages/sdk/src/deployments/index.ts`
   (`tokens`, with `decimals` read off the contract) or, for a tokenised stock
   the SDK should also carry offline, `packages/sdk/src/deployments/stocks.ts`
   (every field an on-chain read, per that file's header).
2. Optionally add its logo under `logos/<chainId>/<checksummed address>.png` and
   a row in `logos/SOURCES.md` **linking the issuer's own published asset**. A
   logo PR without that link is closed.
3. Regenerate (`npm run build` in `packages/tokenlists`) and sync. CI on this
   repository re-reads `decimals()`, `symbol()` and `name()` for every token on
   chain and refuses a list that drifts, so a wrong decimals value cannot land.

Regenerating from the monorepo keeps every entry the source tables know. A
stock added here by PR that the SDK does not carry survives a regeneration only
once it is also added to `stocks.ts`; until then the generator's output would
drop it, so the maintainer adds it to the SDK table before the next sync. The
list stays the runtime source of truth either way.

## Versioning

Each list carries a semver `version` and moves per the standard:

| Change | Bump |
| --- | --- |
| a token removed, or its address changed | major |
| a token added | minor |
| anything else (name, symbol, decimals, logo, tags, extensions) | patch |

An unchanged token set keeps its version and timestamp, so a rebuild with no
change is byte-identical. CI checks that the bump in a PR is at least what the
diff against `main` requires.

## Checking locally

```
npm install
npm test            # schema (ajv, official schema), chain ids, logos ledger, version bump vs main, stock entry shape
npm run check:chain # the above plus decimals/symbol/name re-read on chain and the stock checks (rebasing faces, pause, blocklist, holder transfer)
npm run check:stocks
                    # only the stock checks on chain, for a faster loop on a stock PR
```

`rpc-endpoints.json` lists the public RPC endpoints the chain check uses, copied
from the SDK's probed table. Set `LATCH_RPC_<chainId>` to put your own first.

## Licence

MIT. See `LICENSE`. The logos under `logos/` remain the marks of their owners
and are redistributed here as published by them, per the ledger.
