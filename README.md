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
| Robinhood Chain | 4663 | 5 | 1.0.0 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/4663.tokenlist.json` |
| BNB Smart Chain | 56 | 73 | 1.0.0 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/56.tokenlist.json` |
| Base | 8453 | 23 | 1.0.0 | `https://raw.githubusercontent.com/Latch-Protocol-Team/dex-tokenl-list/main/8453.tokenlist.json` |

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
- **Tokenised stocks** (tag `stock`) from the SDK's verified registry, with
  `extensions.stock = { issuer, ticker, rebasing }`. Every record in that registry
  was read from the chain on the day it was added: name, symbol, decimals, proxy
  and implementation, the issuer's control surface, and a simulated transfer from
  a real holder. A stock tagged `rebasing` has a `balanceOf` the issuer rescales
  and is **not usable as a pool currency** in the Latch Vault; it is listed so a
  UI can label it, not so a pool can be opened in it.
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

## Adding a token

1. Add it to the source table in the Latch monorepo — `packages/sdk/src/deployments/index.ts`
   (`tokens`, with `decimals` read off the contract) or, for a tokenised stock,
   `packages/sdk/src/deployments/stocks.ts` (every field an on-chain read, per
   that file's header).
2. Optionally add its logo under `logos/<chainId>/<checksummed address>.png` and
   a row in `logos/SOURCES.md` **linking the issuer's own published asset**. A
   logo PR without that link is closed.
3. Regenerate (`npm run build` in `packages/tokenlists`) and sync. CI on this
   repository re-reads `decimals()`, `symbol()` and `name()` for every token on
   chain and refuses a list that drifts, so a wrong decimals value cannot land.

Third parties may open a PR here with the logo and ledger row alone; the list
entry itself must come through the source tables.

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
npm test            # schema (ajv, official schema), chain ids, logos ledger, version bump vs main
npm run check:chain # the above plus decimals/symbol/name re-read on chain
```

`rpc-endpoints.json` lists the public RPC endpoints the chain check uses, copied
from the SDK's probed table. Set `LATCH_RPC_<chainId>` to put your own first.

## Licence

MIT. See `LICENSE`. The logos under `logos/` remain the marks of their owners
and are redistributed here as published by them, per the ledger.
