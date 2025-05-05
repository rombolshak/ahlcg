import { type } from 'arktype';

export const entityId = type('string.integer');
export const actId = entityId.brand('act');
export const agendaId = entityId.brand('agenda');
export const enemyId = entityId.brand('enemy');
export const investigatorId = entityId.brand('investigator');
export const locationId = entityId.brand('location');
export const assetId = entityId.brand('asset');
export const skillId = entityId.brand('skill');
export const eventId = entityId.brand('event');
export const playerCardId = assetId.or(skillId).or(eventId);
