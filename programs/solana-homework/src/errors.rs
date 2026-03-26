use anchor_lang::prelude::*;

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
    #[msg("Invalid resource kind")]
    InvalidResourceKind,
    #[msg("Not enough token resources for Kozack saber")]
    NotEnoughTokenResourcesForSaber,
    #[msg("Not enough token resources for Elder staff")]
    NotEnoughTokenResourcesForStaff,
}
