import { type } from 'arktype';

export const entityId = type('string.integer');
export type EntityId = typeof entityId.infer;

export const actId = entityId.brand('act');
export type ActId = typeof actId.infer;

export const agendaId = entityId.brand('agenda');
export type AgendaId = typeof agendaId.infer;

export const enemyId = entityId.brand('enemy');
export type EnemyId = typeof enemyId.infer;

export const investigatorId = entityId.brand('investigator');
export type InvestigatorId = typeof investigatorId.infer;

export const locationId = entityId.brand('location');
export type LocationId = typeof locationId.infer;

export const assetId = entityId.brand('asset');
export type AssetId = typeof assetId.infer;

export const skillId = entityId.brand('skill');
export type SkillId = typeof skillId.infer;

export const eventId = entityId.brand('event');
export type EventId = typeof eventId.infer;

export const playerCardId = assetId.or(skillId).or(eventId);
export type PlayerCardId = typeof playerCardId.infer;
