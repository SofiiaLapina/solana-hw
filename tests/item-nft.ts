import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ItemNft } from "../target/types/item_nft";

describe("item-nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.itemNft as Program<ItemNft>;
  const authority = provider.wallet.publicKey;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const [itemConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item_config")],
    program.programId
  );

  function findMetadataPda(mint: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];
  }

  function findMasterEditionPda(mint: anchor.web3.PublicKey) {
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

  async function getNextItemNumber() {
    try {
      const cfg = await program.account.itemConfig.fetch(itemConfigPda);
      return cfg.itemsMinted.toNumber() + 1;
    } catch {
      return 1;
    }
  }

  it("initializes item config", async () => {
    await program.methods
      .initializeItemConfig(
        "Ukrainian Artifacts",
        "https://example.com/items/"
      )
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    const itemConfig = await program.account.itemConfig.fetch(itemConfigPda);

    expect(itemConfig.authority.toBase58()).to.eq(authority.toBase58());
    expect(itemConfig.collectionName).to.eq("Ukrainian Artifacts");
    expect(itemConfig.baseUri.replace(/\/$/, "")).to.eq("https://example.com/items");
    expect(itemConfig.itemsMinted.toNumber()).to.be.greaterThanOrEqual(0);
    expect(itemConfig.bump).to.be.a("number");
  });

  it("mints real NFT for kozack saber", async () => {
    const owner = anchor.web3.Keypair.generate();
    const itemMint = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      owner.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(airdropSignature);

    const itemNumber = await getNextItemNumber();
    const itemNumberLe = new anchor.BN(itemNumber).toArrayLike(
      Buffer,
      "le",
      8
    );

    const [itemRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("item_record"), owner.publicKey.toBuffer(), itemNumberLe],
      program.programId
    );

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      itemMint.publicKey,
      owner.publicKey,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const metadataPda = findMetadataPda(itemMint.publicKey);
    const masterEditionPda = findMasterEditionPda(itemMint.publicKey);

    await program.methods
      .mintItemRecord(
        { kozackSaber: {} },
        `Kozack Saber #${itemNumber}`,
        `https://example.com/items/kozack-saber-${itemNumber}.json`
      )
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority,
        owner: owner.publicKey,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([itemMint])
      .rpc();

    const itemRecord = await program.account.itemRecord.fetch(itemRecordPda);
    const itemConfig = await program.account.itemConfig.fetch(itemConfigPda);
    const tokenBalance = await provider.connection.getTokenAccountBalance(
      ownerTokenAccount
    );
    const metadataInfo = await provider.connection.getAccountInfo(metadataPda);
    const masterEditionInfo =
      await provider.connection.getAccountInfo(masterEditionPda);

    expect(itemRecord.owner.toBase58()).to.eq(owner.publicKey.toBase58());
    expect(itemRecord.name).to.eq(`Kozack Saber #${itemNumber}`);
    expect(itemRecord.uri).to.eq(
      `https://example.com/items/kozack-saber-${itemNumber}.json`
    );
    expect(itemRecord.itemNumber.toNumber()).to.eq(itemNumber);
    expect(itemRecord.itemKind.kozackSaber).to.not.eq(undefined);

    expect(itemRecord.mint.toBase58()).to.eq(itemMint.publicKey.toBase58());
    expect(itemRecord.metadata.toBase58()).to.eq(metadataPda.toBase58());
    expect(itemRecord.masterEdition.toBase58()).to.eq(
      masterEditionPda.toBase58()
    );

    expect(tokenBalance.value.amount).to.eq("1");
    expect(metadataInfo).to.not.eq(null);
    expect(masterEditionInfo).to.not.eq(null);

    expect(itemConfig.itemsMinted.toNumber()).to.eq(itemNumber);
  });

  it("mints real NFT for elder staff and increments counter", async () => {
    const owner = anchor.web3.Keypair.generate();
    const itemMint = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      owner.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(airdropSignature);

    const itemNumber = await getNextItemNumber();
    const itemNumberLe = new anchor.BN(itemNumber).toArrayLike(
      Buffer,
      "le",
      8
    );

    const [itemRecordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("item_record"), owner.publicKey.toBuffer(), itemNumberLe],
      program.programId
    );

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      itemMint.publicKey,
      owner.publicKey,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const metadataPda = findMetadataPda(itemMint.publicKey);
    const masterEditionPda = findMasterEditionPda(itemMint.publicKey);

    await program.methods
      .mintItemRecord(
        { elderStaff: {} },
        `Elder Staff #${itemNumber}`,
        `https://example.com/items/elder-staff-${itemNumber}.json`
      )
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority,
        owner: owner.publicKey,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount,
        metadata: metadataPda,
        masterEdition: masterEditionPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([itemMint])
      .rpc();

    const itemRecord = await program.account.itemRecord.fetch(itemRecordPda);
    const itemConfig = await program.account.itemConfig.fetch(itemConfigPda);
    const tokenBalance = await provider.connection.getTokenAccountBalance(
      ownerTokenAccount
    );
    const metadataInfo = await provider.connection.getAccountInfo(metadataPda);
    const masterEditionInfo =
      await provider.connection.getAccountInfo(masterEditionPda);

    expect(itemRecord.owner.toBase58()).to.eq(owner.publicKey.toBase58());
    expect(itemRecord.name).to.eq(`Elder Staff #${itemNumber}`);
    expect(itemRecord.uri).to.eq(
      `https://example.com/items/elder-staff-${itemNumber}.json`
    );
    expect(itemRecord.itemNumber.toNumber()).to.eq(itemNumber);
    expect(itemRecord.itemKind.elderStaff).to.not.eq(undefined);

    expect(itemRecord.mint.toBase58()).to.eq(itemMint.publicKey.toBase58());
    expect(itemRecord.metadata.toBase58()).to.eq(metadataPda.toBase58());
    expect(itemRecord.masterEdition.toBase58()).to.eq(
      masterEditionPda.toBase58()
    );

    expect(tokenBalance.value.amount).to.eq("1");
    expect(metadataInfo).to.not.eq(null);
    expect(masterEditionInfo).to.not.eq(null);

    expect(itemConfig.itemsMinted.toNumber()).to.eq(itemNumber);
  });
});
