use anchor_lang::prelude::*;

use crate::constants::GAME_CONFIG_SEED;
use crate::error::ErrorCode;
use crate::state::GameConfig;

#[derive(Accounts)]
pub struct SetSearchAuthority<'info> {
    #[account(
        mut,
        seeds = [GAME_CONFIG_SEED.as_bytes()],
        bump = game_config.bump,
        has_one = authority @ ErrorCode::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<SetSearchAuthority>, search_authority: Pubkey) -> Result<()> {
    ctx.accounts.game_config.search_authority = search_authority;
    Ok(())
}
