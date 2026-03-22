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

  it("initializes game config", async () => {
    await program.methods
      .initialize()
      .accountsPartial({
        gameConfig: gameConfigPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const gameConfig = await program.account.gameConfig.fetch(gameConfigPda);

    expect(gameConfig.authority.toBase58()).to.eq(authority.toBase58());
    expect(gameConfig.bump).to.be.a("number");

    expect(gameConfig.woodMint.toBase58()).to.eq(defaultPubkey);
    expect(gameConfig.ironMint.toBase58()).to.eq(defaultPubkey);
    expect(gameConfig.goldMint.toBase58()).to.eq(defaultPubkey);
    expect(gameConfig.leatherMint.toBase58()).to.eq(defaultPubkey);
    expect(gameConfig.stoneMint.toBase58()).to.eq(defaultPubkey);
    expect(gameConfig.diamondMint.toBase58()).to.eq(defaultPubkey);
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
});