import { entityId } from '@domain/entities/id.model';
import { type } from 'arktype';

export const actionType = type.enumerated(
  'investigate',
  'move',
  'draw',
  'resource',
  'play',
  'activate',
  'fight',
  'engage',
  'evade',
);

export type ActionType = typeof actionType.infer;

const completedAction = type({
  actionType,
  target: entityId,
});

export const investigatorAction = type({
  id: 'number.integer >= 0',
  'originator?': entityId,
  'restrictions?': 'string',
  'spentOn?': completedAction,
});

export type InvestigatorAction = typeof investigatorAction.infer;
