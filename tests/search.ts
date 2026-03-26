import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Search } from "../target/types/search";

describe("search", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.search as Program<Search>;
  const user = anchor.web3.Keypair.generate();

  const [playerPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("player"), user.publicKey.toBuffer()],
    program.programId
  );

  async function airdrop(pubkey: anchor.web3.PublicKey) {
    const sig = await provider.connection.requestAirdrop(pubkey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);
  }

  it("initializes player", async () => {
    await airdrop(user.publicKey);

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
    expect(player.lastSearchTimestamp.toNumber()).to.eq(0);
    expect(player.craftedSabers.toNumber()).to.eq(0);
    expect(player.craftedStaffs.toNumber()).to.eq(0);
    expect(player.bump).to.be.a("number");
  });

  it("search updates timestamp and gives 3 resources", async () => {
    await program.methods
      .searchResources()
      .accountsPartial({
        player: playerPda,
        owner: user.publicKey,
      })
      .signers([user])
      .rpc();

    const player = await program.account.player.fetch(playerPda);

    const total =
      player.resources.wood.toNumber() +
      player.resources.iron.toNumber() +
      player.resources.gold.toNumber() +
      player.resources.leather.toNumber() +
      player.resources.stone.toNumber() +
      player.resources.diamond.toNumber();

    expect(player.lastSearchTimestamp.toNumber()).to.be.greaterThan(0);
    expect(total).to.eq(3);
  });

  it("blocks second search during cooldown", async () => {
    let failed = false;

    try {
      await program.methods
        .searchResources()
        .accountsPartial({
          player: playerPda,
          owner: user.publicKey,
        })
        .signers([user])
        .rpc();
    } catch (error: any) {
      failed = true;
      expect(String(error)).to.include("Search cooldown is still active");
    }

    expect(failed).to.eq(true);
  });
});
