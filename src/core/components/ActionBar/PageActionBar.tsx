import React, { ReactNode } from 'react';
import { PageActionBarProps } from './types';

/**
 * PageActionBar - Container for the page action bar
 * 
 * Usage:
 * ```tsx
 * <PageActionBar>
 *   <ActionBarLeft>
 *     <PageTitle title="Accounts" />
 *   </ActionBarLeft>
 *   <ActionBarRight>
 *     <PrimaryAction label="Add" onClick={handleAdd} />
 *   </ActionBarRight>
 * </PageActionBar>
 * ```
 */
export const PageActionBar: React.FC<PageActionBarProps> = ({ children, className = '' }) => {
    return (
        <div className={`page-header ${className}`}>
            <div className="action-bar">
                {children}
            </div>
        </div>
    );
};

/**
 * ActionBarLeft - Container for left-aligned action bar content
 * Contains: Title/Tabs, Filters
 */
export const ActionBarLeft: React.FC<{ children: ReactNode; className?: string }> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`action-bar-left flex items-center gap-3 ${className}`}>
            {children}
        </div>
    );
};

/**
 * ActionBarRight - Container for right-aligned action bar content
 * Contains: Primary Action, View Toggle, More Menu
 */
export const ActionBarRight: React.FC<{ children: ReactNode; className?: string }> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`action-bar-right flex items-center gap-2 ${className}`}>
            {children}
        </div>
    );
};

export default PageActionBar;
