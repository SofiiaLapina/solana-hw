import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaHomework } from "../target/types/solana_homework";
import { ResourceManager } from "../target/types/resource_manager";
import { ItemNft } from "../target/types/item_nft";

describe("solana-homework", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const highComputeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 400000,
  });

  const program = anchor.workspace.solanaHomework as Program<SolanaHomework>;
  const resourceManagerProgram =
    anchor.workspace.resourceManager as Program<ResourceManager>;
  const itemNftProgram = anchor.workspace.itemNft as Program<ItemNft>;
  const marketplaceProgram = anchor.workspace.marketplace as Program<any>;
  const user = provider.wallet.publicKey;

  const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  );

  const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const ASSOCIATED_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  function getAssociatedTokenAddress(
    owner: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }


  function getNftAssociatedTokenAddress(
    owner: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  function getMetadataPda(mint: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  }

  function getMasterEditionPda(mint: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  }

  const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("player"), user.toBuffer()],
    program.programId
  );

  const [resourceGameConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("game_config")],
    resourceManagerProgram.programId
  );

  const [mintAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    resourceManagerProgram.programId
  );

  const [itemConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item_config")],
    itemNftProgram.programId
  );

  const [marketplacePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace")],
    marketplaceProgram.programId
  );

  async function getNextItemRecordPda(owner: anchor.web3.PublicKey) {
    const itemConfig = await itemNftProgram.account.itemConfig.fetch(itemConfigPda);
    const nextItemNumber = itemConfig.itemsMinted.toNumber() + 1;

    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_record"),
        owner.toBuffer(),
        new anchor.BN(nextItemNumber).toArrayLike(Buffer, "le", 8),
      ],
      itemNftProgram.programId
    )[0];
  }


  async function airdrop(pubkey: anchor.web3.PublicKey) {
    const signature = await provider.connection.requestAirdrop(
      pubkey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);
  }

  async function ensureResourceManagerInitialized() {
    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});
  }

  async function ensureItemConfigInitialized() {
    await itemNftProgram.methods
      .initializeItemConfig(
        "Ukrainian Artifacts",
        "https://example.com/items",
        marketplacePda
      )
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});
  }

  async function initializeResourceMint(
    kind: any,
    mint: anchor.web3.Keypair
  ) {
    await resourceManagerProgram.methods
      .initializeResourceMint(kind)
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: mint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([mint])
      .rpc();
  }

  async function mintResourceToPlayer(
    kind: any,
    amount: number,
    player: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    playerTokenAccount: anchor.web3.PublicKey
  ) {
    await resourceManagerProgram.methods
      .mintResourceToPlayer(kind, new anchor.BN(amount))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player,
        mint,
        playerTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async function getNextItemRecordInfo(owner: anchor.web3.PublicKey) {
    const itemConfig = await itemNftProgram.account.itemConfig.fetch(itemConfigPda);
    const nextItemNumber = itemConfig.itemsMinted.toNumber() + 1;
    const itemNumberLe = new anchor.BN(nextItemNumber).toArrayLike(
      Buffer,
      "le",
      8
    );

    const [itemRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("item_record"), owner.toBuffer(), itemNumberLe],
      itemNftProgram.programId
    );

    return { itemConfig, nextItemNumber, itemRecordPda };
  }

  async function getTokenAmountOrZero(ata: anchor.web3.PublicKey) {
    const info = await provider.connection.getAccountInfo(ata);
    if (!info) return 0;
    const balance = await provider.connection.getTokenAccountBalance(ata);
    return Number(balance.value.amount);
  }

  it("initializes player with empty resources", async () => {
    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: playerPda,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const playerAccount = await program.account.player.fetch(playerPda);

    expect(playerAccount.owner.toBase58()).to.eq(user.toBase58());
    expect(playerAccount.lastSearchTimestamp.toNumber()).to.eq(0);

    expect(playerAccount.resources.wood.toNumber()).to.eq(0);
    expect(playerAccount.resources.iron.toNumber()).to.eq(0);
    expect(playerAccount.resources.gold.toNumber()).to.eq(0);
    expect(playerAccount.resources.leather.toNumber()).to.eq(0);
    expect(playerAccount.resources.stone.toNumber()).to.eq(0);
    expect(playerAccount.resources.diamond.toNumber()).to.eq(0);
  });

  it("search updates timestamp and gives 3 resources", async () => {
    await program.methods
      .searchResources()
      .accountsPartial({
        player: playerPda,
        owner: user,
      })
      .rpc();

    const playerAccount = await program.account.player.fetch(playerPda);

    expect(playerAccount.lastSearchTimestamp.toNumber()).to.be.greaterThan(0);

    const totalResources =
      playerAccount.resources.wood.toNumber() +
      playerAccount.resources.iron.toNumber() +
      playerAccount.resources.gold.toNumber() +
      playerAccount.resources.leather.toNumber() +
      playerAccount.resources.stone.toNumber() +
      playerAccount.resources.diamond.toNumber();

    expect(totalResources).to.eq(3);
  });

  it("blocks second search during cooldown", async () => {
    let failed = false;

    try {
      await program.methods
        .searchResources()
        .accountsPartial({
          player: playerPda,
          owner: user,
        })
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include("Search cooldown is still active");
    }

    expect(failed).to.eq(true);
  });

  it("crafts kozack saber and consumes real tokens", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const ironMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ iron: {} }, ironMint);
    await initializeResourceMint({ leather: {} }, leatherMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(cpiUser.publicKey, woodMint.publicKey);
    const ironAta = getAssociatedTokenAddress(cpiUser.publicKey, ironMint.publicKey);
    const leatherAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      leatherMint.publicKey
    );

    await mintResourceToPlayer({ wood: {} }, 1, cpiUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ iron: {} }, 3, cpiUser.publicKey, ironMint.publicKey, ironAta);
    await mintResourceToPlayer(
      { leather: {} },
      1,
      cpiUser.publicKey,
      leatherMint.publicKey,
      leatherAta
    );

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedSabers.toNumber()).to.eq(0);

    const { itemConfig, nextItemNumber, itemRecordPda } =
      await getNextItemRecordInfo(cpiUser.publicKey);
    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      cpiUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftKozackSaber()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        ironMint: ironMint.publicKey,
        leatherMint: leatherMint.publicKey,
        woodTokenAccount: woodAta,
        ironTokenAccount: ironAta,
        leatherTokenAccount: leatherAta,
        itemNftAuthority: user,
        itemNftProgram: itemNftProgram.programId,
        itemConfig: itemConfigPda,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([cpiUser, itemMint])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedSabers.toNumber()).to.eq(1);

    const itemRecord = await itemNftProgram.account.itemRecord.fetch(itemRecordPda);
    expect(itemRecord.owner.toBase58()).to.eq(cpiUser.publicKey.toBase58());
    expect(itemRecord.itemNumber.toNumber()).to.eq(nextItemNumber);
    expect(itemRecord.itemKind.kozackSaber).to.not.eq(undefined);
    expect(itemRecord.name).to.eq(`Kozack Saber #${nextItemNumber}`);
    expect(itemRecord.uri).to.eq(
      `${itemConfig.baseUri}/kozack-saber-${nextItemNumber}.json`
    );

    const woodBalance = await provider.connection.getTokenAccountBalance(woodAta);
    const ironBalance = await provider.connection.getTokenAccountBalance(ironAta);
    const leatherBalance = await provider.connection.getTokenAccountBalance(
      leatherAta
    );

    expect(woodBalance.value.amount).to.eq("0");
    expect(ironBalance.value.amount).to.eq("0");
    expect(leatherBalance.value.amount).to.eq("0");
  });

  it("does not craft kozack saber without enough token resources", async () => {
    const secondUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const ironMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();

    await airdrop(secondUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ iron: {} }, ironMint);
    await initializeResourceMint({ leather: {} }, leatherMint);

    const [secondPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), secondUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: secondPlayerPda,
        user: secondUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([secondUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(secondUser.publicKey, woodMint.publicKey);
    const ironAta = getAssociatedTokenAddress(secondUser.publicKey, ironMint.publicKey);
    const leatherAta = getAssociatedTokenAddress(
      secondUser.publicKey,
      leatherMint.publicKey
    );

    await mintResourceToPlayer({ wood: {} }, 1, secondUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ iron: {} }, 2, secondUser.publicKey, ironMint.publicKey, ironAta);
    await mintResourceToPlayer(
      { leather: {} },
      1,
      secondUser.publicKey,
      leatherMint.publicKey,
      leatherAta
    );

    const { itemRecordPda } = await getNextItemRecordInfo(secondUser.publicKey);

    let failed = false;

    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      secondUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    try {
      await program.methods
        .craftKozackSaber()
      .preInstructions([highComputeIx])
        .accountsPartial({
          player: secondPlayerPda,
          owner: secondUser.publicKey,
          woodMint: woodMint.publicKey,
          ironMint: ironMint.publicKey,
          leatherMint: leatherMint.publicKey,
          woodTokenAccount: woodAta,
          ironTokenAccount: ironAta,
          leatherTokenAccount: leatherAta,
          itemNftAuthority: user,
          itemNftProgram: itemNftProgram.programId,
          itemConfig: itemConfigPda,
          itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([secondUser, itemMint])
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include(
        "Not enough token resources for Kozack saber"
      );
    }

    expect(failed).to.eq(true);
  });

  it("crafts elder staff and consumes real tokens", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ gold: {} }, goldMint);
    await initializeResourceMint({ diamond: {} }, diamondMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(cpiUser.publicKey, woodMint.publicKey);
    const goldAta = getAssociatedTokenAddress(cpiUser.publicKey, goldMint.publicKey);
    const diamondAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      diamondMint.publicKey
    );

    await mintResourceToPlayer({ wood: {} }, 2, cpiUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ gold: {} }, 1, cpiUser.publicKey, goldMint.publicKey, goldAta);
    await mintResourceToPlayer(
      { diamond: {} },
      1,
      cpiUser.publicKey,
      diamondMint.publicKey,
      diamondAta
    );

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedStaffs.toNumber()).to.eq(0);

    const { itemConfig, nextItemNumber, itemRecordPda } =
      await getNextItemRecordInfo(cpiUser.publicKey);
    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      cpiUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftElderStaff()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        goldMint: goldMint.publicKey,
        diamondMint: diamondMint.publicKey,
        woodTokenAccount: woodAta,
        goldTokenAccount: goldAta,
        diamondTokenAccount: diamondAta,
        itemNftAuthority: user,
        itemNftProgram: itemNftProgram.programId,
        itemConfig: itemConfigPda,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([cpiUser, itemMint])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedStaffs.toNumber()).to.eq(1);

    const itemRecord = await itemNftProgram.account.itemRecord.fetch(itemRecordPda);
    expect(itemRecord.owner.toBase58()).to.eq(cpiUser.publicKey.toBase58());
    expect(itemRecord.itemNumber.toNumber()).to.eq(nextItemNumber);
    expect(itemRecord.itemKind.elderStaff).to.not.eq(undefined);
    expect(itemRecord.name).to.eq(`Elder Staff #${nextItemNumber}`);
    expect(itemRecord.uri).to.eq(
      `${itemConfig.baseUri}/elder-staff-${nextItemNumber}.json`
    );

    const woodBalance = await provider.connection.getTokenAccountBalance(woodAta);
    const goldBalance = await provider.connection.getTokenAccountBalance(goldAta);
    const diamondBalance = await provider.connection.getTokenAccountBalance(
      diamondAta
    );

    expect(woodBalance.value.amount).to.eq("0");
    expect(goldBalance.value.amount).to.eq("0");
    expect(diamondBalance.value.amount).to.eq("0");
  });

  it("does not craft elder staff without enough token resources", async () => {
    const thirdUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await airdrop(thirdUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ gold: {} }, goldMint);
    await initializeResourceMint({ diamond: {} }, diamondMint);

    const [thirdPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), thirdUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: thirdPlayerPda,
        user: thirdUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([thirdUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(thirdUser.publicKey, woodMint.publicKey);
    const goldAta = getAssociatedTokenAddress(thirdUser.publicKey, goldMint.publicKey);
    const diamondAta = getAssociatedTokenAddress(
      thirdUser.publicKey,
      diamondMint.publicKey
    );

    await mintResourceToPlayer(
      { diamond: {} },
      0,
      thirdUser.publicKey,
      diamondMint.publicKey,
      diamondAta
    );
    await mintResourceToPlayer({ wood: {} }, 1, thirdUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ gold: {} }, 1, thirdUser.publicKey, goldMint.publicKey, goldAta);

    const { itemRecordPda } = await getNextItemRecordInfo(thirdUser.publicKey);

    let failed = false;

    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      thirdUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    try {
      await program.methods
        .craftElderStaff()
      .preInstructions([highComputeIx])
        .accountsPartial({
          player: thirdPlayerPda,
          owner: thirdUser.publicKey,
          woodMint: woodMint.publicKey,
          goldMint: goldMint.publicKey,
          diamondMint: diamondMint.publicKey,
          woodTokenAccount: woodAta,
          goldTokenAccount: goldAta,
          diamondTokenAccount: diamondAta,
          itemNftAuthority: user,
          itemNftProgram: itemNftProgram.programId,
          itemConfig: itemConfigPda,
          itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([thirdUser, itemMint])
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include(
        "Not enough token resources for Elder staff"
      );
    }

    expect(failed).to.eq(true);
  });

  it("search with cpi placeholder updates timestamp and mints 1 wood", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const playerWoodAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      woodMint.publicKey
    );

    await program.methods
      .searchResourcesWithCpiPlaceholder()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        searchAuthority: user,
        resourceAuthority: user,
        resourceManagerProgram: resourceManagerProgram.programId,
        resourceGameConfig: resourceGameConfigPda,
        mintAuthority: mintAuthorityPda,
        resourceMint: woodMint.publicKey,
        playerTokenAccount: playerWoodAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const playerAccount = await program.account.player.fetch(cpiPlayerPda);

    expect(playerAccount.lastSearchTimestamp.toNumber()).to.be.greaterThan(0);
    expect(playerAccount.resources.wood.toNumber()).to.eq(1);

    const totalResources =
      playerAccount.resources.wood.toNumber() +
      playerAccount.resources.iron.toNumber() +
      playerAccount.resources.gold.toNumber() +
      playerAccount.resources.leather.toNumber() +
      playerAccount.resources.stone.toNumber() +
      playerAccount.resources.diamond.toNumber();

    expect(totalResources).to.eq(1);

    const tokenBalance = await provider.connection.getTokenAccountBalance(
      playerWoodAta
    );
    expect(tokenBalance.value.amount).to.eq("1");
  });

  it("mints one wood via real cpi demo", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const playerWoodAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      woodMint.publicKey
    );

    await program.methods
      .mintWoodViaCpiDemo()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        searchAuthority: user,
        resourceAuthority: user,
        resourceManagerProgram: resourceManagerProgram.programId,
        resourceGameConfig: resourceGameConfigPda,
        mintAuthority: mintAuthorityPda,
        resourceMint: woodMint.publicKey,
        playerTokenAccount: playerWoodAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const tokenBalance = await provider.connection.getTokenAccountBalance(
      playerWoodAta
    );
    expect(tokenBalance.value.amount).to.eq("1");
  });

  it("search with full cpi demo mints 3 real resources", async () => {
    const cpiUser = anchor.web3.Keypair.generate();

    const woodMint = anchor.web3.Keypair.generate();
    const ironMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();
    const stoneMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ iron: {} }, ironMint);
    await initializeResourceMint({ gold: {} }, goldMint);
    await initializeResourceMint({ leather: {} }, leatherMint);
    await initializeResourceMint({ stone: {} }, stoneMint);
    await initializeResourceMint({ diamond: {} }, diamondMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(cpiUser.publicKey, woodMint.publicKey);
    const ironAta = getAssociatedTokenAddress(cpiUser.publicKey, ironMint.publicKey);
    const goldAta = getAssociatedTokenAddress(cpiUser.publicKey, goldMint.publicKey);
    const leatherAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      leatherMint.publicKey
    );
    const stoneAta = getAssociatedTokenAddress(cpiUser.publicKey, stoneMint.publicKey);
    const diamondAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      diamondMint.publicKey
    );

    await program.methods
      .searchResourcesWithCpiFullDemo()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        searchAuthority: user,
        resourceAuthority: user,
        resourceManagerProgram: resourceManagerProgram.programId,
        resourceGameConfig: resourceGameConfigPda,
        mintAuthority: mintAuthorityPda,

        woodMint: woodMint.publicKey,
        ironMint: ironMint.publicKey,
        goldMint: goldMint.publicKey,
        leatherMint: leatherMint.publicKey,
        stoneMint: stoneMint.publicKey,
        diamondMint: diamondMint.publicKey,

        woodTokenAccount: woodAta,
        ironTokenAccount: ironAta,
        goldTokenAccount: goldAta,
        leatherTokenAccount: leatherAta,
        stoneTokenAccount: stoneAta,
        diamondTokenAccount: diamondAta,

        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const playerAccount = await program.account.player.fetch(cpiPlayerPda);

    const woodAmount = await getTokenAmountOrZero(woodAta);
    const ironAmount = await getTokenAmountOrZero(ironAta);
    const goldAmount = await getTokenAmountOrZero(goldAta);
    const leatherAmount = await getTokenAmountOrZero(leatherAta);
    const stoneAmount = await getTokenAmountOrZero(stoneAta);
    const diamondAmount = await getTokenAmountOrZero(diamondAta);

    expect(playerAccount.lastSearchTimestamp.toNumber()).to.be.greaterThan(0);

    expect(playerAccount.resources.wood.toNumber()).to.eq(woodAmount);
    expect(playerAccount.resources.iron.toNumber()).to.eq(ironAmount);
    expect(playerAccount.resources.gold.toNumber()).to.eq(goldAmount);
    expect(playerAccount.resources.leather.toNumber()).to.eq(leatherAmount);
    expect(playerAccount.resources.stone.toNumber()).to.eq(stoneAmount);
    expect(playerAccount.resources.diamond.toNumber()).to.eq(diamondAmount);

    const localTotal =
      playerAccount.resources.wood.toNumber() +
      playerAccount.resources.iron.toNumber() +
      playerAccount.resources.gold.toNumber() +
      playerAccount.resources.leather.toNumber() +
      playerAccount.resources.stone.toNumber() +
      playerAccount.resources.diamond.toNumber();

    const tokenTotal =
      woodAmount +
      ironAmount +
      goldAmount +
      leatherAmount +
      stoneAmount +
      diamondAmount;

    expect(localTotal).to.eq(3);
    expect(tokenTotal).to.eq(3);
  });

  it("crafts kozack saber with real tokens", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const ironMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ iron: {} }, ironMint);
    await initializeResourceMint({ leather: {} }, leatherMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(cpiUser.publicKey, woodMint.publicKey);
    const ironAta = getAssociatedTokenAddress(cpiUser.publicKey, ironMint.publicKey);
    const leatherAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      leatherMint.publicKey
    );

    await mintResourceToPlayer({ wood: {} }, 1, cpiUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ iron: {} }, 3, cpiUser.publicKey, ironMint.publicKey, ironAta);
    await mintResourceToPlayer(
      { leather: {} },
      1,
      cpiUser.publicKey,
      leatherMint.publicKey,
      leatherAta
    );

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedSabers.toNumber()).to.eq(0);

    const { itemConfig, nextItemNumber, itemRecordPda } =
      await getNextItemRecordInfo(cpiUser.publicKey);
    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      cpiUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftKozackSaberWithTokensDemo()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        ironMint: ironMint.publicKey,
        leatherMint: leatherMint.publicKey,
        woodTokenAccount: woodAta,
        ironTokenAccount: ironAta,
        leatherTokenAccount: leatherAta,
        itemNftAuthority: user,
        itemNftProgram: itemNftProgram.programId,
        itemConfig: itemConfigPda,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([cpiUser, itemMint])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedSabers.toNumber()).to.eq(1);

    const itemRecord = await itemNftProgram.account.itemRecord.fetch(itemRecordPda);
    expect(itemRecord.owner.toBase58()).to.eq(cpiUser.publicKey.toBase58());
    expect(itemRecord.itemNumber.toNumber()).to.eq(nextItemNumber);
    expect(itemRecord.itemKind.kozackSaber).to.not.eq(undefined);
    expect(itemRecord.name).to.eq(`Kozack Saber #${nextItemNumber}`);
    expect(itemRecord.uri).to.eq(
      `${itemConfig.baseUri}/kozack-saber-${nextItemNumber}.json`
    );

    const woodBalance = await provider.connection.getTokenAccountBalance(woodAta);
    const ironBalance = await provider.connection.getTokenAccountBalance(ironAta);
    const leatherBalance = await provider.connection.getTokenAccountBalance(
      leatherAta
    );

    expect(woodBalance.value.amount).to.eq("0");
    expect(ironBalance.value.amount).to.eq("0");
    expect(leatherBalance.value.amount).to.eq("0");
  });

  it("crafts elder staff with real tokens", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await airdrop(cpiUser.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ gold: {} }, goldMint);
    await initializeResourceMint({ diamond: {} }, diamondMint);

    const [cpiPlayerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), cpiUser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: cpiPlayerPda,
        user: cpiUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([cpiUser])
      .rpc();

    const woodAta = getAssociatedTokenAddress(cpiUser.publicKey, woodMint.publicKey);
    const goldAta = getAssociatedTokenAddress(cpiUser.publicKey, goldMint.publicKey);
    const diamondAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      diamondMint.publicKey
    );

    await mintResourceToPlayer({ wood: {} }, 2, cpiUser.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ gold: {} }, 1, cpiUser.publicKey, goldMint.publicKey, goldAta);
    await mintResourceToPlayer(
      { diamond: {} },
      1,
      cpiUser.publicKey,
      diamondMint.publicKey,
      diamondAta
    );

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedStaffs.toNumber()).to.eq(0);

    const { itemConfig, nextItemNumber, itemRecordPda } =
      await getNextItemRecordInfo(cpiUser.publicKey);
    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAssociatedTokenAddress(
      cpiUser.publicKey,
      itemMint.publicKey
    );
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftElderStaffWithTokensDemo()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        goldMint: goldMint.publicKey,
        diamondMint: diamondMint.publicKey,
        woodTokenAccount: woodAta,
        goldTokenAccount: goldAta,
        diamondTokenAccount: diamondAta,
        itemNftAuthority: user,
        itemNftProgram: itemNftProgram.programId,
        itemConfig: itemConfigPda,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata,
        masterEdition,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([cpiUser, itemMint])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedStaffs.toNumber()).to.eq(1);

    const itemRecord = await itemNftProgram.account.itemRecord.fetch(itemRecordPda);
    expect(itemRecord.owner.toBase58()).to.eq(cpiUser.publicKey.toBase58());
    expect(itemRecord.itemNumber.toNumber()).to.eq(nextItemNumber);
    expect(itemRecord.itemKind.elderStaff).to.not.eq(undefined);
    expect(itemRecord.name).to.eq(`Elder Staff #${nextItemNumber}`);
    expect(itemRecord.uri).to.eq(
      `${itemConfig.baseUri}/elder-staff-${nextItemNumber}.json`
    );

    const woodBalance = await provider.connection.getTokenAccountBalance(woodAta);
    const goldBalance = await provider.connection.getTokenAccountBalance(goldAta);
    const diamondBalance = await provider.connection.getTokenAccountBalance(
      diamondAta
    );

    expect(woodBalance.value.amount).to.eq("0");
    expect(goldBalance.value.amount).to.eq("0");
    expect(diamondBalance.value.amount).to.eq("0");
  });
});
