use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenInterface},
};

use crate::errors::GameError;
use crate::instructions::resource_bridge::{apply_resource_to_local_balance, map_resource_kind};
use crate::resource_manager;
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

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: passed through to resource_manager; real signing is only possible from search program PDA.
    pub search_authority: UncheckedAccount<'info>,

    pub resource_manager_program: Program<'info, resource_manager::program::ResourceManager>,

    #[account(mut)]
    pub resource_game_config: Account<'info, resource_manager::accounts::GameConfig>,

    /// CHECK: external resource_manager PDA mint authority.
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub resource_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub player_token_account: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn search_resources_with_cpi_placeholder_handler(
    ctx: Context<SearchResourcesWithCpi>,
) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    if player.last_search_timestamp != 0 && now - player.last_search_timestamp < 60 {
        return err!(GameError::SearchCooldownActive);
    }

    let cpi_program = ctx.accounts.resource_manager_program.to_account_info();

    let cpi_accounts = resource_manager::cpi::accounts::MintResourceToPlayer {
        game_config: ctx.accounts.resource_game_config.to_account_info(),
        authority: ctx.accounts.search_authority.to_account_info(),
        player: ctx.accounts.owner.to_account_info(),
        mint_authority: ctx.accounts.mint_authority.to_account_info(),
        mint: ctx.accounts.resource_mint.to_account_info(),
        player_token_account: ctx.accounts.player_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    resource_manager::cpi::mint_resource_to_player(
        cpi_ctx,
        resource_manager::types::ResourceKind::Wood,
        1,
    )?;

    apply_resource_to_local_balance(
        &mut player.resources,
        resource_manager::types::ResourceKind::Wood,
    );

    player.last_search_timestamp = now;

    Ok(())
}

#[derive(Accounts)]
pub struct MintWoodViaCpiDemo<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: passed through to resource_manager; real signing is only possible from search program PDA.
    pub search_authority: UncheckedAccount<'info>,

    pub resource_manager_program: Program<'info, resource_manager::program::ResourceManager>,

    #[account(mut)]
    pub resource_game_config: Account<'info, resource_manager::accounts::GameConfig>,

    /// CHECK: external resource_manager PDA mint authority.
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub resource_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub player_token_account: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn mint_wood_via_cpi_demo_handler(ctx: Context<MintWoodViaCpiDemo>) -> Result<()> {
    let cpi_program = ctx.accounts.resource_manager_program.to_account_info();

    let cpi_accounts = resource_manager::cpi::accounts::MintResourceToPlayer {
        game_config: ctx.accounts.resource_game_config.to_account_info(),
        authority: ctx.accounts.search_authority.to_account_info(),
        player: ctx.accounts.owner.to_account_info(),
        mint_authority: ctx.accounts.mint_authority.to_account_info(),
        mint: ctx.accounts.resource_mint.to_account_info(),
        player_token_account: ctx.accounts.player_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    resource_manager::cpi::mint_resource_to_player(
        cpi_ctx,
        resource_manager::types::ResourceKind::Wood,
        1,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct SearchResourcesWithCpiFullDemo<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: passed through to resource_manager; real signing is only possible from search program PDA.
    pub search_authority: UncheckedAccount<'info>,

    pub resource_manager_program: Program<'info, resource_manager::program::ResourceManager>,

    #[account(mut)]
    pub resource_game_config: Account<'info, resource_manager::accounts::GameConfig>,

    /// CHECK: external resource_manager PDA mint authority.
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub wood_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub iron_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub gold_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub leather_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub stone_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub diamond_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub wood_token_account: UncheckedAccount<'info>,
    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub iron_token_account: UncheckedAccount<'info>,
    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub gold_token_account: UncheckedAccount<'info>,
    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub leather_token_account: UncheckedAccount<'info>,
    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub stone_token_account: UncheckedAccount<'info>,
    /// CHECK: ATA may be created by inner CPI in resource_manager.
    #[account(mut)]
    pub diamond_token_account: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn search_resources_with_cpi_full_demo_handler(
    ctx: Context<SearchResourcesWithCpiFullDemo>,
) -> Result<()> {
    let player = &mut ctx.accounts.player;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    if player.last_search_timestamp != 0 && now - player.last_search_timestamp < 60 {
        return err!(GameError::SearchCooldownActive);
    }

    for i in 0..3 {
        let resource_id = ((clock.slot + i as u64) % 6) as u8;
        let resource_kind = map_resource_kind(resource_id)?;

        let (mint_info, token_account_info) = match resource_kind {
            resource_manager::types::ResourceKind::Wood => (
                ctx.accounts.wood_mint.to_account_info(),
                ctx.accounts.wood_token_account.to_account_info(),
            ),
            resource_manager::types::ResourceKind::Iron => (
                ctx.accounts.iron_mint.to_account_info(),
                ctx.accounts.iron_token_account.to_account_info(),
            ),
            resource_manager::types::ResourceKind::Gold => (
                ctx.accounts.gold_mint.to_account_info(),
                ctx.accounts.gold_token_account.to_account_info(),
            ),
            resource_manager::types::ResourceKind::Leather => (
                ctx.accounts.leather_mint.to_account_info(),
                ctx.accounts.leather_token_account.to_account_info(),
            ),
            resource_manager::types::ResourceKind::Stone => (
                ctx.accounts.stone_mint.to_account_info(),
                ctx.accounts.stone_token_account.to_account_info(),
            ),
            resource_manager::types::ResourceKind::Diamond => (
                ctx.accounts.diamond_mint.to_account_info(),
                ctx.accounts.diamond_token_account.to_account_info(),
            ),
        };

        let cpi_program = ctx.accounts.resource_manager_program.to_account_info();

        let cpi_accounts = resource_manager::cpi::accounts::MintResourceToPlayer {
            game_config: ctx.accounts.resource_game_config.to_account_info(),
            authority: ctx.accounts.search_authority.to_account_info(),
            player: ctx.accounts.owner.to_account_info(),
            mint_authority: ctx.accounts.mint_authority.to_account_info(),
            mint: mint_info,
            player_token_account: token_account_info,
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        resource_manager::cpi::mint_resource_to_player(cpi_ctx, resource_kind.clone(), 1)?;
        apply_resource_to_local_balance(&mut player.resources, resource_kind);
    }

    player.last_search_timestamp = now;

    Ok(())
}
