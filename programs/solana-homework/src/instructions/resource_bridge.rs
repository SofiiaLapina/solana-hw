use anchor_lang::prelude::*;

use crate::errors::GameError;
use crate::resource_manager;
use crate::state::Resources;

pub fn map_resource_kind(
    resource_id: u8,
) -> Result<resource_manager::types::ResourceKind> {
    match resource_id {
        0 => Ok(resource_manager::types::ResourceKind::Wood),
        1 => Ok(resource_manager::types::ResourceKind::Iron),
        2 => Ok(resource_manager::types::ResourceKind::Gold),
        3 => Ok(resource_manager::types::ResourceKind::Leather),
        4 => Ok(resource_manager::types::ResourceKind::Stone),
        5 => Ok(resource_manager::types::ResourceKind::Diamond),
        _ => err!(GameError::InvalidResourceKind),
    }
}

pub fn apply_resource_to_local_balance(
    resources: &mut Resources,
    resource_kind: resource_manager::types::ResourceKind,
) {
    match resource_kind {
        resource_manager::types::ResourceKind::Wood => resources.wood += 1,
        resource_manager::types::ResourceKind::Iron => resources.iron += 1,
        resource_manager::types::ResourceKind::Gold => resources.gold += 1,
        resource_manager::types::ResourceKind::Leather => resources.leather += 1,
        resource_manager::types::ResourceKind::Stone => resources.stone += 1,
        resource_manager::types::ResourceKind::Diamond => resources.diamond += 1,
    }
}