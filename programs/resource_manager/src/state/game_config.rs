use anchor_lang::prelude::*;

#[account]
pub struct GameConfig {
    pub authority: Pubkey,
    pub bump: u8,

    pub wood_mint: Pubkey,
    pub iron_mint: Pubkey,
    pub gold_mint: Pubkey,
    pub leather_mint: Pubkey,
    pub stone_mint: Pubkey,
    pub diamond_mint: Pubkey,
}

impl GameConfig {
    pub const LEN: usize = 32 + 1 + (32 * 6);
}