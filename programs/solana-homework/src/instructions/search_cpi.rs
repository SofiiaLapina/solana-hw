use anchor_lang::prelude::*;

use crate::errors::GameError;
use crate::instructions::resource_bridge::{
    apply_resource_to_local_balance,
    map_resource_kind,
};
use crate::state::Player;

#[derive(Accounts)]
pub struct SearchResourcesWithCpi<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    pub owner: Signer<'info>,

    pub resource_manager_program: UncheckedAccount<'info>,

    pub resource_game_config: UncheckedAccount<'info>,
}

pub fn search_resources_with_cpi_placeholder_handler(
    ctx: Context<SearchResourcesWithCpi>,
) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    let _ = &ctx.accounts.resource_manager_program;
    let _ = &ctx.accounts.resource_game_config;

    if player.last_search_timestamp != 0 && now - player.last_search_timestamp < 60 {
        return err!(GameError::SearchCooldownActive);
    }

    let seed = clock.slot;

    for i in 0..3 {
        let resource_id = ((seed + i as u64) % 6) as u8;
        let resource_kind = map_resource_kind(resource_id)?;
        apply_resource_to_local_balance(&mut player.resources, resource_kind);
    }

    player.last_search_timestamp = now;

    Ok(())
}