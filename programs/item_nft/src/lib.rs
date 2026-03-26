use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{self, CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata},
    token::{self, Burn, CloseAccount, Mint, MintTo, Token, TokenAccount},
};

declare_id!("B6wni9FcfnqRUBtAL2NS4ha1B7AhN5MVADBC8qTrec2U");

#[program]
pub mod item_nft {
    use super::*;

    /// Initializes item config used for NFT minting.
    pub fn initialize_item_config(
        ctx: Context<InitializeItemConfig>,
        collection_name: String,
        base_uri: String,
        marketplace_authority: Pubkey,
    ) -> Result<()> {
        let item_config = &mut ctx.accounts.item_config;
        item_config.authority = ctx.accounts.authority.key();
        item_config.collection_name = collection_name;
        item_config.base_uri = base_uri;
        item_config.marketplace_authority = marketplace_authority;
        item_config.items_minted = 0;
        item_config.bump = ctx.bumps.item_config;
        Ok(())
    }

    /// Mints a new item NFT and stores item metadata in item_record.
    pub fn mint_item_record(
        ctx: Context<MintItemRecord>,
        item_kind: ItemKind,
        name: String,
        uri: String,
    ) -> Result<()> {
        let item_number = ctx.accounts.item_config.items_minted + 1;

        let mint_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.item_mint.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::mint_to(mint_ctx, 1)?;

        let metadata_data = metadata::mpl_token_metadata::types::DataV2 {
            name: name.clone(),
            symbol: "UAITEM".to_string(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let metadata_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.item_mint.to_account_info(),
                mint_authority: ctx.accounts.authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        metadata::create_metadata_accounts_v3(metadata_ctx, metadata_data, true, true, None)?;

        let master_edition_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition.to_account_info(),
                mint: ctx.accounts.item_mint.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
                mint_authority: ctx.accounts.authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        metadata::create_master_edition_v3(master_edition_ctx, Some(0))?;

        let item_record = &mut ctx.accounts.item_record;
        item_record.owner = ctx.accounts.owner.key();
        item_record.item_kind = item_kind;
        item_record.name = name;
        item_record.uri = uri;
        item_record.item_number = item_number;
        item_record.mint = ctx.accounts.item_mint.key();
        item_record.metadata = ctx.accounts.metadata.key();
        item_record.master_edition = ctx.accounts.master_edition.key();
        item_record.bump = ctx.bumps.item_record;

        let item_config = &mut ctx.accounts.item_config;
        item_config.items_minted = item_number;

        Ok(())
    }

    /// Burns a minted NFT and closes the token account that currently holds it.
    /// The item record is kept as an on-chain history record.
    pub fn burn_item_record(ctx: Context<BurnItemRecord>) -> Result<()> {
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.item_mint.to_account_info(),
                from: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::burn(burn_ctx, 1)?;

        let close_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.owner_token_account.to_account_info(),
                destination: ctx.accounts.receiver.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::close_account(close_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeItemConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ItemConfig::INIT_SPACE,
        seeds = [b"item_config"],
        bump
    )]
    pub item_config: Account<'info, ItemConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintItemRecord<'info> {
    #[account(
        mut,
        seeds = [b"item_config"],
        bump = item_config.bump,
        has_one = authority
    )]
    pub item_config: Account<'info, ItemConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: owner of the NFT
    pub owner: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + ItemRecord::INIT_SPACE,
        seeds = [
            b"item_record",
            owner.key().as_ref(),
            &(item_config.items_minted + 1).to_le_bytes()
        ],
        bump
    )]
    pub item_record: Account<'info, ItemRecord>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority
    )]
    pub item_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = item_mint,
        associated_token::authority = owner
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata PDA for item_mint
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex master edition PDA for item_mint
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BurnItemRecord<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub receiver: SystemAccount<'info>,

    #[account(
        seeds = [b"item_config"],
        bump = item_config.bump,
        constraint = item_config.marketplace_authority == authority.key()
    )]
    pub item_config: Account<'info, ItemConfig>,

    #[account(
        mut,
        constraint = item_record.mint == item_mint.key(),
        constraint = item_record.metadata == metadata.key(),
        constraint = item_record.master_edition == master_edition.key()
    )]
    pub item_record: Account<'info, ItemRecord>,

    #[account(mut)]
    pub item_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = owner_token_account.mint == item_mint.key(),
        constraint = owner_token_account.owner == item_config.marketplace_authority,
        constraint = owner_token_account.amount == 1
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata PDA for item_mint
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Metaplex master edition PDA for item_mint
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct ItemConfig {
    pub authority: Pubkey,
    pub marketplace_authority: Pubkey,
    #[max_len(64)]
    pub collection_name: String,
    #[max_len(200)]
    pub base_uri: String,
    pub items_minted: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ItemRecord {
    pub owner: Pubkey,
    pub item_kind: ItemKind,
    #[max_len(64)]
    pub name: String,
    #[max_len(200)]
    pub uri: String,
    pub item_number: u64,
    pub mint: Pubkey,
    pub metadata: Pubkey,
    pub master_edition: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ItemKind {
    KozackSaber,
    ElderStaff,
}
