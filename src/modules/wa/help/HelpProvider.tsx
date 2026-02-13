/**
 * Help Module - Provider Context
 * 
 * Main context provider that manages the help system state
 * Standalone and reusable across applications
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { HelpContextValue, HelpModuleConfig, HelpTour, HelpStep, HelpRegistryState } from './types';

// Default configuration
const DEFAULT_CONFIG: HelpModuleConfig = {
    enabled: true,
    showOnFirstVisit: false,
    storageKeyPrefix: 'help_module_',
    driverConfig: {
        animate: true,
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        stagePadding: 10,
        stageRadius: 8,
        popoverClass: 'help-popover',
    },
};

// Check if mobile
const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
};

// Create context
const HelpContext = createContext<HelpContextValue | null>(null);

// Storage helpers
const getStorageKey = (prefix: string, key: string) => `${prefix}${key}`;

const getCompletedTours = (prefix: string): Set<string> => {
    try {
        const stored = localStorage.getItem(getStorageKey(prefix, 'completed'));
        return new Set(stored ? JSON.parse(stored) : []);
    } catch {
        return new Set();
    }
};

const saveCompletedTours = (prefix: string, completed: Set<string>) => {
    try {
        localStorage.setItem(getStorageKey(prefix, 'completed'), JSON.stringify([...completed]));
    } catch {
        // Storage not available
    }
};

const getHelpEnabled = (prefix: string): boolean => {
    try {
        const stored = localStorage.getItem(getStorageKey(prefix, 'enabled'));
        return stored === null ? true : stored === 'true';
    } catch {
        return true;
    }
};

const saveHelpEnabled = (prefix: string, enabled: boolean) => {
    try {
        localStorage.setItem(getStorageKey(prefix, 'enabled'), String(enabled));
    } catch {
        // Storage not available
    }
};

interface HelpProviderProps {
    children: React.ReactNode;
    config?: Partial<HelpModuleConfig>;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children, config: userConfig }) => {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const driverRef = useRef<Driver | null>(null);
    const navigate = useNavigate();

    // State
    const [state, setState] = useState<HelpRegistryState>({
        tours: new Map(),
        enabledFeatures: new Set(),
        completedTours: getCompletedTours(config.storageKeyPrefix),
        isRunning: false,
        currentTourId: null,
    });

    const [isEnabled, setIsEnabled] = useState(() => getHelpEnabled(config.storageKeyPrefix));

    // Helper to wait for element
    const waitForElement = (selector: string): Promise<void> => {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve();
            }
            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            // Timeout fallback
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 5000);
        });
    };

    // Convert HelpStep to driver.js step with responsive handling
    const convertSteps = useCallback((steps: HelpStep[]): any[] => {
        const isMobile = isMobileDevice();

        // Filter valid steps
        const validSteps = steps.filter(step => {
            if (isMobile && step.skipOnMobile) return false;
            if (!isMobile && step.skipOnDesktop) return false;
            // Keep if route is defined OR element exists
            if (step.route) return true;
            return document.querySelector(step.element) !== null;
        });

        return validSteps.map((step, index) => {
            const nextStep = validSteps[index + 1];
            const driverStep: any = {
                element: step.element,
                popover: {
                    title: isMobile && step.mobileTitle ? step.mobileTitle : step.title,
                    description: isMobile && step.mobileDescription ? step.mobileDescription : step.description,
                    side: isMobile && step.mobileSide ? step.mobileSide : step.side || 'bottom',
                    align: step.align || 'center',
                },
            };

            // Handle navigation on Next
            if (nextStep && nextStep.route) {
                driverStep.popover.onNextClick = async () => {
                    if (window.location.pathname !== nextStep.route) {
                        navigate(nextStep.route!);
                        await waitForElement(nextStep.element);
                    }
                    driverRef.current?.moveNext();
                };
            }

            return driverStep;
        });
    }, [navigate]);

    // Register a tour
    const registerTour = useCallback((tour: HelpTour) => {
        setState(prev => {
            const newTours = new Map(prev.tours);
            newTours.set(tour.id, tour);
            return { ...prev, tours: newTours };
        });
    }, []);

    // Unregister a tour
    const unregisterTour = useCallback((tourId: string) => {
        setState(prev => {
            const newTours = new Map(prev.tours);
            newTours.delete(tourId);
            return { ...prev, tours: newTours };
        });
    }, []);

    // Start a tour
    const startTour = useCallback(async (tourId: string) => {
        console.log('[Help] startTour called:', tourId, 'isEnabled:', isEnabled);

        if (!isEnabled) {
            console.log('[Help] Help is disabled, not starting tour');
            return;
        }

        const tour = state.tours.get(tourId);
        if (!tour) {
            console.warn(`[Help] Tour "${tourId}" not found in registry. Available:`, [...state.tours.keys()]);
            return;
        }

        // Check first step route and navigate if needed
        const isMobile = isMobileDevice();
        const firstValidStep = tour.steps.find(step => {
            if (isMobile && step.skipOnMobile) return false;
            if (!isMobile && step.skipOnDesktop) return false;
            return true;
        });

        if (firstValidStep && firstValidStep.route && window.location.pathname !== firstValidStep.route) {
            console.log(`[Help] Navigating to start tour: ${firstValidStep.route}`);
            navigate(firstValidStep.route);
            await waitForElement(firstValidStep.element);
        }

        const steps = convertSteps(tour.steps);
        console.log('[Help] Converted steps:', steps.length, 'from', tour.steps.length);

        if (steps.length === 0) {
            console.warn(`[Help] No visible steps for tour "${tourId}". Check if elements exist.`);
            return;
        }

        console.log('[Help] Creating driver with steps:', steps);

        // Create driver instance
        driverRef.current = driver({
            ...config.driverConfig,
            steps,
            onDestroyStarted: () => {
                const completed = driverRef.current?.hasNextStep() === false;

                if (completed) {
                    setState(prev => {
                        const newCompleted = new Set(prev.completedTours);
                        newCompleted.add(tourId);
                        saveCompletedTours(config.storageKeyPrefix, newCompleted);
                        return { ...prev, completedTours: newCompleted, isRunning: false, currentTourId: null };
                    });
                } else {
                    setState(prev => ({ ...prev, isRunning: false, currentTourId: null }));
                }

                config.onTourEnd?.(tourId, completed);
                driverRef.current?.destroy();
            },
        });

        setState(prev => ({ ...prev, isRunning: true, currentTourId: tourId }));
        config.onTourStart?.(tourId);
        console.log('[Help] Calling driverRef.current.drive()');
        driverRef.current.drive();
    }, [isEnabled, state.tours, convertSteps, config, navigate]);

    // Stop current tour
    const stopTour = useCallback(() => {
        if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
        }
        setState(prev => ({ ...prev, isRunning: false, currentTourId: null }));
    }, []);

    // Check if tour is completed
    const isTourCompleted = useCallback((tourId: string) => {
        return state.completedTours.has(tourId);
    }, [state.completedTours]);

    // Reset a specific tour
    const resetTour = useCallback((tourId: string) => {
        setState(prev => {
            const newCompleted = new Set(prev.completedTours);
            newCompleted.delete(tourId);
            saveCompletedTours(config.storageKeyPrefix, newCompleted);
            return { ...prev, completedTours: newCompleted };
        });
    }, [config.storageKeyPrefix]);

    // Reset all tours
    const resetAllTours = useCallback(() => {
        setState(prev => {
            const newCompleted = new Set<string>();
            saveCompletedTours(config.storageKeyPrefix, newCompleted);
            return { ...prev, completedTours: newCompleted };
        });
    }, [config.storageKeyPrefix]);

    // Set feature enabled
    const setFeatureEnabled = useCallback((feature: string, enabled: boolean) => {
        setState(prev => {
            const newFeatures = new Set(prev.enabledFeatures);
            if (enabled) {
                newFeatures.add(feature);
            } else {
                newFeatures.delete(feature);
            }
            return { ...prev, enabledFeatures: newFeatures };
        });
    }, []);

    // Check if feature is enabled
    const isFeatureEnabled = useCallback((feature: string) => {
        return state.enabledFeatures.has(feature);
    }, [state.enabledFeatures]);

    // Get available tours for current path/features
    const getAvailableTours = useCallback((currentPath?: string) => {
        return Array.from(state.tours.values()).filter(tour => {
            // Check page match
            if (tour.pages && currentPath) {
                const pageMatch = tour.pages.some(page =>
                    currentPath === page || currentPath.startsWith(page)
                );
                if (!pageMatch) return false;
            }

            // Check required features
            if (tour.requiredFeatures) {
                const featuresEnabled = tour.requiredFeatures.every(f => state.enabledFeatures.has(f));
                if (!featuresEnabled) return false;
            }

            return true;
        });
    }, [state.tours, state.enabledFeatures]);

    // Global toggle
    const setEnabled = useCallback((enabled: boolean) => {
        setIsEnabled(enabled);
        saveHelpEnabled(config.storageKeyPrefix, enabled);
        if (!enabled) {
            stopTour();
        }
    }, [config.storageKeyPrefix, stopTour]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (driverRef.current) {
                driverRef.current.destroy();
            }
        };
    }, []);

    const value: HelpContextValue = {
        isEnabled,
        isRunning: state.isRunning,
        currentTourId: state.currentTourId,
        registerTour,
        unregisterTour,
        startTour,
        stopTour,
        isTourCompleted,
        resetTour,
        resetAllTours,
        setFeatureEnabled,
        isFeatureEnabled,
        getAvailableTours,
        setEnabled,
    };

    return (
        <HelpContext.Provider value={value}>
            {children}
        </HelpContext.Provider>
    );
};

// Hook to access help context
export const useHelp = (): HelpContextValue => {
    const context = useContext(HelpContext);
    if (!context) {
        throw new Error('useHelp must be used within a HelpProvider');
    }
    return context;
};

export default HelpProvider;
