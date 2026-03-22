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

    pub fn initialize_resource_mint(
        ctx: Context<InitializeResourceMint>,
        resource_kind: ResourceKind,
    ) -> Result<()> {
        initialize_resource_mint::handler(ctx, resource_kind)
    }
}