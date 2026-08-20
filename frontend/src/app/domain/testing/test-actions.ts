import { InvestigatorAction } from '@domain/action.model';
import { testLocation } from './entities/test-locations';

export const testActions: InvestigatorAction[] = [{ id: 1, spentOn: { actionType: 'investigate', target: testLocation.id } }, { id: 2 }, { id: 3 }];
