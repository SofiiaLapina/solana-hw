import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SolanaHomework } from "../target/types/solana_homework";

describe("solana-homework", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solanaHomework as Program<SolanaHomework>;
  const user = provider.wallet.publicKey;

  const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("player"), user.toBuffer()],
    program.programId
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

  it("search with cpi placeholder updates timestamp and gives 3 resources", async () => {
    const cpiUser = anchor.web3.Keypair.generate();

    const signature = await provider.connection.requestAirdrop(
      cpiUser.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(signature);

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

    await program.methods
      .searchResourcesWithCpiPlaceholder()
      .accountsPartial({
        player: cpiPlayerPda,
        owner: cpiUser.publicKey,
        resourceManagerProgram: anchor.web3.Keypair.generate().publicKey,
        resourceGameConfig: anchor.web3.Keypair.generate().publicKey,
      })
      .signers([cpiUser])
      .rpc();

    const playerAccount = await program.account.player.fetch(cpiPlayerPda);

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
});