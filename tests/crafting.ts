import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Crafting } from "../target/types/crafting";
import { ItemNft } from "../target/types/item_nft";
import { ResourceManager } from "../target/types/resource_manager";

describe("crafting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const highComputeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 400000,
  });

  const program = anchor.workspace.crafting as Program<Crafting>;
  const itemNftProgram = anchor.workspace.itemNft as Program<ItemNft>;
  const marketplaceProgram = anchor.workspace.marketplace as Program<any>;
  const resourceManagerProgram =
    anchor.workspace.resourceManager as Program<ResourceManager>;

  const authority = provider.wallet.publicKey;

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

  function getToken2022Ata(
    owner: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  function getNftAta(
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

  async function airdrop(pubkey: anchor.web3.PublicKey) {
    const sig = await provider.connection.requestAirdrop(pubkey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);
  }

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

  async function ensureResourceManagerInitialized() {
    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority,
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
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});
  }

  async function initializeResourceMint(kind: any, mint: anchor.web3.Keypair) {
    await resourceManagerProgram.methods
      .initializeResourceMint(kind)
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority,
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
        authority,
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

  it("initializes player", async () => {
    const user = anchor.web3.Keypair.generate();
    await airdrop(user.publicKey);

    const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: playerPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const player = await program.account.player.fetch(playerPda);
    expect(player.owner.toBase58()).to.eq(user.publicKey.toBase58());
    expect(player.craftedSabers.toNumber()).to.eq(0);
    expect(player.craftedStaffs.toNumber()).to.eq(0);
  });

  it("crafts kozack saber", async () => {
    const user = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const ironMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();

    await airdrop(user.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ iron: {} }, ironMint);
    await initializeResourceMint({ leather: {} }, leatherMint);

    const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: playerPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const woodAta = getToken2022Ata(user.publicKey, woodMint.publicKey);
    const ironAta = getToken2022Ata(user.publicKey, ironMint.publicKey);
    const leatherAta = getToken2022Ata(user.publicKey, leatherMint.publicKey);

    await mintResourceToPlayer({ wood: {} }, 1, user.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ iron: {} }, 3, user.publicKey, ironMint.publicKey, ironAta);
    await mintResourceToPlayer(
      { leather: {} },
      1,
      user.publicKey,
      leatherMint.publicKey,
      leatherAta
    );

    const itemConfig = await itemNftProgram.account.itemConfig.fetch(itemConfigPda);
    const nextItemNumber = itemConfig.itemsMinted.toNumber() + 1;

    const [itemRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_record"),
        user.publicKey.toBuffer(),
        new anchor.BN(nextItemNumber).toArrayLike(Buffer, "le", 8),
      ],
      itemNftProgram.programId
    );

    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAta(user.publicKey, itemMint.publicKey);
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftKozackSaber()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: playerPda,
        owner: user.publicKey,
        woodMint: woodMint.publicKey,
        ironMint: ironMint.publicKey,
        leatherMint: leatherMint.publicKey,
        woodTokenAccount: woodAta,
        ironTokenAccount: ironAta,
        leatherTokenAccount: leatherAta,
        itemNftAuthority: authority,
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
      .signers([user, itemMint])
      .rpc();

    const player = await program.account.player.fetch(playerPda);
    expect(player.craftedSabers.toNumber()).to.eq(1);
  });

  it("crafts elder staff", async () => {
    const user = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await airdrop(user.publicKey);
    await ensureResourceManagerInitialized();
    await ensureItemConfigInitialized();

    await initializeResourceMint({ wood: {} }, woodMint);
    await initializeResourceMint({ gold: {} }, goldMint);
    await initializeResourceMint({ diamond: {} }, diamondMint);

    const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player"), user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePlayer()
      .accountsPartial({
        player: playerPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const woodAta = getToken2022Ata(user.publicKey, woodMint.publicKey);
    const goldAta = getToken2022Ata(user.publicKey, goldMint.publicKey);
    const diamondAta = getToken2022Ata(user.publicKey, diamondMint.publicKey);

    await mintResourceToPlayer({ wood: {} }, 2, user.publicKey, woodMint.publicKey, woodAta);
    await mintResourceToPlayer({ gold: {} }, 1, user.publicKey, goldMint.publicKey, goldAta);
    await mintResourceToPlayer(
      { diamond: {} },
      1,
      user.publicKey,
      diamondMint.publicKey,
      diamondAta
    );

    const itemConfig = await itemNftProgram.account.itemConfig.fetch(itemConfigPda);
    const nextItemNumber = itemConfig.itemsMinted.toNumber() + 1;

    const [itemRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_record"),
        user.publicKey.toBuffer(),
        new anchor.BN(nextItemNumber).toArrayLike(Buffer, "le", 8),
      ],
      itemNftProgram.programId
    );

    const itemMint = anchor.web3.Keypair.generate();
    const ownerTokenAccount = getNftAta(user.publicKey, itemMint.publicKey);
    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await program.methods
      .craftElderStaff()
      .preInstructions([highComputeIx])
      .accountsPartial({
        player: playerPda,
        owner: user.publicKey,
        woodMint: woodMint.publicKey,
        goldMint: goldMint.publicKey,
        diamondMint: diamondMint.publicKey,
        woodTokenAccount: woodAta,
        goldTokenAccount: goldAta,
        diamondTokenAccount: diamondAta,
        itemNftAuthority: authority,
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
      .signers([user, itemMint])
      .rpc();

    const player = await program.account.player.fetch(playerPda);
    expect(player.craftedStaffs.toNumber()).to.eq(1);
  });
});
