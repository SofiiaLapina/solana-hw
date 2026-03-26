use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{
    self, BurnChecked, Mint, TokenAccount, TokenInterface,
};
use item_nft::{
    self,
    cpi::accounts::MintItemRecord,
    program::ItemNft,
    ItemConfig,
    ItemKind,
};

use crate::errors::GameError;
use crate::state::Player;

#[derive(Accounts)]
pub struct CraftKozackSaberWithTokensDemo<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Box<Account<'info, Player>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub wood_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub iron_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub leather_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub wood_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub iron_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub leather_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub item_nft_authority: Signer<'info>,

    pub item_nft_program: Program<'info, ItemNft>,

    #[account(
        mut,
        seeds = [b"item_config"],
        bump = item_config.bump,
        seeds::program = item_nft_program.key(),
        constraint = item_config.authority == item_nft_authority.key()
    )]
    pub item_config: Box<Account<'info, ItemConfig>>,

    /// CHECK: PDA for item record, created by CPI in item_nft program.
    #[account(mut)]
    pub item_record: UncheckedAccount<'info>,
    #[account(mut)]
    pub item_mint: Signer<'info>,
    /// CHECK: owner's ATA for crafted NFT
    #[account(mut)]
    pub owner_token_account: UncheckedAccount<'info>,
    /// CHECK: metadata PDA for crafted NFT
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: master edition PDA for crafted NFT
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub nft_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn craft_kozack_saber_with_tokens_demo_handler(
    ctx: Context<CraftKozackSaberWithTokensDemo>,
) -> Result<()> {
    require!(
        ctx.accounts.wood_token_account.amount >= 1
            && ctx.accounts.iron_token_account.amount >= 3
            && ctx.accounts.leather_token_account.amount >= 1,
        GameError::NotEnoughTokenResourcesForSaber
    );

    let token_program = ctx.accounts.token_program.to_account_info();
    let owner = ctx.accounts.owner.to_account_info();

    let wood_burn_accounts = BurnChecked {
        mint: ctx.accounts.wood_mint.to_account_info(),
        from: ctx.accounts.wood_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let wood_ctx = CpiContext::new(token_program.clone(), wood_burn_accounts);
    token_interface::burn_checked(wood_ctx, 1, ctx.accounts.wood_mint.decimals)?;

    let iron_burn_accounts = BurnChecked {
        mint: ctx.accounts.iron_mint.to_account_info(),
        from: ctx.accounts.iron_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let iron_ctx = CpiContext::new(token_program.clone(), iron_burn_accounts);
    token_interface::burn_checked(iron_ctx, 3, ctx.accounts.iron_mint.decimals)?;

    let leather_burn_accounts = BurnChecked {
        mint: ctx.accounts.leather_mint.to_account_info(),
        from: ctx.accounts.leather_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let leather_ctx = CpiContext::new(token_program, leather_burn_accounts);
    token_interface::burn_checked(
        leather_ctx,
        1,
        ctx.accounts.leather_mint.decimals,
    )?;

    let next_item_number = ctx.accounts.item_config.items_minted + 1;
    let base_uri = ctx.accounts.item_config.base_uri.clone();

    let cpi_program = ctx.accounts.item_nft_program.to_account_info();
    let cpi_accounts = MintItemRecord {
        item_config: ctx.accounts.item_config.to_account_info(),
        authority: ctx.accounts.item_nft_authority.to_account_info(),
        owner: ctx.accounts.owner.to_account_info(),
        item_record: ctx.accounts.item_record.to_account_info(),
        item_mint: ctx.accounts.item_mint.to_account_info(),
        owner_token_account: ctx.accounts.owner_token_account.to_account_info(),
        metadata: ctx.accounts.metadata.to_account_info(),
        master_edition: ctx.accounts.master_edition.to_account_info(),
        token_program: ctx.accounts.nft_token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        token_metadata_program: ctx.accounts.token_metadata_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    item_nft::cpi::mint_item_record(
        cpi_ctx,
        ItemKind::KozackSaber,
        format!("Kozack Saber #{}", next_item_number),
        format!("{}/kozack-saber-{}.json", base_uri, next_item_number),
    )?;

    ctx.accounts.player.crafted_sabers += 1;

    Ok(())
}

#[derive(Accounts)]
pub struct CraftElderStaffWithTokensDemo<'info> {
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        has_one = owner @ GameError::InvalidPlayerOwner
    )]
    pub player: Box<Account<'info, Player>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub wood_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub gold_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    pub diamond_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub wood_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub gold_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub diamond_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub item_nft_authority: Signer<'info>,

    pub item_nft_program: Program<'info, ItemNft>,

    #[account(
        mut,
        seeds = [b"item_config"],
        bump = item_config.bump,
        seeds::program = item_nft_program.key(),
        constraint = item_config.authority == item_nft_authority.key()
    )]
    pub item_config: Box<Account<'info, ItemConfig>>,

    /// CHECK: PDA for item record, created by CPI in item_nft program.
    #[account(mut)]
    pub item_record: UncheckedAccount<'info>,
    #[account(mut)]
    pub item_mint: Signer<'info>,
    /// CHECK: owner's ATA for crafted NFT
    #[account(mut)]
    pub owner_token_account: UncheckedAccount<'info>,
    /// CHECK: metadata PDA for crafted NFT
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: master edition PDA for crafted NFT
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub nft_token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: Metaplex token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn craft_elder_staff_with_tokens_demo_handler(
    ctx: Context<CraftElderStaffWithTokensDemo>,
) -> Result<()> {
    require!(
        ctx.accounts.wood_token_account.amount >= 2
            && ctx.accounts.gold_token_account.amount >= 1
            && ctx.accounts.diamond_token_account.amount >= 1,
        GameError::NotEnoughTokenResourcesForStaff
    );

    let token_program = ctx.accounts.token_program.to_account_info();
    let owner = ctx.accounts.owner.to_account_info();

    let wood_burn_accounts = BurnChecked {
        mint: ctx.accounts.wood_mint.to_account_info(),
        from: ctx.accounts.wood_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let wood_ctx = CpiContext::new(token_program.clone(), wood_burn_accounts);
    token_interface::burn_checked(wood_ctx, 2, ctx.accounts.wood_mint.decimals)?;

    let gold_burn_accounts = BurnChecked {
        mint: ctx.accounts.gold_mint.to_account_info(),
        from: ctx.accounts.gold_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let gold_ctx = CpiContext::new(token_program.clone(), gold_burn_accounts);
    token_interface::burn_checked(gold_ctx, 1, ctx.accounts.gold_mint.decimals)?;

    let diamond_burn_accounts = BurnChecked {
        mint: ctx.accounts.diamond_mint.to_account_info(),
        from: ctx.accounts.diamond_token_account.to_account_info(),
        authority: owner.clone(),
    };
    let diamond_ctx = CpiContext::new(token_program, diamond_burn_accounts);
    token_interface::burn_checked(
        diamond_ctx,
        1,
        ctx.accounts.diamond_mint.decimals,
    )?;

    let next_item_number = ctx.accounts.item_config.items_minted + 1;
    let base_uri = ctx.accounts.item_config.base_uri.clone();

    let cpi_program = ctx.accounts.item_nft_program.to_account_info();
    let cpi_accounts = MintItemRecord {
        item_config: ctx.accounts.item_config.to_account_info(),
        authority: ctx.accounts.item_nft_authority.to_account_info(),
        owner: ctx.accounts.owner.to_account_info(),
        item_record: ctx.accounts.item_record.to_account_info(),
        item_mint: ctx.accounts.item_mint.to_account_info(),
        owner_token_account: ctx.accounts.owner_token_account.to_account_info(),
        metadata: ctx.accounts.metadata.to_account_info(),
        master_edition: ctx.accounts.master_edition.to_account_info(),
        token_program: ctx.accounts.nft_token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        token_metadata_program: ctx.accounts.token_metadata_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    item_nft::cpi::mint_item_record(
        cpi_ctx,
        ItemKind::ElderStaff,
        format!("Elder Staff #{}", next_item_number),
        format!("{}/elder-staff-{}.json", base_uri, next_item_number),
    )?;

    ctx.accounts.player.crafted_staffs += 1;

    Ok(())
}
