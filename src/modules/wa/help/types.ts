/**
 * Help Module - Types
 * 
 * Standalone, reusable help system using driver.js
 * Can be used in any React application
 */

import type { DriveStep, Config } from 'driver.js';

// Tour step with mobile-responsive options
export interface HelpStep {
    element: string;           // CSS selector
    title: string;
    description: string;
    route?: string;            // Route to navigate to before showing this step
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    // Mobile overrides
    mobileTitle?: string;
    mobileDescription?: string;
    mobileSide?: 'top' | 'right' | 'bottom' | 'left';
    // Skip on mobile if element doesn't exist
    skipOnMobile?: boolean;
    // Skip on desktop if element doesn't exist
    skipOnDesktop?: boolean;
}

// Tour definition for a page/module
export interface HelpTour {
    id: string;                // Unique tour ID
    name: string;              // Display name
    description?: string;      // Tour description
    steps: HelpStep[];
    // Auto-start on first visit
    autoStart?: boolean;
    // Pages/routes where this tour applies
    pages?: string[];
    // Required feature flags to show this tour
    requiredFeatures?: string[];
}

// Help module configuration
export interface HelpModuleConfig {
    // Global on/off switch
    enabled: boolean;
    // Show tour on first visit
    showOnFirstVisit: boolean;
    // Storage key prefix for persistence
    storageKeyPrefix: string;
    // Driver.js config overrides
    driverConfig?: Partial<Config>;
    // Called when tour starts
    onTourStart?: (tourId: string) => void;
    // Called when tour ends
    onTourEnd?: (tourId: string, completed: boolean) => void;
}

// Registry state
export interface HelpRegistryState {
    tours: Map<string, HelpTour>;
    enabledFeatures: Set<string>;
    completedTours: Set<string>;
    isRunning: boolean;
    currentTourId: string | null;
}

// Context value
export interface HelpContextValue {
    // State
    isEnabled: boolean;
    isRunning: boolean;
    currentTourId: string | null;

    // Tour management
    registerTour: (tour: HelpTour) => void;
    unregisterTour: (tourId: string) => void;
    startTour: (tourId: string) => void;
    stopTour: () => void;

    // Progress
    isTourCompleted: (tourId: string) => boolean;
    resetTour: (tourId: string) => void;
    resetAllTours: () => void;

    // Feature flags
    setFeatureEnabled: (feature: string, enabled: boolean) => void;
    isFeatureEnabled: (feature: string) => boolean;

    // Get available tours for current page/features
    getAvailableTours: (currentPath?: string) => HelpTour[];

    // Global toggle
    setEnabled: (enabled: boolean) => void;
}
