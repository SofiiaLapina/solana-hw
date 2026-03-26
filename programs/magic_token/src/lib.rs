use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface};

mod marketplace_program {
    use anchor_lang::prelude::*;
    declare_id!("2zRX5LbkhMEBzwZUnfXTNbCttfNgN6Y8ey188Hz2bPEy");
}

declare_id!("EdDnUqbfP5o4qMRzqkcS2BefdKPS45nn4R47ns2toEuq");

#[program]
pub mod magic_token {
    use super::*;

    /// Initializes global config for MagicToken and stores the authorized marketplace PDA.
    pub fn initialize_magic_token_config(
        ctx: Context<InitializeMagicTokenConfig>,
        name: String,
        symbol: String,
        decimals: u8,
    ) -> Result<()> {
        let (expected_marketplace_authority, _) =
            Pubkey::find_program_address(&[b"marketplace"], &marketplace_program::ID);

        require_keys_eq!(
            ctx.accounts.marketplace_authority.key(),
            expected_marketplace_authority,
            MagicTokenError::InvalidMarketplaceAuthority
        );

        let config = &mut ctx.accounts.magic_token_config;
        config.authority = ctx.accounts.authority.key();
        config.marketplace_authority = ctx.accounts.marketplace_authority.key();
        config.name = name;
        config.symbol = symbol;
        config.decimals = decimals;
        config.mint = Pubkey::default();
        config.bump = ctx.bumps.magic_token_config;
        Ok(())
    }

    /// Initializes Token-2022 mint for MagicToken.
    /// The mint authority is the config PDA, so direct external minting is impossible.
    pub fn initialize_magic_mint(ctx: Context<InitializeMagicMint>) -> Result<()> {
        let config = &mut ctx.accounts.magic_token_config;
        config.mint = ctx.accounts.magic_mint.key();
        Ok(())
    }

    /// Mints MagicToken to a player token account.
    /// This instruction is intended to be called only from Marketplace CPI,
    /// where Marketplace signs with its PDA.
    pub fn mint_magic_to_player(ctx: Context<MintMagicToPlayer>, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"magic_token_config",
            &[ctx.accounts.magic_token_config.bump],
        ]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.magic_mint.to_account_info(),
            to: ctx.accounts.player_token_account.to_account_info(),
            authority: ctx.accounts.magic_token_config.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        token_interface::mint_to(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMagicTokenConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MagicTokenConfig::INIT_SPACE,
        seeds = [b"magic_token_config"],
        bump
    )]
    pub magic_token_config: Account<'info, MagicTokenConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: expected marketplace PDA, validated in handler.
    pub marketplace_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeMagicMint<'info> {
    #[account(
        mut,
        seeds = [b"magic_token_config"],
        bump = magic_token_config.bump,
        constraint = magic_token_config.authority == authority.key()
            @ MagicTokenError::Unauthorized
    )]
    pub magic_token_config: Account<'info, MagicTokenConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = magic_token_config.decimals,
        mint::authority = magic_token_config,
        mint::freeze_authority = magic_token_config,
        mint::token_program = token_program
    )]
    pub magic_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintMagicToPlayer<'info> {
    #[account(
        seeds = [b"magic_token_config"],
        bump = magic_token_config.bump,
        constraint = magic_token_config.mint == magic_mint.key()
            @ MagicTokenError::InvalidMagicMint,
        constraint = magic_token_config.marketplace_authority == marketplace_authority.key()
            @ MagicTokenError::InvalidMarketplaceAuthority
    )]
    pub magic_token_config: Account<'info, MagicTokenConfig>,

    /// Marketplace PDA must sign in CPI.
    pub marketplace_authority: Signer<'info>,

    /// Payer for outer transaction, forwarded into CPI if needed by caller.
    pub payer: Signer<'info>,

    /// CHECK: wallet owner of token account.
    pub player: UncheckedAccount<'info>,

    #[account(mut)]
    pub magic_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = player_token_account.owner == player.key()
            @ MagicTokenError::InvalidPlayerTokenAccount,
        constraint = player_token_account.mint == magic_mint.key()
            @ MagicTokenError::InvalidPlayerTokenAccount
    )]
    pub player_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
#[derive(InitSpace)]
pub struct MagicTokenConfig {
    pub authority: Pubkey,
    pub marketplace_authority: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(16)]
    pub symbol: String,
    pub decimals: u8,
    pub mint: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum MagicTokenError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid marketplace authority")]
    InvalidMarketplaceAuthority,
    #[msg("Invalid magic mint")]
    InvalidMagicMint,
    #[msg("Invalid player token account")]
    InvalidPlayerTokenAccount,
}
