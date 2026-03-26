use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenInterface},
};

declare_id!("93hD3pVPe1Ws9GwBW2RViqxr9Kyhv1AFR8xLEGyXRmVK");

#[program]
pub mod search {
    use super::*;

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.user.key();
        player.last_search_timestamp = 0;
        player.bump = ctx.bumps.player;
        player.resources = Resources::default();
        player.crafted_sabers = 0;
        player.crafted_staffs = 0;
        Ok(())
    }

    pub fn search_resources(ctx: Context<SearchResources>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        if player.last_search_timestamp != 0 && now - player.last_search_timestamp < 60 {
            return err!(SearchError::SearchCooldownActive);
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

    pub fn search_resources_with_cpi(
        ctx: Context<SearchResourcesWithCpi>,
    ) -> Result<()> {
        let player = &mut ctx.accounts.player;
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        if player.last_search_timestamp != 0 && now - player.last_search_timestamp < 60 {
            return err!(SearchError::SearchCooldownActive);
        }

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"search_authority",
            &[ctx.bumps.search_authority],
        ]];

        for i in 0..3 {
            let resource_id = ((clock.slot + i as u64) % 6) as u8;
            let resource_kind = map_resource_kind(resource_id)?;

            let (mint_info, token_account_info) = match resource_kind {
                resource_manager::ResourceKind::Wood => (
                    ctx.accounts.wood_mint.to_account_info(),
                    ctx.accounts.wood_token_account.to_account_info(),
                ),
                resource_manager::ResourceKind::Iron => (
                    ctx.accounts.iron_mint.to_account_info(),
                    ctx.accounts.iron_token_account.to_account_info(),
                ),
                resource_manager::ResourceKind::Gold => (
                    ctx.accounts.gold_mint.to_account_info(),
                    ctx.accounts.gold_token_account.to_account_info(),
                ),
                resource_manager::ResourceKind::Leather => (
                    ctx.accounts.leather_mint.to_account_info(),
                    ctx.accounts.leather_token_account.to_account_info(),
                ),
                resource_manager::ResourceKind::Stone => (
                    ctx.accounts.stone_mint.to_account_info(),
                    ctx.accounts.stone_token_account.to_account_info(),
                ),
                resource_manager::ResourceKind::Diamond => (
                    ctx.accounts.diamond_mint.to_account_info(),
                    ctx.accounts.diamond_token_account.to_account_info(),
                ),
            };

            let cpi_program = ctx.accounts.resource_manager_program.to_account_info();
            let cpi_accounts = resource_manager::cpi::accounts::MintResourceToPlayer {
                game_config: ctx.accounts.resource_game_config.to_account_info(),
                search_authority: ctx.accounts.search_authority.to_account_info(),
                payer: ctx.accounts.owner.to_account_info(),
                player: ctx.accounts.owner.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                mint: mint_info,
                player_token_account: token_account_info,
                token_program: ctx.accounts.token_program.to_account_info(),
                associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            resource_manager::cpi::mint_resource_to_player(cpi_ctx, resource_kind.clone(), 1)?;
            apply_resource_to_local_balance(&mut player.resources, resource_kind);
        }

        player.last_search_timestamp = now;
        Ok(())
    }
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
        has_one = owner @ SearchError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SearchResourcesWithCpi<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ SearchError::InvalidPlayerOwner
    )]
    pub player: Account<'info, Player>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: signer PDA for Search -> ResourceManager CPI.
    #[account(
        seeds = [b"search_authority"],
        bump
    )]
    pub search_authority: UncheckedAccount<'info>,

    pub resource_manager_program: Program<'info, resource_manager::program::ResourceManager>,

    pub resource_game_config: Account<'info, resource_manager::GameConfig>,

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

#[account]
pub struct Player {
    pub owner: Pubkey,
    pub last_search_timestamp: i64,
    pub bump: u8,
    pub resources: Resources,
    pub crafted_sabers: u64,
    pub crafted_staffs: u64,
}

impl Player {
    pub const LEN: usize = 32 + 8 + 1 + Resources::LEN + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Resources {
    pub wood: u64,
    pub iron: u64,
    pub gold: u64,
    pub leather: u64,
    pub stone: u64,
    pub diamond: u64,
}

impl Resources {
    pub const LEN: usize = 8 * 6;
}

#[error_code]
pub enum SearchError {
    #[msg("Search cooldown is still active")]
    SearchCooldownActive,
    #[msg("Invalid player owner")]
    InvalidPlayerOwner,
    #[msg("Invalid resource kind")]
    InvalidResourceKind,
}

fn map_resource_kind(resource_id: u8) -> Result<resource_manager::ResourceKind> {
    match resource_id {
        0 => Ok(resource_manager::ResourceKind::Wood),
        1 => Ok(resource_manager::ResourceKind::Iron),
        2 => Ok(resource_manager::ResourceKind::Gold),
        3 => Ok(resource_manager::ResourceKind::Leather),
        4 => Ok(resource_manager::ResourceKind::Stone),
        5 => Ok(resource_manager::ResourceKind::Diamond),
        _ => err!(SearchError::InvalidResourceKind),
    }
}

fn apply_resource_to_local_balance(
    resources: &mut Resources,
    resource_kind: resource_manager::ResourceKind,
) {
    match resource_kind {
        resource_manager::ResourceKind::Wood => resources.wood += 1,
        resource_manager::ResourceKind::Iron => resources.iron += 1,
        resource_manager::ResourceKind::Gold => resources.gold += 1,
        resource_manager::ResourceKind::Leather => resources.leather += 1,
        resource_manager::ResourceKind::Stone => resources.stone += 1,
        resource_manager::ResourceKind::Diamond => resources.diamond += 1,
    }
}
