use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::constants::GAME_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::state::GameConfig;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ResourceKind {
    Wood,
    Iron,
    Gold,
    Leather,
    Stone,
    Diamond,
}

#[derive(Accounts)]
pub struct InitializeResourceMint<'info> {
    #[account(
        mut,
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority.key(),
        mint::freeze_authority = authority.key(),
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
pub fn handler(
    ctx: Context<InitializeResourceMint>,
    resource_kind: ResourceKind,
) -> Result<()> {
    let game_config = &mut ctx.accounts.game_config;
    let mint_key = ctx.accounts.mint.key();

    match resource_kind {
        ResourceKind::Wood => game_config.wood_mint = mint_key,
        ResourceKind::Iron => game_config.iron_mint = mint_key,
        ResourceKind::Gold => game_config.gold_mint = mint_key,
        ResourceKind::Leather => game_config.leather_mint = mint_key,
        ResourceKind::Stone => game_config.stone_mint = mint_key,
        ResourceKind::Diamond => game_config.diamond_mint = mint_key,
    }

    Ok(())
}