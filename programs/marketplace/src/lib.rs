use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint as NftMint, Token, TokenAccount as NftTokenAccount, Transfer},
    token_interface::{Mint as MagicMint, TokenAccount as MagicTokenAccount, TokenInterface},
};
use item_nft::{self, program::ItemNft, ItemConfig, ItemRecord};
use magic_token::{self, program::MagicToken, MagicTokenConfig};

declare_id!("2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy");

#[program]
pub mod marketplace {
    use super::*;

    /// Initializes marketplace config.
    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, fee_bps: u16) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.fee_bps = fee_bps;
        marketplace.bump = ctx.bumps.marketplace;
        Ok(())
    }

    /// Creates a listing and transfers seller NFT into marketplace escrow ATA.
    pub fn create_listing(ctx: Context<CreateListing>, price: u64) -> Result<()> {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.nft_token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_item_token_account.to_account_info(),
                to: ctx.accounts.escrow_item_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, 1)?;

        let listing = &mut ctx.accounts.listing;
        listing.marketplace = ctx.accounts.marketplace.key();
        listing.seller = ctx.accounts.seller.key();
        listing.item_mint = ctx.accounts.item_mint.key();
        listing.price = price;
        listing.active = true;
        listing.bump = ctx.bumps.listing;

        Ok(())
    }

    /// Cancels a listing and returns NFT from escrow ATA back to seller ATA.
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, MarketplaceError::ListingAlreadyInactive);

        let signer_seeds: &[&[&[u8]]] = &[&[b"marketplace", &[ctx.accounts.marketplace.bump]]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.nft_token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_item_token_account.to_account_info(),
                to: ctx.accounts.seller_item_token_account.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, 1)?;

        listing.active = false;
        Ok(())
    }

    /// Buys a listed NFT:
    /// 1) mints MagicToken to seller through CPI to magic_token
    /// 2) burns NFT through CPI to item_nft
    /// 3) deactivates listing
    pub fn buy_listing(ctx: Context<BuyListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, MarketplaceError::ListingInactive);

        let signer_seeds: &[&[&[u8]]] = &[&[b"marketplace", &[ctx.accounts.marketplace.bump]]];

        let mint_magic_accounts = magic_token::cpi::accounts::MintMagicToPlayer {
            magic_token_config: ctx.accounts.magic_token_config.to_account_info(),
            marketplace_authority: ctx.accounts.marketplace.to_account_info(),
            payer: ctx.accounts.buyer.to_account_info(),
            player: ctx.accounts.seller.to_account_info(),
            magic_mint: ctx.accounts.magic_mint.to_account_info(),
            player_token_account: ctx.accounts.seller_magic_token_account.to_account_info(),
            token_program: ctx.accounts.magic_token_program.to_account_info(),
        };

        let mint_magic_ctx = CpiContext::new_with_signer(
            ctx.accounts.magic_token_program_state.to_account_info(),
            mint_magic_accounts,
            signer_seeds,
        );

        magic_token::cpi::mint_magic_to_player(mint_magic_ctx, listing.price)?;

        let burn_item_accounts = item_nft::cpi::accounts::BurnItemRecord {
            authority: ctx.accounts.marketplace.to_account_info(),
            receiver: ctx.accounts.seller.to_account_info(),
            item_config: ctx.accounts.item_config.to_account_info(),
            item_record: ctx.accounts.item_record.to_account_info(),
            item_mint: ctx.accounts.item_mint.to_account_info(),
            owner_token_account: ctx.accounts.escrow_item_token_account.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            master_edition: ctx.accounts.master_edition.to_account_info(),
            token_program: ctx.accounts.nft_token_program.to_account_info(),
        };

        let burn_item_ctx = CpiContext::new_with_signer(
            ctx.accounts.item_nft_program.to_account_info(),
            burn_item_accounts,
            signer_seeds,
        );

        item_nft::cpi::burn_item_record(burn_item_ctx)?;

        listing.active = false;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(
        seeds = [b"marketplace"],
        bump = marketplace.bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub item_mint: Box<Account<'info, NftMint>>,

    #[account(
        mut,
        constraint = seller_item_token_account.owner == seller.key() @ MarketplaceError::InvalidSellerItemTokenAccount,
        constraint = seller_item_token_account.mint == item_mint.key() @ MarketplaceError::InvalidSellerItemTokenAccount,
        constraint = seller_item_token_account.amount == 1 @ MarketplaceError::InvalidSellerItemTokenAccount
    )]
    pub seller_item_token_account: Account<'info, NftTokenAccount>,

    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = item_mint,
        associated_token::authority = marketplace,
        associated_token::token_program = nft_token_program
    )]
    pub escrow_item_token_account: Box<Account<'info, NftTokenAccount>>,

    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", seller.key().as_ref(), item_mint.key().as_ref()],
        bump
    )]
    pub listing: Box<Account<'info, Listing>>,

    pub nft_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        seeds = [b"marketplace"],
        bump = marketplace.bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub item_mint: Box<Account<'info, NftMint>>,

    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), item_mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller @ MarketplaceError::InvalidSeller,
        has_one = marketplace @ MarketplaceError::InvalidMarketplace
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        constraint = seller_item_token_account.owner == seller.key() @ MarketplaceError::InvalidSellerItemTokenAccount,
        constraint = seller_item_token_account.mint == item_mint.key() @ MarketplaceError::InvalidSellerItemTokenAccount
    )]
    pub seller_item_token_account: Account<'info, NftTokenAccount>,

    #[account(
        mut,
        associated_token::mint = item_mint,
        associated_token::authority = marketplace,
        associated_token::token_program = nft_token_program
    )]
    pub escrow_item_token_account: Box<Account<'info, NftTokenAccount>>,

    pub nft_token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyListing<'info> {
    #[account(
        seeds = [b"marketplace"],
        bump = marketplace.bump
    )]
    pub marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub seller: SystemAccount<'info>,

    #[account(mut)]
    pub item_mint: Box<Account<'info, NftMint>>,

    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), item_mint.key().as_ref()],
        bump = listing.bump,
        has_one = marketplace @ MarketplaceError::InvalidMarketplace,
        has_one = seller @ MarketplaceError::InvalidSeller,
        constraint = listing.item_mint == item_mint.key() @ MarketplaceError::InvalidItemMint
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        seeds = [b"item_config"],
        bump = item_config.bump,
        seeds::program = item_nft_program.key(),
        constraint = item_config.marketplace_authority == marketplace.key()
    )]
    pub item_config: Box<Account<'info, ItemConfig>>,

    #[account(
        mut,
        constraint = item_record.mint == item_mint.key() @ MarketplaceError::InvalidItemRecord
    )]
    pub item_record: Box<Account<'info, ItemRecord>>,

    #[account(
        mut,
        associated_token::mint = item_mint,
        associated_token::authority = marketplace,
        associated_token::token_program = nft_token_program
    )]
    pub escrow_item_token_account: Box<Account<'info, NftTokenAccount>>,

    /// CHECK: Metaplex metadata PDA for item_mint.
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex master edition PDA for item_mint.
    pub master_edition: UncheckedAccount<'info>,

    #[account(
        constraint = magic_token_config.marketplace_authority == marketplace.key() @ MarketplaceError::InvalidMagicTokenConfig,
        constraint = magic_token_config.mint == magic_mint.key() @ MarketplaceError::InvalidMagicTokenConfig
    )]
    pub magic_token_config: Box<Account<'info, MagicTokenConfig>>,

    #[account(mut)]
    pub magic_mint: Box<InterfaceAccount<'info, MagicMint>>,

    #[account(
        mut,
        constraint = seller_magic_token_account.owner == seller.key() @ MarketplaceError::InvalidSellerTokenAccount,
        constraint = seller_magic_token_account.mint == magic_mint.key() @ MarketplaceError::InvalidSellerTokenAccount
    )]
    pub seller_magic_token_account: Box<InterfaceAccount<'info, MagicTokenAccount>>,

    pub magic_token_program_state: Program<'info, MagicToken>,
    pub item_nft_program: Program<'info, ItemNft>,
    pub magic_token_program: Interface<'info, TokenInterface>,
    pub nft_token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub marketplace: Pubkey,
    pub seller: Pubkey,
    pub item_mint: Pubkey,
    pub price: u64,
    pub active: bool,
    pub bump: u8,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Invalid seller")]
    InvalidSeller,
    #[msg("Invalid marketplace")]
    InvalidMarketplace,
    #[msg("Listing is already inactive")]
    ListingAlreadyInactive,
    #[msg("Listing is inactive")]
    ListingInactive,
    #[msg("Invalid item mint")]
    InvalidItemMint,
    #[msg("Invalid seller token account")]
    InvalidSellerTokenAccount,
    #[msg("Invalid seller item token account")]
    InvalidSellerItemTokenAccount,
    #[msg("Invalid item record")]
    InvalidItemRecord,
    #[msg("Invalid magic token config")]
    InvalidMagicTokenConfig,
}
