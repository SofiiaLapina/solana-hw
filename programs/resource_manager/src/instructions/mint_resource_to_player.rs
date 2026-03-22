use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::constants::GAME_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::instructions::initialize_resource_mint::ResourceKind;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct MintResourceToPlayer<'info> {
    #[account(
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub player: SystemAccount<'info>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = player,
        associated_token::token_program = token_program,
    )]
    pub player_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<MintResourceToPlayer>,
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

    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.player_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );

    token_interface::mint_to(cpi_context, amount)?;

    Ok(())
}