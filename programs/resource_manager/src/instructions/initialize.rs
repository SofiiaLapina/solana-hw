use anchor_lang::prelude::*;

use crate::constants::GAME_CONFIG_SEED;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GameConfig::LEN,
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump
    )]
    pub game_config: Account<'info, GameConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let game_config = &mut ctx.accounts.game_config;

    game_config.authority = ctx.accounts.authority.key();
    game_config.bump = ctx.bumps.game_config;

    game_config.wood_mint = Pubkey::default();
    game_config.iron_mint = Pubkey::default();
    game_config.gold_mint = Pubkey::default();
    game_config.leather_mint = Pubkey::default();
    game_config.stone_mint = Pubkey::default();
    game_config.diamond_mint = Pubkey::default();

    Ok(())
}