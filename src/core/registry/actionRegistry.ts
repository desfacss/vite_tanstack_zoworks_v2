
import { registry } from './index';
import { ActionDefinition } from './types';

export const registerAction = (action: ActionDefinition) => {
    registry.registerAction(action);
};

export const getActionsForEntity = (entityType: string, position: 'row' | 'global' | 'both' = 'both') => {
    return registry.getActionsForEntity(entityType, position);
};
