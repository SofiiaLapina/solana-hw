use anchor_lang::prelude::*;

use crate::constants::GAME_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::state::GameConfig;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SetResourceMintsParams {
    pub wood_mint: Pubkey,
    pub iron_mint: Pubkey,
    pub gold_mint: Pubkey,
    pub leather_mint: Pubkey,
    pub stone_mint: Pubkey,
    pub diamond_mint: Pubkey,
}

#[derive(Accounts)]
pub struct SetResourceMints<'info> {
    #[account(
        mut,
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetResourceMints>, params: SetResourceMintsParams) -> Result<()> {
    let game_config = &mut ctx.accounts.game_config;

    game_config.wood_mint = params.wood_mint;
    game_config.iron_mint = params.iron_mint;
    game_config.gold_mint = params.gold_mint;
    game_config.leather_mint = params.leather_mint;
    game_config.stone_mint = params.stone_mint;
    game_config.diamond_mint = params.diamond_mint;

    Ok(())
}
