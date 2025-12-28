import { TenantThemeConfig } from './ThemeRegistry';

/**
 * Theme Presets - Standardized Configuration
 * 
 * Each preset defines:
 * - borderRadius: 4 (sharp), 8 (standard), 16 (rounded)
 * - light & dark mode colors
 * - Optional feature flags (heroHeader)
 * 
 * When a preset is selected, its colors should override tenant config.
 */
export const THEME_PRESETS: Record<string, Partial<TenantThemeConfig> & { description?: string }> = {
    // Base/Default - Clean, minimal, professional
    base: {
        borderRadius: 8,
        baseFontSize: 14,
        containerPadding: 24,
        description: 'Clean and minimal design',
        light: {
            primaryColor: '#1677ff',
            secondaryColor: '#722ed1',
            cardBg: '#ffffff',
            layoutBg: '#f5f5f5',
            headerBg: '#ffffff',
            siderBg: '#ffffff',
            textColor: '#1f1f1f',
        },
        dark: {
            primaryColor: '#1890ff',
            secondaryColor: '#9254de',
            cardBg: '#1f1f1f',
            layoutBg: '#141414',
            headerBg: '#1f1f1f',
            siderBg: '#1f1f1f',
            textColor: '#ffffff',
        }
    },

    // Glassmorphism - Apple-inspired frosted glass
    glassmorphism: {
        borderRadius: 16,
        baseFontSize: 14,
        containerPadding: 24,
        description: 'Apple-inspired frosted glass',
        light: {
            primaryColor: '#007AFF',
            secondaryColor: '#5856D6',
            cardBg: 'rgba(255, 255, 255, 0.7)',
            layoutBg: '#f5f5f7',
            headerBg: 'rgba(255, 255, 255, 0.8)',
            siderBg: 'rgba(255, 255, 255, 0.8)',
            textColor: '#1d1d1f',
        },
        dark: {
            primaryColor: '#0A84FF',
            secondaryColor: '#5E5CE6',
            cardBg: 'rgba(28, 28, 30, 0.7)',
            layoutBg: '#000000',
            headerBg: 'rgba(28, 28, 30, 0.8)',
            siderBg: 'rgba(28, 28, 30, 0.8)',
            textColor: '#f5f5f7',
        }
    },

    // Corporate - Sharp, professional, enterprise
    corporate: {
        borderRadius: 4,
        baseFontSize: 14,
        containerPadding: 20,
        description: 'Sharp and professional for enterprise',
        light: {
            primaryColor: '#1e40af',
            secondaryColor: '#1e3a8a',
            cardBg: '#ffffff',
            layoutBg: '#f1f5f9',
            headerBg: '#1e40af',
            siderBg: '#0f172a',
            textColor: '#1e293b',
        },
        dark: {
            primaryColor: '#3b82f6',
            secondaryColor: '#2563eb',
            cardBg: '#1e293b',
            layoutBg: '#0f172a',
            headerBg: '#1e3a8a',
            siderBg: '#020617',
            textColor: '#f8fafc',
        }
    },

    // Gradient Card - Modern gradient header
    gradient_card: {
        borderRadius: 16,
        baseFontSize: 14,
        containerPadding: 28,
        heroHeader: true,
        description: 'Bold gradients with hero header',
        light: {
            primaryColor: '#4F46E5',
            secondaryColor: '#10B981',
            cardBg: '#ffffff',
            layoutBg: '#f8fafc',
            headerBg: '#4F46E5',
            siderBg: '#ffffff',
            textColor: '#0f172a',
        },
        dark: {
            primaryColor: '#6366F1',
            secondaryColor: '#34D399',
            cardBg: '#1e293b',
            layoutBg: '#0f172a',
            headerBg: '#312e81',
            siderBg: '#0f172a',
            textColor: '#f8fafc',
        }
    },

    // Neon Tech - Electric, modern, high-impact (with CSS animation layer)
    neon: {
        borderRadius: 8,
        baseFontSize: 16,
        containerPadding: 28,
        preset: 'neon', // Triggers CSS layer in index.css
        description: 'Electric neon with thunder animations',
        light: {
            primaryColor: '#00E599',    // Neon Green
            secondaryColor: '#00E599',  // Standardize to green
            cardBg: '#ffffff',
            layoutBg: '#f8fafb',        // Off-white with subtle warmth
            headerBg: 'rgba(255, 255, 255, 0.85)',  // Frosted glass header
            siderBg: 'rgba(255, 255, 255, 0.9)',   // Frosted glass sidebar
            inputBg: '#ffffff',
            textColor: '#1a1a2e',       // Deep slate for contrast
        },
        dark: {
            primaryColor: '#00E599',    // Neon Green
            secondaryColor: '#00E599',  // Standardize to green for pure neon look
            cardBg: '#0f0f0f',          // Near black card
            layoutBg: '#020202',        // Pitch black layout
            headerBg: '#000000',        // Pure black header
            siderBg: '#000000',         // Pure black sidebar
            inputBg: '#111111',         // Dark input fields
            textColor: '#ffffff',
        }
    },

    // WhatsApp - Authentic WhatsApp design language (inspired by zo_waCRM)
    whatsapp: {
        borderRadius: 8,
        baseFontSize: 14,
        containerPadding: 16,
        preset: 'whatsapp',
        description: 'Authentic WhatsApp design with signature green',
        light: {
            primaryColor: '#25D366',    // WhatsApp Green (signature)
            secondaryColor: '#008069',  // WhatsApp Teal
            cardBg: '#ffffff',
            layoutBg: '#f0f2f5',        // WhatsApp light gray background
            headerBg: '#008069',        // WhatsApp Teal header
            siderBg: '#ffffff',
            inputBg: '#f0f2f5',
            textColor: 'rgba(0, 0, 0, 0.88)',
        },
        dark: {
            primaryColor: '#25D366',    // WhatsApp Green
            secondaryColor: '#00564a',  // WhatsApp Teal Dark
            cardBg: '#1f1f1f',
            layoutBg: '#0b141a',        // WhatsApp dark chat background
            headerBg: '#1f2c34',        // WhatsApp dark header
            siderBg: '#111b21',         // WhatsApp dark sidebar
            inputBg: '#2a3942',         // WhatsApp dark input
            textColor: '#e9edef',
        }
    }
};

// Helper to get preset options for UI
export const getPresetOptions = () =>
    Object.entries(THEME_PRESETS).map(([key, preset]) => ({
        value: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        description: preset.description || '',
    }));
