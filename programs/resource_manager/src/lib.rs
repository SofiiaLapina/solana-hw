pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("2aAasvKWcVi9myKRQRrVW1FkesSj89DK2RoENpuyHiWZ");

#[program]
pub mod resource_manager {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn set_resource_mints(
        ctx: Context<SetResourceMints>,
        params: SetResourceMintsParams,
    ) -> Result<()> {
        set_resource_mints::handler(ctx, params)
    }

    pub fn set_search_authority(
        ctx: Context<SetSearchAuthority>,
        search_authority: Pubkey,
    ) -> Result<()> {
        set_search_authority::handler(ctx, search_authority)
    }

    pub fn initialize_resource_mint(
        ctx: Context<InitializeResourceMint>,
        resource_kind: ResourceKind,
    ) -> Result<()> {
        initialize_resource_mint::handler(ctx, resource_kind)
    }

    pub fn mint_resource_to_player(
        ctx: Context<MintResourceToPlayer>,
        resource_kind: ResourceKind,
        amount: u64,
    ) -> Result<()> {
        mint_resource_to_player::handler(ctx, resource_kind, amount)
    }

    pub fn burn_resource_from_player(
        ctx: Context<BurnResourceFromPlayer>,
        resource_kind: ResourceKind,
        amount: u64,
    ) -> Result<()> {
        burn_resource_from_player::handler(ctx, resource_kind, amount)
    }
}
