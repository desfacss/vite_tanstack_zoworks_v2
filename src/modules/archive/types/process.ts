// src/modules/archive/types/process.ts

export interface PERTValues {
  optimisticHours: number;
  mostLikelyHours: number;
  pessimisticHours: number;
  targetTimeHours?: number;
  reasons?: string[];
}

export interface RACI {
  responsible: { id: string; type: string }[];
  accountable: { id: string; type: string }[];
  consulted: { id: string; type: string }[];
  informed: { id: string; type: string }[];
}

export interface NotificationRule {
  to: string[];
  onBreach?: string;
  action?: string;
  atPercentComplete?: number;
}

export interface Tier {
  name: string;
  maxTimeHours: number;
  notificationRules: NotificationRule[];
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  sequence: number;
  pertTime: PERTValues;
  raci?: RACI;
  displayLabel: string;
  requiredSkills: string[];
  automationOnEntry: any[];
  automationOnExit?: any[];
  systemStatusCategory: string;
  tiers?: Tier[];
}

export interface Transition {
  id: string;
  name: string;
  action: string;
  fromStateId: string | string[];
  toStateId: string;
  trigger: string;
  condition?: { rule: string; type: string; description?: string };
  automation?: any[];
  requiredSkills?: string[];
}

export interface ProcessData {
  id?: string;
  name: string;
  description: string;
  startStateId: string;
  version: string;
  isActive: boolean;
  entityType: string;
  processType: string;
  stages: Stage[];
  transitions: Transition[];
  automationRules: any[];
  initialMetadata: any;
  contextVariables: any;
  organization_id?: string;
}
