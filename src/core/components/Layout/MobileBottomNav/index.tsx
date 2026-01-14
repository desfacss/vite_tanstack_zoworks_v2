import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/core/lib/store';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BottomNavItem {
    key: string;
    path: string;
    icon: LucideIcon;
    label: string;
}

/**
 * Mobile Bottom Navigation Bar
 * Shows configurable navigation items as a fixed bottom tab bar.
 * Reads preferences from store (enabled toggle + selected items).
 */
export const MobileBottomNav: React.FC = () => {
    const location = useLocation();
    const { navigationItems, mobilePreferences } = useAuthStore();

    // Check if bottom nav is enabled
    if (!mobilePreferences?.bottomNavEnabled) {
        return null;
    }

    // Get all flat navigation items (including children)
    const allNavItems = navigationItems.reduce((acc: any[], item) => {
        if (item.children) {
            return [...acc, ...item.children];
        }
        return [...acc, item];
    }, []);

    // Build bottom nav items based on preferences or fallback to first 5
    let selectedItems: any[];

    if (mobilePreferences?.bottomNavItems?.length > 0) {
        // Use user-selected items in order
        selectedItems = mobilePreferences.bottomNavItems
            .map(key => allNavItems.find(item => item.key === key))
            .filter(Boolean)
            .slice(0, 5);
    } else {
        // Fallback: auto-select first 5 items
        selectedItems = allNavItems.slice(0, 5);
    }

    const bottomNavItems: BottomNavItem[] = selectedItems.map((item) => {
        // Get icon from lucide-react dynamically or fallback to Circle
        const iconName = item.iconName || 'Circle';
        const Icon = (LucideIcons as any)[iconName] || LucideIcons.Circle;

        return {
            key: item.key,
            path: item.key,
            icon: Icon,
            label: typeof item.label === 'string' ? item.label : item.key.split('/').pop() || 'Nav',
        };
    });

    if (bottomNavItems.length === 0) return null;

    return (
        <nav className="mobile-bottom-nav">
            {bottomNavItems.map((item) => {
                const isActive = location.pathname === item.path ||
                    location.pathname.startsWith(item.path + '/');
                const Icon = item.icon;

                return (
                    <Link
                        key={item.key}
                        to={item.path}
                        className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};
