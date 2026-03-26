use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use item_nft::{self, cpi::accounts::MintItemRecord, program::ItemNft, ItemConfig, ItemKind};
use resource_manager::{
    self, cpi::accounts::BurnResourceFromPlayer, program::ResourceManager, GameConfig, ResourceKind,
};

declare_id!("5Jn9dMW1F3sfGEiz6qBrYvkAv9AvVG4UrFGaLMt6rn6L");

#[program]
pub mod crafting {
    use super::*;

    /// Initializes a player account for the crafting program.
    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.user.key();
        player.bump = ctx.bumps.player;
        player.crafted_sabers = 0;
        player.crafted_staffs = 0;
        Ok(())
    }

    /// Crafts a Kozack Saber by burning Token-2022 resources and minting an item NFT through CPI.
    pub fn craft_kozack_saber(ctx: Context<CraftKozackSaber>) -> Result<()> {
        require!(
            ctx.accounts.wood_token_account.amount >= 1
                && ctx.accounts.iron_token_account.amount >= 3
                && ctx.accounts.leather_token_account.amount >= 1,
            CraftingError::NotEnoughTokenResourcesForSaber
        );

        let rm_program = ctx.accounts.resource_manager_program.to_account_info();

        let wood_ctx = CpiContext::new(
            rm_program.clone(),
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.wood_mint.to_account_info(),
                player_token_account: ctx.accounts.wood_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(wood_ctx, ResourceKind::Wood, 1)?;

        let iron_ctx = CpiContext::new(
            rm_program.clone(),
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.iron_mint.to_account_info(),
                player_token_account: ctx.accounts.iron_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(iron_ctx, ResourceKind::Iron, 3)?;

        let leather_ctx = CpiContext::new(
            rm_program,
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.leather_mint.to_account_info(),
                player_token_account: ctx.accounts.leather_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(leather_ctx, ResourceKind::Leather, 1)?;

        let next_item_number = ctx.accounts.item_config.items_minted + 1;
        let base_uri = ctx.accounts.item_config.base_uri.clone();

        let cpi_program = ctx.accounts.item_nft_program.to_account_info();
        let cpi_accounts = MintItemRecord {
            item_config: ctx.accounts.item_config.to_account_info(),
            authority: ctx.accounts.item_nft_authority.to_account_info(),
            owner: ctx.accounts.owner.to_account_info(),
            item_record: ctx.accounts.item_record.to_account_info(),
            item_mint: ctx.accounts.item_mint.to_account_info(),
            owner_token_account: ctx.accounts.owner_token_account.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            master_edition: ctx.accounts.master_edition.to_account_info(),
            token_program: ctx.accounts.nft_token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            token_metadata_program: ctx.accounts.token_metadata_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        item_nft::cpi::mint_item_record(
            cpi_ctx,
            ItemKind::KozackSaber,
            format!("Kozack Saber #{}", next_item_number),
            format!("{}/kozack-saber-{}.json", base_uri, next_item_number),
        )?;

        ctx.accounts.player.crafted_sabers += 1;
        Ok(())
    }

    /// Crafts an Elder Staff by burning Token-2022 resources and minting an item NFT through CPI.
    pub fn craft_elder_staff(ctx: Context<CraftElderStaff>) -> Result<()> {
        require!(
            ctx.accounts.wood_token_account.amount >= 2
                && ctx.accounts.gold_token_account.amount >= 1
                && ctx.accounts.diamond_token_account.amount >= 1,
            CraftingError::NotEnoughTokenResourcesForStaff
        );

        let rm_program = ctx.accounts.resource_manager_program.to_account_info();

        let wood_ctx = CpiContext::new(
            rm_program.clone(),
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.wood_mint.to_account_info(),
                player_token_account: ctx.accounts.wood_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(wood_ctx, ResourceKind::Wood, 2)?;

        let gold_ctx = CpiContext::new(
            rm_program.clone(),
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.gold_mint.to_account_info(),
                player_token_account: ctx.accounts.gold_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(gold_ctx, ResourceKind::Gold, 1)?;

        let diamond_ctx = CpiContext::new(
            rm_program,
            BurnResourceFromPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                authority: ctx.accounts.resource_authority.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint: ctx.accounts.diamond_mint.to_account_info(),
                player_token_account: ctx.accounts.diamond_token_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        );
        resource_manager::cpi::burn_resource_from_player(diamond_ctx, ResourceKind::Diamond, 1)?;

        let next_item_number = ctx.accounts.item_config.items_minted + 1;
        let base_uri = ctx.accounts.item_config.base_uri.clone();

        let cpi_program = ctx.accounts.item_nft_program.to_account_info();
        let cpi_accounts = MintItemRecord {
            item_config: ctx.accounts.item_config.to_account_info(),
            authority: ctx.accounts.item_nft_authority.to_account_info(),
            owner: ctx.accounts.owner.to_account_info(),
            item_record: ctx.accounts.item_record.to_account_info(),
            item_mint: ctx.accounts.item_mint.to_account_info(),
            owner_token_account: ctx.accounts.owner_token_account.to_account_info(),
            metadata: ctx.accounts.metadata.to_account_info(),
            master_edition: ctx.accounts.master_edition.to_account_info(),
            token_program: ctx.accounts.nft_token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            token_metadata_program: ctx.accounts.token_metadata_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        item_nft::cpi::mint_item_record(
            cpi_ctx,
            ItemKind::ElderStaff,
            format!("Elder Staff #{}", next_item_number),
            format!("{}/elder-staff-{}.json", base_uri, next_item_number),
        )?;

        ctx.accounts.player.crafted_staffs += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Player::LEN,
        seeds = [b"player", user.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CraftKozackSaber<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ CraftingError::InvalidPlayerOwner
    )]
    pub player: Box<Account<'info, Player>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub resource_manager_program: Program<'info, ResourceManager>,

    #[account(
        seeds = [b"game_config"],
        bump = resource_game_config.bump,
        seeds::program = resource_manager_program.key(),
        constraint = resource_game_config.authority == resource_authority.key()
    )]
    pub resource_game_config: Box<Account<'info, GameConfig>>,

    pub resource_authority: Signer<'info>,

    #[account(mut)]
    pub wood_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub iron_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub leather_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub wood_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub iron_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub leather_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub item_nft_authority: Signer<'info>,
    pub item_nft_program: Program<'info, ItemNft>,

    #[account(
        mut,
        seeds = [b"item_config"],
        bump = item_config.bump,
        seeds::program = item_nft_program.key(),
        constraint = item_config.authority == item_nft_authority.key()
    )]
    pub item_config: Box<Account<'info, ItemConfig>>,

    /// CHECK: PDA for item record, created by CPI in item_nft program.
    #[account(mut)]
    pub item_record: UncheckedAccount<'info>,
    #[account(mut)]
    pub item_mint: Signer<'info>,
    /// CHECK: owner's ATA for crafted NFT.
    #[account(mut)]
    pub owner_token_account: UncheckedAccount<'info>,
    /// CHECK: metadata PDA for crafted NFT.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: master edition PDA for crafted NFT.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub nft_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CraftElderStaff<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ CraftingError::InvalidPlayerOwner
    )]
    pub player: Box<Account<'info, Player>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub resource_manager_program: Program<'info, ResourceManager>,

    #[account(
        seeds = [b"game_config"],
        bump = resource_game_config.bump,
        seeds::program = resource_manager_program.key(),
        constraint = resource_game_config.authority == resource_authority.key()
    )]
    pub resource_game_config: Box<Account<'info, GameConfig>>,

    pub resource_authority: Signer<'info>,

    #[account(mut)]
    pub wood_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub gold_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub diamond_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub wood_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub gold_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub diamond_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub item_nft_authority: Signer<'info>,
    pub item_nft_program: Program<'info, ItemNft>,

    #[account(
        mut,
        seeds = [b"item_config"],
        bump = item_config.bump,
        seeds::program = item_nft_program.key(),
        constraint = item_config.authority == item_nft_authority.key()
    )]
    pub item_config: Box<Account<'info, ItemConfig>>,

    /// CHECK: PDA for item record, created by CPI in item_nft program.
    #[account(mut)]
    pub item_record: UncheckedAccount<'info>,
    #[account(mut)]
    pub item_mint: Signer<'info>,
    /// CHECK: owner's ATA for crafted NFT.
    #[account(mut)]
    pub owner_token_account: UncheckedAccount<'info>,
    /// CHECK: metadata PDA for crafted NFT.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: master edition PDA for crafted NFT.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub nft_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex token metadata program.
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Player {
    pub owner: Pubkey,
    pub bump: u8,
    pub crafted_sabers: u64,
    pub crafted_staffs: u64,
}

impl Player {
    pub const LEN: usize = 32 + 1 + 8 + 8;
}

#[error_code]
pub enum CraftingError {
    #[msg("Invalid player owner")]
    InvalidPlayerOwner,
    #[msg("Not enough token resources for Kozack saber")]
    NotEnoughTokenResourcesForSaber,
    #[msg("Not enough token resources for Elder staff")]
    NotEnoughTokenResourcesForStaff,
}
