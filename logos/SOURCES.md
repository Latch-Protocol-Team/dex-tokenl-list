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
| `4663/0x1b0E319c6A659F002271B69dB8A7df2F911c153E.png` | GME (GameStop) | https://www.gamestop.com/on/demandware.static/Sites-gamestop-us-Site/-/default/dwde9222af/images/favicons/favicon-196x196.png | GameStop's own square `GS` mark from gamestop.com, PNG 196×196, as served (the CDN needs `Referer: https://www.gamestop.com/`). No usage terms stated on the source page. Retrieved 2026-09-20 (staging ledger `logos-staging/SOURCES.md`); wired 2026-09-27. |
| `4663/0x05b37Fb53A299a1b874A619e1c4C404D52C36F4C.png` | RDDT (Reddit) | https://www.redditstatic.com/shreddit/assets/favicon/192x192.png | reddit.com's own `rel="icon"` asset on Reddit's static CDN: the Snoo in the OrangeRed bubble, as https://redditinc.com/brand describes the mark. PNG 192×192. Reddit's full guidelines sit behind a JavaScript-only DAM and were not read. Retrieved 2026-09-20 (staging ledger `logos-staging/SOURCES.md`); wired 2026-09-27. |
| `4663/0x4EA005168D7F09a7A0Ba9D1DEf21a479950E44C2.svg` | COST (Costco) | https://www.costco.com/favicon.ico | costco.com serves this path as `image/svg+xml`: the white tile with the red `C` (#E51937), real vector geometry. No usage terms stated on the source page. Retrieved 2026-09-20 (staging ledger `logos-staging/SOURCES.md`); wired 2026-09-27. |

Robinhood publishes no per-company mark for its stock tokens (every `logoUrl` in its Stock Token API
serves the same Robinhood badge), so a mark here is the LISTED COMPANY'S own file from its own site.
Owner cleared stock logos 2026-09-20; the rows above are the ones whose source pages state no
restriction. **Held back, deliberately:** NVDA and META (NVIDIA's and Meta's brand pages require
prior written approval for any logo use — owner decision pending), AMC (its marks render black or
carry a white tagline, unreadable on one of the two themes), SPCX (spacex.com publishes only a 48 px
favicon), USO (no fund mark exists; USCF's corporate mark is not USO's). WETH and USDG: no canonical
issuer mark / Paxos assets behind a request form.

## BNB Smart Chain (56)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

No bStock has a logo: Binance publishes no per-token mark, and the underlying
equities' marks are their companies', not Binance's to republish for this use.

## Base (8453)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |
| `8453/0xb200000000000000000000C2e324d24d7eEcd1fb.png` | AAPLc (Apple Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/873819f4b14efe44b94abecbc8e8864d2998163abd0ca55b449ee6eb07d0d94c.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb200000000000000000000d9192b6B456483C2E8.png` | AMZNc (Amazon.com Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/06d3c2cac2c89e3a8bc4b2fe40ff259f104b55244321dea400e44b22f215896b.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb2000000000000000000002D0BA3164cc74f58B7.png` | GOOGLc (Alphabet Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/0e80e31df40f7c42b49a3c7f6d23c6351625d73f235aeb69006ddee9221702b0.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb2000000000000000000008bC8786B856E61707C.png` | METAc (Meta Platforms Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/1cedbfb3caee9498470945ff5041715b8c90921d904b3567a43bc4df82069e66.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xB200000000000000000000Ab99cFa739E253872B.png` | MSFTc (Microsoft Corporation), Coinbase B20 | https://metadata.coinbase.com/equity_icons/e90930ade985016f48816c6bd9fd1e8274b28507f4833881b3a16c77c2a3e2e7.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb2000000000000000000004884b426556b92883d.png` | MSTRc (Strategy Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/496024423dd795f8b547ffa0668f12a1e6bf09af247534754546a1a6661c7969.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb20000000000000000000078ee7ce2fE4908108C.png` | NVDAc (NVIDIA Corporation), Coinbase B20 | https://metadata.coinbase.com/equity_icons/1fee9b7a44e800d438dd9d96c3283e05784c925c2c871a48ff735950740b551a.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb200000000000000000000397293Cb8cda9a10c5.png` | SNDKc (Sandisk Corporation), Coinbase B20 | https://metadata.coinbase.com/equity_icons/495de6bc9902690826d533b9506494890f59d611d10f04231c00936f659bb0cb.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb2000000000000000000007b9fcbd005511aCBd5.png` | SPCXc (Space Exploration Technologies Corp.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/79fa65beabbe27c7b84a38b8f67a492793a0c203a5312c8feddc23e4b7c66b79.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |
| `8453/0xb2000000000000000000001e800a7f5189430cD0.png` | TSLAc (Tesla Inc.), Coinbase B20 | https://metadata.coinbase.com/equity_icons/a3b67028295d0e9fa3182c867b8a9afed5ebcbd8c012de3a46e160ae5e490980.png | The issuer's own on-chain metadata: `contractURI()` (ERC-7572) on the token returns JSON whose `image` is this URL. Re-read on 2026-09-27 and unchanged; Base documents this metadata as mutable, so re-read it before each list release. |

Coinbase B20 tokens carry their icon in their own on-chain metadata, which is the issuer's
sanctioned way to render a B20 token; the underlying marks remain each company's. Dinari dShares
have no logo: they implement no `contractURI()`, and Dinari's only overlapping icon (SPY) is a
typographic placeholder, not the fund's mark.

## Ethereum Sepolia (11155111)

| File | Token | Source URL | Notes |
| --- | --- | --- | --- |

The Latch test tokens (ltUSD, ltETH) have no logo on purpose: a mark on a
throwaway token makes it read as an asset.
