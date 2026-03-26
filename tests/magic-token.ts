import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { MagicToken } from "../target/types/magic_token";

describe("magic-token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.magicToken as Program<MagicToken>;
  const authority = provider.wallet.publicKey;
  const payer = (provider.wallet as any).payer;

  const [magicTokenConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("magic_token_config")],
    program.programId
  );

  const [marketplacePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace")],
    new anchor.web3.PublicKey("2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy")
  );

  const defaultPubkey = anchor.web3.PublicKey.default.toBase58();

  it("initializes magic token config", async () => {
    await program.methods
      .initializeMagicTokenConfig("Magic Token", "MAG", 9)
      .accountsPartial({
        magicTokenConfig: magicTokenConfigPda,
        authority,
        marketplaceAuthority: marketplacePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    const config = await program.account.magicTokenConfig.fetch(
      magicTokenConfigPda
    );

    expect(config.authority.toBase58()).to.eq(authority.toBase58());
    expect(config.marketplaceAuthority.toBase58()).to.eq(
      marketplacePda.toBase58()
    );
    expect(config.name).to.eq("Magic Token");
    expect(config.symbol).to.eq("MAG");
    expect(config.decimals).to.eq(9);
    expect(config.mint.toBase58()).to.eq(defaultPubkey);
    expect(config.bump).to.be.a("number");
  });

  it("initializes magic mint with token-2022", async () => {
    const magicMint = anchor.web3.Keypair.generate();

    await program.methods
      .initializeMagicMint()
      .accountsPartial({
        magicTokenConfig: magicTokenConfigPda,
        authority,
        magicMint: magicMint.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([magicMint])
      .rpc();

    const config = await program.account.magicTokenConfig.fetch(
      magicTokenConfigPda
    );

    expect(config.mint.toBase58()).to.eq(magicMint.publicKey.toBase58());

    const mintAccountInfo = await provider.connection.getAccountInfo(
      magicMint.publicKey
    );

    expect(mintAccountInfo).to.not.eq(null);
    expect(mintAccountInfo!.owner.toBase58()).to.eq(
      TOKEN_2022_PROGRAM_ID.toBase58()
    );
  });

  it("does not allow direct mint without marketplace PDA signer", async () => {
    const config = await program.account.magicTokenConfig.fetch(
      magicTokenConfigPda
    );

    const player = anchor.web3.Keypair.generate();

    const playerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      config.mint,
      player.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let failed = false;

    try {
      await program.methods
        .mintMagicToPlayer(new anchor.BN(50))
        .accountsPartial({
          magicTokenConfig: magicTokenConfigPda,
          marketplaceAuthority: marketplacePda,
          payer: authority,
          player: player.publicKey,
          magicMint: config.mint,
          playerTokenAccount: playerAta.address,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
    } catch (_error: any) {
      failed = true;
    }

    expect(failed).to.eq(true);
  });
});
