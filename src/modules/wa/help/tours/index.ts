/**
 * Help Tours - Main Index
 * 
 * CURRENT: Workflow-level tours (feature/goal-based)
 */

// ============================================================================
// WORKFLOW-LEVEL TOURS (CURRENT APPROACH)
// ============================================================================

export {
    // Onboarding
    welcomeTour,
    whatsappSetupTour,

    // Messaging
    respondToCustomersTour,
    useTemplatesTour,

    // Automation
    createAutomationTour,

    // Team
    inviteTeamTour,

    // Grouped exports
    ONBOARDING_TOURS,
    MESSAGING_TOURS,
    AUTOMATION_TOURS,
    TEAM_TOURS,
    ALL_WORKFLOW_TOURS,
} from './workflows.tour';

// ============================================================================
// ALIASES FOR BACKWARD COMPATIBILITY
// ============================================================================

// These aliases allow existing page imports to continue working
// They map old page-specific tour names to new workflow tours

import {
    welcomeTour as _welcome,
    whatsappSetupTour as _waSetup,
    respondToCustomersTour as _respond,
    useTemplatesTour as _templates,
    createAutomationTour as _automation,
} from './workflows.tour';

// Alias mapping: Old name → New workflow tour
export const inboxTour = _respond;           // Inbox → Respond to Customers
export const contactsTour = _welcome;        // Contacts → Welcome (covers navigation)
export const sequencesTour = _automation;    // Sequences → Create Automation
export const libraryTour = _templates;       // Library → Use Templates
export const settingsTour = _waSetup;        // Settings → WhatsApp Setup
export const catalogTour = _welcome;         // Catalog → Welcome
export const analyticsTour = _welcome;       // Analytics → Welcome

// ============================================================================
// TYPE RE-EXPORTS
// ============================================================================

export type { HelpTour, HelpStep } from '../types';
