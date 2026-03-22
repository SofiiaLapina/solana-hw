import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaHomework } from "../target/types/solana_homework";
import { ResourceManager } from "../target/types/resource_manager";

describe("solana-homework", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solanaHomework as Program<SolanaHomework>;
  const resourceManagerProgram =
    anchor.workspace.resourceManager as Program<ResourceManager>;
  const user = provider.wallet.publicKey;

  const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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

  it("crafts kozack saber and consumes resources", async () => {
    await program.methods
      .grantDemoSaberRecipe()
      .accountsPartial({
        player: playerPda,
        owner: user,
      })
      .rpc();

    const beforeCraft = await program.account.player.fetch(playerPda);

    expect(beforeCraft.resources.wood.toNumber()).to.eq(1);
    expect(beforeCraft.resources.iron.toNumber()).to.eq(3);
    expect(beforeCraft.resources.leather.toNumber()).to.eq(1);
    expect(beforeCraft.craftedSabers.toNumber()).to.eq(0);

    await program.methods
      .craftKozackSaber()
      .accountsPartial({
        player: playerPda,
        owner: user,
      })
      .rpc();

    const afterCraft = await program.account.player.fetch(playerPda);

    expect(afterCraft.resources.wood.toNumber()).to.eq(0);
    expect(afterCraft.resources.iron.toNumber()).to.eq(0);
    expect(afterCraft.resources.leather.toNumber()).to.eq(0);
    expect(afterCraft.craftedSabers.toNumber()).to.eq(1);
  });

  it("does not craft kozack saber without enough resources", async () => {
    const secondUser = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      secondUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

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

    let failed = false;

    try {
      await program.methods
        .craftKozackSaber()
        .accountsPartial({
          player: secondPlayerPda,
          owner: secondUser.publicKey,
        })
        .signers([secondUser])
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include("Not enough resources for Kozack saber");
    }

    expect(failed).to.eq(true);
  });

  it("crafts elder staff and consumes resources", async () => {
    await program.methods
      .grantDemoStaffRecipe()
      .accountsPartial({
        player: playerPda,
        owner: user,
      })
      .rpc();

    const beforeCraft = await program.account.player.fetch(playerPda);

    expect(beforeCraft.resources.wood.toNumber()).to.eq(2);
    expect(beforeCraft.resources.gold.toNumber()).to.eq(1);
    expect(beforeCraft.resources.diamond.toNumber()).to.eq(1);
    expect(beforeCraft.craftedStaffs.toNumber()).to.eq(0);

    await program.methods
      .craftElderStaff()
      .accountsPartial({
        player: playerPda,
        owner: user,
      })
      .rpc();

    const afterCraft = await program.account.player.fetch(playerPda);

    expect(afterCraft.resources.wood.toNumber()).to.eq(0);
    expect(afterCraft.resources.gold.toNumber()).to.eq(0);
    expect(afterCraft.resources.diamond.toNumber()).to.eq(0);
    expect(afterCraft.craftedStaffs.toNumber()).to.eq(1);
  });

  it("does not craft elder staff without enough resources", async () => {
    const thirdUser = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      thirdUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

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

    let failed = false;

    try {
      await program.methods
        .craftElderStaff()
        .accountsPartial({
          player: thirdPlayerPda,
          owner: thirdUser.publicKey,
        })
        .signers([thirdUser])
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include("Not enough resources for Elder staff");
    }

    expect(failed).to.eq(true);
  });

  it("search with cpi placeholder updates timestamp and mints 1 wood", async () => {
    const cpiUser = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    await resourceManagerProgram.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

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

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    await resourceManagerProgram.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

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

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    await resourceManagerProgram.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ iron: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: ironMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ironMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ gold: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: goldMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([goldMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ leather: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: leatherMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([leatherMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ stone: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: stoneMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stoneMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ diamond: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: diamondMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([diamondMint])
      .rpc();

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

    const woodAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      woodMint.publicKey
    );
    const ironAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      ironMint.publicKey
    );
    const goldAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      goldMint.publicKey
    );
    const leatherAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      leatherMint.publicKey
    );
    const stoneAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      stoneMint.publicKey
    );
    const diamondAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      diamondMint.publicKey
    );

    await program.methods
      .searchResourcesWithCpiFullDemo()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
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

    const getTokenAmountOrZero = async (ata: anchor.web3.PublicKey) => {
      const info = await provider.connection.getAccountInfo(ata);
      if (!info) return 0;
      const balance = await provider.connection.getTokenAccountBalance(ata);
      return Number(balance.value.amount);
    };

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

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    await resourceManagerProgram.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ iron: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: ironMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ironMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ leather: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: leatherMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([leatherMint])
      .rpc();

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

    const woodAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      woodMint.publicKey
    );
    const ironAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      ironMint.publicKey
    );
    const leatherAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      leatherMint.publicKey
    );

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ wood: {} }, new anchor.BN(1))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: woodMint.publicKey,
        playerTokenAccount: woodAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ iron: {} }, new anchor.BN(3))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: ironMint.publicKey,
        playerTokenAccount: ironAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ leather: {} }, new anchor.BN(1))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: leatherMint.publicKey,
        playerTokenAccount: leatherAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedSabers.toNumber()).to.eq(0);

    await program.methods
      .craftKozackSaberWithTokensDemo()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        ironMint: ironMint.publicKey,
        leatherMint: leatherMint.publicKey,
        woodTokenAccount: woodAta,
        ironTokenAccount: ironAta,
        leatherTokenAccount: leatherAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([cpiUser])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedSabers.toNumber()).to.eq(1);

    const woodBalance = await provider.connection.getTokenAccountBalance(
      woodAta
    );
    const ironBalance = await provider.connection.getTokenAccountBalance(
      ironAta
    );
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

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

    await resourceManagerProgram.methods
      .initialize()
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    await resourceManagerProgram.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ gold: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: goldMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([goldMint])
      .rpc();

    await resourceManagerProgram.methods
      .initializeResourceMint({ diamond: {} })
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        mint: diamondMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([diamondMint])
      .rpc();

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

    const woodAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      woodMint.publicKey
    );
    const goldAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      goldMint.publicKey
    );
    const diamondAta = getAssociatedTokenAddress(
      cpiUser.publicKey,
      diamondMint.publicKey
    );

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ wood: {} }, new anchor.BN(2))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: woodMint.publicKey,
        playerTokenAccount: woodAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ gold: {} }, new anchor.BN(1))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: goldMint.publicKey,
        playerTokenAccount: goldAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await resourceManagerProgram.methods
      .mintResourceToPlayer({ diamond: {} }, new anchor.BN(1))
      .accountsPartial({
        gameConfig: resourceGameConfigPda,
        authority: user,
        mintAuthority: mintAuthorityPda,
        player: cpiUser.publicKey,
        mint: diamondMint.publicKey,
        playerTokenAccount: diamondAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const beforeCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(beforeCraft.craftedStaffs.toNumber()).to.eq(0);

    await program.methods
      .craftElderStaffWithTokensDemo()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        woodMint: woodMint.publicKey,
        goldMint: goldMint.publicKey,
        diamondMint: diamondMint.publicKey,
        woodTokenAccount: woodAta,
        goldTokenAccount: goldAta,
        diamondTokenAccount: diamondAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([cpiUser])
      .rpc();

    const afterCraft = await program.account.player.fetch(cpiPlayerPda);
    expect(afterCraft.craftedStaffs.toNumber()).to.eq(1);

    const woodBalance = await provider.connection.getTokenAccountBalance(
      woodAta
    );
    const goldBalance = await provider.connection.getTokenAccountBalance(
      goldAta
    );
    const diamondBalance = await provider.connection.getTokenAccountBalance(
      diamondAta
    );

    expect(woodBalance.value.amount).to.eq("0");
    expect(goldBalance.value.amount).to.eq("0");
    expect(diamondBalance.value.amount).to.eq("0");
  });
});