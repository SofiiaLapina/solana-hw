use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface},
};

use crate::constants::{GAME_CONFIG_SEED, MINT_AUTHORITY_SEED};
use crate::error::ErrorCode;
use crate::instructions::initialize_resource_mint::ResourceKind;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct MintResourceToPlayer<'info> {
    #[account(
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump
    )]
    pub game_config: Account<'info, GameConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: PDA mint authority, validated by seeds and bump from game_config.
    #[account(
        seeds = [MINT_AUTHORITY_SEED.as_bytes()],
        bump = game_config.mint_authority_bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

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
    require!(
        ctx.accounts.authority.key() == ctx.accounts.game_config.authority
            || ctx.accounts.authority.key() == ctx.accounts.game_config.search_authority,
        ErrorCode::Unauthorized
    );

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

    let signer_seeds: &[&[&[u8]]] = &[&[
        MINT_AUTHORITY_SEED.as_bytes(),
        &[ctx.accounts.game_config.mint_authority_bump],
    ]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.player_token_account.to_account_info(),
        authority: ctx.accounts.mint_authority.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    token_interface::mint_to(cpi_context, amount)?;

    Ok(())
}
