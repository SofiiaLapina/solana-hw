use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("DzYDbDJDqfeapgikiNZJrmT1RcChTHKLaA3XBZYhxprJ");

#[program]
pub mod solana_homework {
    use super::*;

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        initialize_player_handler(ctx)
    }

    pub fn search_resources(ctx: Context<SearchResources>) -> Result<()> {
        search_resources_handler(ctx)
    }

    pub fn grant_demo_saber_recipe(ctx: Context<PlayerOwnerAction>) -> Result<()> {
        grant_demo_saber_recipe_handler(ctx)
    }

    pub fn grant_demo_staff_recipe(ctx: Context<PlayerOwnerAction>) -> Result<()> {
        grant_demo_staff_recipe_handler(ctx)
    }

    pub fn craft_kozack_saber(ctx: Context<PlayerOwnerAction>) -> Result<()> {
        craft_kozack_saber_handler(ctx)
    }

    pub fn craft_elder_staff(ctx: Context<PlayerOwnerAction>) -> Result<()> {
        craft_elder_staff_handler(ctx)
    }
}