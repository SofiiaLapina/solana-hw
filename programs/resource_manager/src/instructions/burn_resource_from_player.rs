use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, BurnChecked, Mint, TokenAccount, TokenInterface};

use crate::constants::GAME_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::instructions::initialize_resource_mint::ResourceKind;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct BurnResourceFromPlayer<'info> {
    #[account(
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,

    pub authority: Signer<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = player_token_account.mint == mint.key() @ ErrorCode::InvalidMintForResource,
        constraint = player_token_account.owner == player.key() @ ErrorCode::Unauthorized
    )]
    pub player_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(
    ctx: Context<BurnResourceFromPlayer>,
    resource_kind: ResourceKind,
    amount: u64,
) -> Result<()> {
    let expected_mint = match resource_kind {
        ResourceKind::Wood => ctx.accounts.game_config.wood_mint,
        ResourceKind::Iron => ctx.accounts.game_config.iron_mint,
        ResourceKind::Gold => ctx.accounts.game_config.gold_mint,
        ResourceKind::Leather => ctx.accounts.game_config.leather_mint,
        ResourceKind::Stone => ctx.accounts.game_config.stone_mint,
        ResourceKind::Diamond => ctx.accounts.game_config.diamond_mint,
    };

    require_keys_eq!(
        ctx.accounts.mint.key(),
        expected_mint,
        ErrorCode::InvalidMintForResource
    );

    let decimals = ctx.accounts.mint.decimals;

    let cpi_accounts = BurnChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.player_token_account.to_account_info(),
        authority: ctx.accounts.player.to_account_info(),
    };

    let cpi_context = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

    token_interface::burn_checked(cpi_context, amount, decimals)?;

    Ok(())
}
