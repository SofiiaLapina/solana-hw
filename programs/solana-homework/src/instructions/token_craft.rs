use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    self, BurnChecked, Mint, TokenAccount, TokenInterface,
};

use crate::errors::GameError;
use crate::state::Player;

#[derive(Accounts)]
pub struct CraftKozackSaberWithTokensDemo<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub wood_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub iron_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub leather_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub wood_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub iron_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub leather_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn craft_kozack_saber_with_tokens_demo_handler(
    ctx: Context<CraftKozackSaberWithTokensDemo>,
) -> Result<()> {
    require!(
        ctx.accounts.wood_token_account.amount >= 1
            && ctx.accounts.iron_token_account.amount >= 3
            && ctx.accounts.leather_token_account.amount >= 1,
        GameError::NotEnoughTokenResourcesForSaber
    );

    let token_program = ctx.accounts.token_program.to_account_info();
    let owner = ctx.accounts.owner.to_account_info();

    let wood_burn_accounts = BurnChecked {
        mint: ctx.accounts.wood_mint.to_account_info(),
        from: ctx.accounts.wood_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let wood_ctx = CpiContext::new(token_program.clone(), wood_burn_accounts);
    token_interface::burn_checked(wood_ctx, 1, ctx.accounts.wood_mint.decimals)?;

    let iron_burn_accounts = BurnChecked {
        mint: ctx.accounts.iron_mint.to_account_info(),
        from: ctx.accounts.iron_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let iron_ctx = CpiContext::new(token_program.clone(), iron_burn_accounts);
    token_interface::burn_checked(iron_ctx, 3, ctx.accounts.iron_mint.decimals)?;

    let leather_burn_accounts = BurnChecked {
        mint: ctx.accounts.leather_mint.to_account_info(),
        from: ctx.accounts.leather_token_account.to_account_info(),
        authority: owner,
    };
    let leather_ctx = CpiContext::new(token_program, leather_burn_accounts);
    token_interface::burn_checked(
        leather_ctx,
        1,
        ctx.accounts.leather_mint.decimals,
    )?;

    ctx.accounts.player.crafted_sabers += 1;

    Ok(())
}