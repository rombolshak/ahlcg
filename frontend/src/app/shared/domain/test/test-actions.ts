import { testLocation } from '@domain/test/entities/test-locations';
import { InvestigatorAction } from '../action.model';

export const testActions: InvestigatorAction[] = [
  { id: 1, spentOn: { actionType: 'investigate', target: testLocation.id } },
  { id: 2 },
  { id: 3 },
];
