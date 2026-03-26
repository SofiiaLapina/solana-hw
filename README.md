
# Solana Homework

This repository contains a game-oriented Solana project built with Rust and Anchor.
It includes resource collection, crafting, NFT minting, a marketplace, a Token-2022 reward token, CPI-based interactions between programs, automated tests, and Devnet deployments.

## Repository structure

```text
programs/
  crafting/
  item_nft/
  magic_token/
  marketplace/
  resource_manager/
  search/
  solana-homework/
tests/
  crafting.ts
  item-nft.ts
  magic-token.ts
  marketplace.ts
  resource-manager.ts
  search.ts
  solana-homework.ts
```

## Implemented programs

### `resource_manager`
Manages game resource mints and mints Token-2022 resources to players.

Responsibilities:
- initialize game configuration
- store resource mint addresses
- initialize Token-2022 mints for resources
- mint resources to player token accounts

Devnet Program ID:
`2aAasvKWcVi9myKRQRrVW1FkesSj89DK2RoENpuyHiWZ`

### `item_nft`
Mints real NFTs for crafted items and stores on-chain item records.

Responsibilities:
- initialize item config
- mint item NFTs with Metaplex metadata and master edition
- burn item NFTs when used by marketplace flow
- keep item history through item records

Devnet Program ID:
`B6wni9FcfnqRUBtAL2NS4ha1B7AhN5MVADBC8qTrec2U`

### `magic_token`
Implements a Token-2022 reward token used in the marketplace flow.

Responsibilities:
- initialize token config
- initialize Token-2022 mint
- mint reward tokens through authorized marketplace CPI only

Devnet Program ID:
`EdDnUqbfP5o4qMRzqkcS2BefdKPS45nn4R47ns2toEuq`

### `marketplace`
Handles NFT listings, escrow, reward minting, and NFT burn flow through CPI.

Responsibilities:
- initialize marketplace config
- move seller NFT into escrow
- cancel listings and return NFT from escrow
- buy listed NFT
- mint MagicToken to seller through CPI
- burn escrowed NFT through CPI

Devnet Program ID:
`2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy`

### `search`
Implements the search mechanic with cooldown and resource rewards.

Responsibilities:
- initialize player state for search
- update last search timestamp
- grant random resource rewards

Devnet Program ID:
`93hD3pVPe1Ws9GwBW2RViqxr9Kyhv1AFR8xLEGyXRmVK`

### `crafting`
Implements standalone crafting logic.

Responsibilities:
- initialize player state
- craft Kozack Saber
- craft Elder Staff

Devnet Program ID:
`5Jn9dMW1F3sfGEiz6qBrYvkAv9AvVG4UrFGaLMt6rn6L`

### `solana-homework`
Main integrated program that demonstrates CPI-based gameplay flow.

Responsibilities:
- initialize player state
- perform search actions
- craft items from local counters
- mint real Token-2022 resources through CPI
- craft item NFTs through CPI

Devnet Program ID:
`DzYDbDJDqfeapgikiNZJrmT1RcChTHKLaA3XBZYhxprJ`

## Devnet deployment summary

Verified deployed programs:

- `item_nft`: `B6wni9FcfnqRUBtAL2NS4ha1B7AhN5MVADBC8qTrec2U`
- `magic_token`: `EdDnUqbfP5o4qMRzqkcS2BefdKPS45nn4R47ns2toEuq`
- `marketplace`: `2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy`
- `search`: `93hD3pVPe1Ws9GwBW2RViqxr9Kyhv1AFR8xLEGyXRmVK`
- `crafting`: `5Jn9dMW1F3sfGEiz6qBrYvkAv9AvVG4UrFGaLMt6rn6L`
- `resource_manager`: `2aAasvKWcVi9myKRQRrVW1FkesSj89DK2RoENpuyHiWZ`
- `solana_homework`: `DzYDbDJDqfeapgikiNZJrmT1RcChTHKLaA3XBZYhxprJ`

`Anchor.toml` includes both `localnet` and `devnet` program sections with these IDs.

## Requirements

Recommended environment:
- Rust
- Solana CLI
- Anchor
- Node.js and npm

Example tool versions used in this project:
- Anchor `0.32.1`
- `@coral-xyz/anchor` `^0.32.1`
- `@solana/spl-token` `^0.4.14`

## Installation

```bash
npm install
```

## Build

Build all programs:

```bash
anchor build
```

Build a specific program:

```bash
anchor build --program-name resource_manager
anchor build --program-name search
anchor build --program-name solana_homework
```

## Test coverage

Run the full test suite:

```bash
anchor test
```

The project contains tests for:
- crafting
- item NFT minting
- MagicToken authorization
- marketplace listing, cancel, buy flow
- resource manager Token-2022 minting
- search cooldown logic
- integrated CPI flows in `solana-homework`

Final local result:

```text
34 passing
```

## Devnet deploy

Check current balance:

```bash
solana balance --url devnet
```

Deploy programs one by one:

```bash
solana program deploy --url devnet --program-id target/deploy/resource_manager-keypair.json target/deploy/resource_manager.so
solana program deploy --url devnet --program-id target/deploy/search-keypair.json target/deploy/search.so
solana program deploy --url devnet --program-id target/deploy/solana_homework-keypair.json target/deploy/solana_homework.so
solana program deploy --url devnet --program-id target/deploy/item_nft-keypair.json target/deploy/item_nft.so
solana program deploy --url devnet --program-id target/deploy/magic_token-keypair.json target/deploy/magic_token.so
solana program deploy --url devnet --program-id target/deploy/marketplace-keypair.json target/deploy/marketplace.so
solana program deploy --url devnet --program-id target/deploy/crafting-keypair.json target/deploy/crafting.so
```

Verify deployed programs:

```bash
solana program show 2aAasvKWcVi9myKRQRrVW1FkesSj89DK2RoENpuyHiWZ --url devnet
solana program show 93hD3pVPe1Ws9GwBW2RViqxr9Kyhv1AFR8xLEGyXRmVK --url devnet
solana program show DzYDbDJDqfeapgikiNZJrmT1RcChTHKLaA3XBZYhxprJ --url devnet
solana program show B6wni9FcfnqRUBtAL2NS4ha1B7AhN5MVADBC8qTrec2U --url devnet
solana program show EdDnUqbfP5o4qMRzqkcS2BefdKPS45nn4R47ns2toEuq --url devnet
solana program show 2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy --url devnet
solana program show 5Jn9dMW1F3sfGEiz6qBrYvkAv9AvVG4UrFGaLMt6rn6L --url devnet
```

## Example interaction flow

### 1. Run tests

```bash
anchor test
```

### 2. Search and mint real resources through CPI

Covered in:
- `tests/search.ts`
- `tests/resource-manager.ts`
- `tests/solana-homework.ts`

Relevant flows:
- search updates cooldown timestamp
- search rewards resources
- CPI mint creates Token-2022 resource balances for player accounts

### 3. Craft items from resources

Covered in:
- `tests/crafting.ts`
- `tests/solana-homework.ts`

Crafted items:
- Kozack Saber
- Elder Staff

### 4. Mint real NFTs for crafted items

Covered in:
- `tests/item-nft.ts`
- `tests/solana-homework.ts`

Flow includes:
- NFT mint creation
- associated token account creation
- Metaplex metadata creation
- master edition creation

### 5. Use marketplace flow

Covered in:
- `tests/marketplace.ts`

Flow includes:
- create listing
- move NFT to escrow
- cancel listing
- buy listing
- mint MagicToken reward to seller through CPI
- burn NFT from escrow through CPI

## Notes

- Resource tokens use Token-2022.
- Item NFTs use SPL Token plus Metaplex metadata.
- Marketplace uses CPI into both `magic_token` and `item_nft`.
- Search and integrated gameplay use CPI into `resource_manager`.
- The repository contains both standalone program tests and integrated end-to-end tests.
