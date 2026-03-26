import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Marketplace } from "../target/types/marketplace";
import { ItemNft } from "../target/types/item_nft";
import { MagicToken } from "../target/types/magic_token";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.marketplace as Program<Marketplace>;
  const itemNftProgram = anchor.workspace.itemNft as Program<ItemNft>;
  const magicTokenProgram = anchor.workspace.magicToken as Program<MagicToken>;

  const authority = provider.wallet.publicKey;
  const payer = (provider.wallet as any).payer;

  const [marketplacePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace")],
    program.programId
  );

  const [itemConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("item_config")],
    itemNftProgram.programId
  );

  const [magicTokenConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("magic_token_config")],
    magicTokenProgram.programId
  );

  const defaultPubkey = anchor.web3.PublicKey.default.toBase58();

  async function airdrop(pubkey: anchor.web3.PublicKey) {
    const sig = await provider.connection.requestAirdrop(pubkey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);
  }

  function getMetadataPda(mint: anchor.web3.PublicKey) {
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

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
    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

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

  async function ensureMarketplaceInitialized() {
    await program.methods
      .initializeMarketplace(250)
      .accountsPartial({
        marketplace: marketplacePda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});
  }

  async function ensureItemConfigInitialized() {
    await itemNftProgram.methods
      .initializeItemConfig("Ukrainian Artifacts", "https://example.com/items/", marketplacePda)
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});
  }

  async function ensureMagicTokenReady() {
    await magicTokenProgram.methods
      .initializeMagicTokenConfig("Magic Token", "MAG", 9)
      .accountsPartial({
        magicTokenConfig: magicTokenConfigPda,
        authority,
        marketplaceAuthority: marketplacePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
      .catch(() => {});

    let config = await magicTokenProgram.account.magicTokenConfig.fetch(
      magicTokenConfigPda
    );

    if (config.mint.toBase58() === defaultPubkey) {
      const magicMint = anchor.web3.Keypair.generate();

      await magicTokenProgram.methods
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

      config = await magicTokenProgram.account.magicTokenConfig.fetch(
        magicTokenConfigPda
      );
    }

    return config;
  }

  async function mintTestNftToSeller(seller: anchor.web3.PublicKey) {
    await ensureItemConfigInitialized();

    const itemConfig = await itemNftProgram.account.itemConfig.fetch(
      itemConfigPda
    );
    const nextItemNumber = itemConfig.itemsMinted.toNumber() + 1;

    const itemMint = anchor.web3.Keypair.generate();
    const itemRecordPda = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("item_record"),
        seller.toBuffer(),
        new anchor.BN(nextItemNumber).toArrayLike(Buffer, "le", 8),
      ],
      itemNftProgram.programId
    )[0];

    const sellerItemTokenAccount = getAssociatedTokenAddressSync(
      itemMint.publicKey,
      seller,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const metadata = getMetadataPda(itemMint.publicKey);
    const masterEdition = getMasterEditionPda(itemMint.publicKey);

    await itemNftProgram.methods
      .mintItemRecord(
        { kozackSaber: {} },
        `Kozack Saber #${nextItemNumber}`,
        `https://example.com/items/kozack-saber-${nextItemNumber}.json`
      )
      .accountsPartial({
        itemConfig: itemConfigPda,
        authority,
        owner: seller,
        itemRecord: itemRecordPda,
        itemMint: itemMint.publicKey,
        ownerTokenAccount: sellerItemTokenAccount,
        metadata,
        masterEdition,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: new anchor.web3.PublicKey(
          "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        ),
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([itemMint])
      .rpc();

    return {
      itemMint: itemMint.publicKey,
      itemRecordPda,
      sellerItemTokenAccount,
      metadata,
      masterEdition,
    };
  }

  it("initializes marketplace", async () => {
    await ensureMarketplaceInitialized();

    const marketplaceAccount = await program.account.marketplace.fetch(
      marketplacePda
    );

    expect(marketplaceAccount.authority.toBase58()).to.eq(
      authority.toBase58()
    );
    expect(marketplaceAccount.feeBps).to.eq(250);
    expect(marketplaceAccount.bump).to.be.a("number");
  });

  it("creates listing and moves NFT to escrow", async () => {
    const seller = anchor.web3.Keypair.generate();
    await airdrop(seller.publicKey);
    await ensureMarketplaceInitialized();

    const nft = await mintTestNftToSeller(seller.publicKey);

    const escrowItemTokenAccount = getAssociatedTokenAddressSync(
      nft.itemMint,
      marketplacePda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [listingPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        nft.itemMint.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createListing(new anchor.BN(500))
      .accountsPartial({
        marketplace: marketplacePda,
        seller: seller.publicKey,
        itemMint: nft.itemMint,
        sellerItemTokenAccount: nft.sellerItemTokenAccount,
        escrowItemTokenAccount,
        listing: listingPda,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const listing = await program.account.listing.fetch(listingPda);
    expect(listing.marketplace.toBase58()).to.eq(marketplacePda.toBase58());
    expect(listing.seller.toBase58()).to.eq(seller.publicKey.toBase58());
    expect(listing.itemMint.toBase58()).to.eq(nft.itemMint.toBase58());
    expect(listing.price.toNumber()).to.eq(500);
    expect(listing.active).to.eq(true);

    const sellerAtaBalance = await provider.connection.getTokenAccountBalance(
      nft.sellerItemTokenAccount
    );
    const escrowAtaBalance = await provider.connection.getTokenAccountBalance(
      escrowItemTokenAccount
    );

    expect(sellerAtaBalance.value.amount).to.eq("0");
    expect(escrowAtaBalance.value.amount).to.eq("1");
  });

  it("cancels listing and returns NFT from escrow", async () => {
    const seller = anchor.web3.Keypair.generate();
    await airdrop(seller.publicKey);
    await ensureMarketplaceInitialized();

    const nft = await mintTestNftToSeller(seller.publicKey);

    const escrowItemTokenAccount = getAssociatedTokenAddressSync(
      nft.itemMint,
      marketplacePda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [listingPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        nft.itemMint.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createListing(new anchor.BN(777))
      .accountsPartial({
        marketplace: marketplacePda,
        seller: seller.publicKey,
        itemMint: nft.itemMint,
        sellerItemTokenAccount: nft.sellerItemTokenAccount,
        escrowItemTokenAccount,
        listing: listingPda,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    await program.methods
      .cancelListing()
      .accountsPartial({
        marketplace: marketplacePda,
        seller: seller.publicKey,
        itemMint: nft.itemMint,
        listing: listingPda,
        sellerItemTokenAccount: nft.sellerItemTokenAccount,
        escrowItemTokenAccount,
        nftTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();

    const listing = await program.account.listing.fetch(listingPda);
    expect(listing.active).to.eq(false);

    const sellerAtaBalance = await provider.connection.getTokenAccountBalance(
      nft.sellerItemTokenAccount
    );
    expect(sellerAtaBalance.value.amount).to.eq("1");
  });

  it("buys listing, mints magic token to seller and burns NFT", async () => {
    const seller = anchor.web3.Keypair.generate();
    const buyer = anchor.web3.Keypair.generate();

    await airdrop(seller.publicKey);
    await airdrop(buyer.publicKey);

    await ensureMarketplaceInitialized();
    const magicConfig = await ensureMagicTokenReady();
    const nft = await mintTestNftToSeller(seller.publicKey);

    const escrowItemTokenAccount = getAssociatedTokenAddressSync(
      nft.itemMint,
      marketplacePda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const [listingPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        nft.itemMint.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createListing(new anchor.BN(500))
      .accountsPartial({
        marketplace: marketplacePda,
        seller: seller.publicKey,
        itemMint: nft.itemMint,
        sellerItemTokenAccount: nft.sellerItemTokenAccount,
        escrowItemTokenAccount,
        listing: listingPda,
        nftTokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    const sellerMagicAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      magicConfig.mint,
      seller.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sellerBefore = await provider.connection.getTokenAccountBalance(
      sellerMagicAta.address
    );

    await program.methods
      .buyListing()
      .accountsPartial({
        marketplace: marketplacePda,
        buyer: buyer.publicKey,
        seller: seller.publicKey,
        itemMint: nft.itemMint,
        listing: listingPda,
        itemConfig: itemConfigPda,
        itemRecord: nft.itemRecordPda,
        escrowItemTokenAccount,
        metadata: nft.metadata,
        masterEdition: nft.masterEdition,
        magicTokenConfig: magicTokenConfigPda,
        magicMint: magicConfig.mint,
        sellerMagicTokenAccount: sellerMagicAta.address,
        magicTokenProgramState: magicTokenProgram.programId,
        itemNftProgram: itemNftProgram.programId,
        magicTokenProgram: TOKEN_2022_PROGRAM_ID,
        nftTokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const listing = await program.account.listing.fetch(listingPda);
    expect(listing.active).to.eq(false);

    const sellerAfter = await provider.connection.getTokenAccountBalance(
      sellerMagicAta.address
    );
    expect(Number(sellerAfter.value.amount)).to.eq(
      Number(sellerBefore.value.amount) + 500
    );

    const escrowInfo = await provider.connection.getAccountInfo(
      escrowItemTokenAccount
    );
    expect(escrowInfo).to.eq(null);
  });
});
