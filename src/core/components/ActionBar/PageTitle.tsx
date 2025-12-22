import React from 'react';
import { PageTitleProps } from './types';

/**
 * PageTitle - Displays page title
 * 
 * Responsive behavior:
 * - Desktop: Renders in action bar
 * - Mobile: Title is passed to header via context/store (handled externally)
 * 
 * Usage:
 * ```tsx
 * <PageTitle title="Accounts" description="Manage your accounts" />
 * ```
 */
export const PageTitle: React.FC<PageTitleProps> = ({
    title,
    description,
    icon
}) => {
    return (
        <div className="action-bar-title">
            <div className="flex items-center gap-2">
                {icon && <span className="title-icon">{icon}</span>}
                <h1 className="page-title">{title}</h1>
            </div>
            {description && (
                <p className="page-description">{description}</p>
            )}
        </div>
    );
};

export default PageTitle;
