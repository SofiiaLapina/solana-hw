import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { ResourceManager } from "../target/types/resource_manager";

describe("resource-manager", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.resourceManager as Program<ResourceManager>;
  const authority = provider.wallet.publicKey;
  const defaultPubkey = anchor.web3.PublicKey.default.toBase58();

  const [gameConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("game_config")],
    program.programId
  );

  const [mintAuthorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );

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

  it("initializes game config", async () => {
    await program.methods
      .initialize()
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);

    expect(gameConfig.authority.toBase58()).to.eq(authority.toBase58());
    expect(gameConfig.bump).to.be.a("number");
    expect(gameConfig.mintAuthorityBump).to.be.a("number");

    expect(gameConfig.woodMint).to.not.eq(undefined);
    expect(gameConfig.ironMint).to.not.eq(undefined);
    expect(gameConfig.goldMint).to.not.eq(undefined);
    expect(gameConfig.leatherMint).to.not.eq(undefined);
    expect(gameConfig.stoneMint).to.not.eq(undefined);
    expect(gameConfig.diamondMint).to.not.eq(undefined);
  });

  it("sets resource mints", async () => {
    const woodMint = anchor.web3.Keypair.generate().publicKey;
    const ironMint = anchor.web3.Keypair.generate().publicKey;
    const goldMint = anchor.web3.Keypair.generate().publicKey;
    const leatherMint = anchor.web3.Keypair.generate().publicKey;
    const stoneMint = anchor.web3.Keypair.generate().publicKey;
    const diamondMint = anchor.web3.Keypair.generate().publicKey;

    await program.methods
      .setResourceMints({
        woodMint,
        ironMint,
        goldMint,
        leatherMint,
        stoneMint,
        diamondMint,
      })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
      })
      .rpc();

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);

    expect(gameConfig.woodMint.toBase58()).to.eq(woodMint.toBase58());
    expect(gameConfig.ironMint.toBase58()).to.eq(ironMint.toBase58());
    expect(gameConfig.goldMint.toBase58()).to.eq(goldMint.toBase58());
    expect(gameConfig.leatherMint.toBase58()).to.eq(leatherMint.toBase58());
    expect(gameConfig.stoneMint.toBase58()).to.eq(stoneMint.toBase58());
    expect(gameConfig.diamondMint.toBase58()).to.eq(diamondMint.toBase58());
  });

  it("initializes wood mint with token-2022", async () => {
    const woodMint = anchor.web3.Keypair.generate();

    await program.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);

    expect(gameConfig.woodMint.toBase58()).to.eq(woodMint.publicKey.toBase58());

    const mintAccountInfo = await provider.connection.getAccountInfo(
      woodMint.publicKey
    );

    expect(mintAccountInfo).to.not.eq(null);
    expect(mintAccountInfo!.owner.toBase58()).to.eq(
      TOKEN_2022_PROGRAM_ID.toBase58()
    );
  });

  it("initializes remaining resource mints with token-2022", async () => {
    const ironMint = anchor.web3.Keypair.generate();
    const goldMint = anchor.web3.Keypair.generate();
    const leatherMint = anchor.web3.Keypair.generate();
    const stoneMint = anchor.web3.Keypair.generate();
    const diamondMint = anchor.web3.Keypair.generate();

    await program.methods
      .initializeResourceMint({ iron: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: ironMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([ironMint])
      .rpc();

    await program.methods
      .initializeResourceMint({ gold: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: goldMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([goldMint])
      .rpc();

    await program.methods
      .initializeResourceMint({ leather: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: leatherMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([leatherMint])
      .rpc();

    await program.methods
      .initializeResourceMint({ stone: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: stoneMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stoneMint])
      .rpc();

    await program.methods
      .initializeResourceMint({ diamond: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: diamondMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([diamondMint])
      .rpc();

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);

    expect(gameConfig.ironMint.toBase58()).to.eq(ironMint.publicKey.toBase58());
    expect(gameConfig.goldMint.toBase58()).to.eq(goldMint.publicKey.toBase58());
    expect(gameConfig.leatherMint.toBase58()).to.eq(
      leatherMint.publicKey.toBase58()
    );
    expect(gameConfig.stoneMint.toBase58()).to.eq(
      stoneMint.publicKey.toBase58()
    );
    expect(gameConfig.diamondMint.toBase58()).to.eq(
      diamondMint.publicKey.toBase58()
    );
  });

  it("mints wood resource to player token account", async () => {
    const player = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      player.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(airdropSignature);

    await program.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    const playerWoodAta = getAssociatedTokenAddress(
      player.publicKey,
      woodMint.publicKey
    );

    await program.methods
      .mintResourceToPlayer({ wood: {} }, new anchor.BN(3))
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        player: player.publicKey,
        mint: woodMint.publicKey,
        playerTokenAccount: playerWoodAta,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);
    expect(gameConfig.woodMint.toBase58()).to.eq(woodMint.publicKey.toBase58());

    const tokenBalance = await provider.connection.getTokenAccountBalance(
      playerWoodAta
    );
    expect(tokenBalance.value.amount).to.eq("3");

    const tokenAccountInfo = await provider.connection.getAccountInfo(
      playerWoodAta
    );
    expect(tokenAccountInfo).to.not.eq(null);
    expect(tokenAccountInfo!.owner.toBase58()).to.eq(
      TOKEN_2022_PROGRAM_ID.toBase58()
    );
  });

  it("does not mint resource when mint does not match resource kind", async () => {
    const player = anchor.web3.Keypair.generate();
    const woodMint = anchor.web3.Keypair.generate();
    const wrongMint = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      player.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(airdropSignature);

    await program.methods
      .initializeResourceMint({ wood: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: woodMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([woodMint])
      .rpc();

    await program.methods
      .initializeResourceMint({ iron: {} })
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        mintAuthority: mintAuthorityPda,
        mint: wrongMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wrongMint])
      .rpc();

    const playerWrongAta = getAssociatedTokenAddress(
      player.publicKey,
      wrongMint.publicKey
    );

    let failed = false;

    try {
      await program.methods
        .mintResourceToPlayer({ wood: {} }, new anchor.BN(1))
        .accountsPartial({
          gameConfig: gameConfigPda,
          authority: authority,
          mintAuthority: mintAuthorityPda,
          player: player.publicKey,
          mint: wrongMint.publicKey,
          playerTokenAccount: playerWrongAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include("Invalid mint for selected resource");
    }

    expect(failed).to.eq(true);
  });
});