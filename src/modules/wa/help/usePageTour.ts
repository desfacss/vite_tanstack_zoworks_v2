/**
 * Help Module - usePageTour Hook
 * 
 * Hook for registering page-specific tours
 * Automatically registers/unregisters when component mounts/unmounts
 */

import { useEffect } from 'react';
import { useHelp } from './HelpProvider';
import type { HelpTour } from './types';

type UsePageTourOptions = {
    // Auto-start on first visit (if not completed)
    autoStart?: boolean;
    // Delay before auto-start (ms)
    autoStartDelay?: number;
};

/**
 * Register a tour for the current page/component
 * 
 * @example
 * ```tsx
 * const ContactsPage = () => {
 *   usePageTour(contactsTour, { autoStart: true });
 *   return <div>...</div>;
 * };
 * ```
 */
export const usePageTour = (tour: HelpTour, options: UsePageTourOptions = {}) => {
    const { autoStart = false, autoStartDelay = 500 } = options;
    const { registerTour, unregisterTour, startTour, isTourCompleted, isEnabled } = useHelp();

    useEffect(() => {
        // Register the tour
        console.log('[Help] Registering tour:', tour.id);
        registerTour(tour);

        // Auto-start if enabled and not completed
        if (autoStart && isEnabled && !isTourCompleted(tour.id)) {
            const timer = setTimeout(() => {
                startTour(tour.id);
            }, autoStartDelay);
            return () => {
                clearTimeout(timer);
                unregisterTour(tour.id);
            };
        }

        return () => {
            console.log('[Help] Unregistering tour:', tour.id);
            unregisterTour(tour.id);
        };
    }, [tour.id]); // Only depend on tour ID to avoid unnecessary re-registers

    return {
        startTour: () => {
            console.log('[Help] Starting tour:', tour.id);
            startTour(tour.id);
        },
        isCompleted: isTourCompleted(tour.id),
    };
};

export default usePageTour;
