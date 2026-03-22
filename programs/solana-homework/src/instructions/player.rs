use anchor_lang::prelude::*;

use crate::errors::GameError;
use crate::instructions::resource_bridge::{
    apply_resource_to_local_balance,
    map_resource_kind,
};
use crate::state::{Player, Resources};

pub fn initialize_player_handler(ctx: Context<InitializePlayer>) -> Result<()> {
    let player = &mut ctx.accounts.player;

    player.owner = ctx.accounts.user.key();
    player.last_search_timestamp = 0;
    player.bump = ctx.bumps.player;
    player.resources = Resources::default();
    player.crafted_sabers = 0;
    player.crafted_staffs = 0;

    Ok(())
}

pub fn search_resources_handler(ctx: Context<SearchResources>) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

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

pub fn grant_demo_saber_recipe_handler(ctx: Context<PlayerOwnerAction>) -> Result<()> {
    let player = &mut ctx.accounts.player;

    player.resources = Resources {
        wood: 1,
        iron: 3,
        gold: 0,
        leather: 1,
        stone: 0,
        diamond: 0,
    };

    Ok(())
}

pub fn grant_demo_staff_recipe_handler(ctx: Context<PlayerOwnerAction>) -> Result<()> {
    let player = &mut ctx.accounts.player;

    player.resources = Resources {
        wood: 2,
        iron: 0,
        gold: 1,
        leather: 0,
        stone: 0,
        diamond: 1,
    };

    Ok(())
}

pub fn craft_kozack_saber_handler(ctx: Context<PlayerOwnerAction>) -> Result<()> {
    let player = &mut ctx.accounts.player;

    require!(
        player.resources.iron >= 3
            && player.resources.wood >= 1
            && player.resources.leather >= 1,
        GameError::NotEnoughResourcesForSaber
    );

    player.resources.iron -= 3;
    player.resources.wood -= 1;
    player.resources.leather -= 1;
    player.crafted_sabers += 1;

    Ok(())
}

pub fn craft_elder_staff_handler(ctx: Context<PlayerOwnerAction>) -> Result<()> {
    let player = &mut ctx.accounts.player;

    require!(
        player.resources.wood >= 2
            && player.resources.gold >= 1
            && player.resources.diamond >= 1,
        GameError::NotEnoughResourcesForStaff
    );

    player.resources.wood -= 2;
    player.resources.gold -= 1;
    player.resources.diamond -= 1;
    player.crafted_staffs += 1;

    Ok(())
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
pub struct SearchResources<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlayerOwnerAction<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    pub owner: Signer<'info>,
}