use anchor_lang::prelude::*;

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