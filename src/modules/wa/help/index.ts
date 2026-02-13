/**
 * Help Module - Index
 * 
 * Main export file for the help module
 */

// Import CSS (optional, if migrated)
// import './help.css';

// Types
export type {
    HelpStep,
    HelpTour,
    HelpModuleConfig,
    HelpContextValue,
    HelpRegistryState,
} from './types';

// Provider
export { HelpProvider, useHelp } from './HelpProvider';

// Hooks
export { usePageTour } from './usePageTour';
