use anchor_lang::prelude::*;

declare_id!("DzYDbDJDqfeapgikiNZJrmT1RcChTHKLaA3XBZYhxprJ");

#[program]
pub mod solana_homework {
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
            return err!(GameError::SearchCooldownActive);
        }

        let seed = clock.slot;

        for i in 0..3 {
            let resource_id = ((seed + i as u64) % 6) as u8;

            match resource_id {
                0 => player.resources.wood += 1,
                1 => player.resources.iron += 1,
                2 => player.resources.gold += 1,
                3 => player.resources.leather += 1,
                4 => player.resources.stone += 1,
                5 => player.resources.diamond += 1,
                _ => unreachable!(),
            }
        }

        player.last_search_timestamp = now;

        Ok(())
    }

    pub fn grant_demo_saber_recipe(ctx: Context<PlayerOwnerAction>) -> Result<()> {
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

    pub fn grant_demo_staff_recipe(ctx: Context<PlayerOwnerAction>) -> Result<()> {
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

    pub fn craft_kozack_saber(ctx: Context<PlayerOwnerAction>) -> Result<()> {
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

    pub fn craft_elder_staff(ctx: Context<PlayerOwnerAction>) -> Result<()> {
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
pub enum GameError {
    #[msg("Search cooldown is still active")]
    SearchCooldownActive,
    #[msg("Invalid player owner")]
    InvalidPlayerOwner,
    #[msg("Not enough resources for Kozack saber")]
    NotEnoughResourcesForSaber,
    #[msg("Not enough resources for Elder staff")]
    NotEnoughResourcesForStaff,
}