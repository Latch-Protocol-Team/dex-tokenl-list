# Token logo sources

Every file under `logos/` was downloaded AS-IS from the token issuer's own website,
its own asset CDN, or its official GitHub organisation, and each one has a row
here. Nothing was drawn, traced, recoloured or reconstructed by hand, and nothing
came from a logo aggregator (CoinGecko, CoinMarketCap, TrustWallet assets,
cryptologos.cc, Brandfetch, a block explorer's copy, etc.). This is the same rule
as `apps/web/public/chains/SOURCES.md` in the Latch monorepo: a mark is the
owner's to publish, and a copy of a copy has no provenance.

The generator (`packages/tokenlists/scripts/build.mjs`) writes a token's
`logoURI` ONLY when a file exists at `logos/<chainId>/<address>.png` (or `.svg`)
AND this ledger has a row for it; the checker (`scripts/check.mjs`, run in CI)
fails a file without a row and a row without a file. A token with no sourced
logo has no `logoURI`, and the UI draws a monogram from its symbol. That is the
honest state, not a gap to fill from a search engine.

Rows are `| \`<path relative to logos/>\` | <token> | <source URL> | <notes> |`.
The first cell must be the backticked path: the scripts parse it.

## Shared (native assets)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |
| `shared/eth.svg` | ETH, the native asset of Robinhood Chain (4663) and Ethereum Sepolia (11155111) | https://ethereum.org/images/assets/svgs/eth-diamond-purple.svg | Official ETH diamond from the ethereum.org brand assets page (https://ethereum.org/en/assets/), the same file as `apps/web/public/chains/ethereum.svg` in the monorepo. Multi-tone purple variant. Used for the zero-address native entry on every chain whose gas token is ETH. |

## Robinhood Chain (4663)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

No ERC-20 on this chain has a logo yet: neither WETH (no canonical issuer mark),
USDG (Paxos publishes brand assets behind a request form), nor Robinhood's stock
tokens (Robinhood publishes no per-token mark; an equity ticker's logo belongs to
the listed company, which publishes no kit for this use) could be sourced under
the rule above.

## BNB Smart Chain (56)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

No bStock has a logo: Binance publishes no per-token mark, and the underlying
equities' marks are their companies', not Binance's to republish for this use.

## Base (8453)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

Same as above for Dinari dShares and Coinbase B20 tokens.

## Ethereum Sepolia (11155111)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

The Latch test tokens (ltUSD, ltETH) have no logo on purpose: a mark on a
throwaway token makes it read as an asset.
