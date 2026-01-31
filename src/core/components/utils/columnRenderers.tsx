/**
 * Reusable Column Renderers for Ant Design Tables
 * 
 * These renderers automatically format and highlight data types like:
 * - Currency values
 * - Dates (with relative time)
 * - Percentages (with progress bars)
 * - Status/Stage tags (color-coded)
 * -  Priority indicators
 * - Email links
 * - Boolean values
 * 
 * Usage: Import getAutoRenderer in DynamicTableView to auto-apply based on column name/type
 */

import React from 'react';
import { Tag, Tooltip, Progress } from 'antd';
import {
    DollarSign,
    Calendar,
    Mail,
    CheckCircle,
    XCircle,
    Phone,
    User,
    Building,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ============================================
// CURRENCY RENDERER
// ============================================
export const currencyRenderer = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;

    return (
        <span className="font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-500" />
            <span>{numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </span>
    );
};

// Large currency (for deal values, revenue, etc.)
export const largeCurrencyRenderer = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;

    // Format as K, M, B for large numbers
    let formatted: string;
    if (numValue >= 1_000_000_000) {
        formatted = `${(numValue / 1_000_000_000).toFixed(1)}B`;
    } else if (numValue >= 1_000_000) {
        formatted = `${(numValue / 1_000_000).toFixed(1)}M`;
    } else if (numValue >= 1_000) {
        formatted = `${(numValue / 1_000).toFixed(1)}K`;
    } else {
        formatted = numValue.toLocaleString();
    }

    return (
        <Tooltip title={`$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
            <span className="font-bold text-foreground flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-500" />
                <span>{formatted}</span>
            </span>
        </Tooltip>
    );
};

// ============================================
// DATE RENDERERS
// ============================================
export const dateRenderer = (value: string | Date | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    const date = dayjs(value);
    if (!date.isValid()) return <span className="text-muted-foreground">-</span>;

    return (
        <Tooltip title={date.format('MMM D, YYYY h:mm A')}>
            <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar size={12} className="opacity-60" />
                <span>{date.fromNow()}</span>
            </span>
        </Tooltip>
    );
};

export const dateOnlyRenderer = (value: string | Date | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    const date = dayjs(value);
    if (!date.isValid()) return <span className="text-muted-foreground">-</span>;

    return (
        <span className="text-foreground">
            {date.format('MMM D, YYYY')}
        </span>
    );
};

// ============================================
// PERCENTAGE RENDERER
// ============================================
export const percentRenderer = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;

    // Determine color based on value
    let strokeColor: string;
    if (numValue >= 70) strokeColor = '#10b981'; // green
    else if (numValue >= 40) strokeColor = '#f59e0b'; // amber
    else strokeColor = '#ef4444'; // red

    return (
        <div className="flex items-center gap-2 min-w-[80px]">
            <Progress
                percent={numValue}
                size="small"
                showInfo={false}
                strokeColor={strokeColor}
                trailColor="hsl(var(--secondary))"
                className="flex-1 max-w-[60px]"
            />
            <span className="text-xs font-medium text-muted-foreground w-8">{numValue}%</span>
        </div>
    );
};

// ============================================
// STATUS / STAGE RENDERER
// ============================================
const stageColorMap: Record<string, string> = {
    // Deal stages
    lead: 'blue',
    qualified: 'cyan',
    negotiation: 'cyan',
    proposal: 'orange',
    won: 'green',
    closed: 'green',
    lost: 'red',
    churned: 'red',

    // Contact status
    active: 'green',
    inactive: 'default',
    prospect: 'blue',
    customer: 'green',
    partner: 'purple',

    // Recruitment stages
    applied: 'blue',
    screening: 'cyan',
    interview: 'orange',
    'interview completed': 'purple',
    'interview_completed': 'purple',
    shortlisted: 'green',
    offered: 'green',
    hired: 'green',
    onboarding: 'blue',

    // General
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    draft: 'default',
    published: 'green',
    archived: 'default',

    // Task status
    todo: 'default',
    'in progress': 'blue',
    'in-progress': 'blue',
    inprogress: 'blue',
    done: 'green',
    completed: 'green',
    cancelled: 'red',
};

export const statusRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    const normalizedValue = value.toLowerCase().trim();
    const color = stageColorMap[normalizedValue] || 'default';

    return (
        <Tag
            color={color}
            className="text-xs font-medium uppercase tracking-wide m-0"
        >
            {value}
        </Tag>
    );
};

// ============================================
// PRIORITY RENDERER
// ============================================
const priorityConfig: Record<string, { color: string; bgColor: string; icon?: React.ReactNode }> = {
    high: {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        icon: <TrendingUp size={12} />
    },
    medium: {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        icon: <Minus size={12} />
    },
    low: {
        color: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-50 dark:bg-slate-900/30',
        icon: <TrendingDown size={12} />
    },
    urgent: {
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-950/50',
        icon: <TrendingUp size={12} />
    },
    critical: {
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-950/50',
        icon: <TrendingUp size={12} />
    },
};

export const priorityRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    const normalizedValue = value.toLowerCase().trim();
    const config = priorityConfig[normalizedValue] || { color: 'text-muted-foreground', bgColor: 'bg-secondary' };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color} ${config.bgColor}`}>
            {config.icon}
            <span className="capitalize">{value}</span>
        </span>
    );
};

// ============================================
// EMAIL RENDERER
// ============================================
export const emailRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    return (
        <a
            href={`mailto:${value}`}
            className="text-primary hover:underline flex items-center gap-1.5 text-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <Mail size={12} className="opacity-60" />
            <span className="truncate max-w-[200px]">{value}</span>
        </a>
    );
};

// ============================================
// PHONE RENDERER
// ============================================
export const phoneRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    return (
        <a
            href={`tel:${value}`}
            className="text-foreground hover:text-primary flex items-center gap-1.5 text-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <Phone size={12} className="opacity-60" />
            <span>{value}</span>
        </a>
    );
};

// ============================================
// BOOLEAN RENDERER
// ============================================
export const booleanRenderer = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;

    return value ? (
        <CheckCircle size={16} className="text-emerald-500" />
    ) : (
        <XCircle size={16} className="text-muted-foreground" />
    );
};

// ============================================
// USER/PERSON RENDERER
// ============================================
export const userRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    return (
        <span className="flex items-center gap-1.5 text-sm">
            <User size={12} className="text-muted-foreground" />
            <span className="truncate">{value}</span>
        </span>
    );
};

// ============================================
// COMPANY RENDERER
// ============================================
export const companyRenderer = (value: string | null | undefined) => {
    if (!value) return <span className="text-muted-foreground">-</span>;

    return (
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Building size={12} className="text-muted-foreground" />
            <span className="truncate">{value}</span>
        </span>
    );
};

// ============================================
// NUMBER RENDERER (plain numbers)
// ============================================
export const numberRenderer = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return <span className="text-muted-foreground">{value}</span>;

    return (
        <span className="font-medium text-foreground tabular-nums">
            {numValue.toLocaleString()}
        </span>
    );
};

// ============================================
// AUTO-DETECT RENDERER BASED ON COLUMN NAME
// ============================================
export const getAutoRenderer = (columnName: string, dataType?: string) => {
    const name = columnName.toLowerCase();

    // Currency patterns
    if (name.includes('value') || name.includes('amount') || name.includes('price') ||
        name.includes('revenue') || name.includes('cost') || name.includes('budget') ||
        name.includes('total') || name.includes('salary')) {
        return currencyRenderer;
    }

    // Email patterns
    if (name.includes('email') || name === 'mail') {
        return emailRenderer;
    }

    // Phone patterns
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) {
        return phoneRenderer;
    }

    // Status/Stage patterns
    if (name.includes('stage') || name === 'status' || name.includes('state')) {
        return statusRenderer;
    }

    // Priority patterns
    if (name.includes('priority') || name.includes('urgency') || name.includes('importance')) {
        return priorityRenderer;
    }

    // Percentage patterns
    if (name.includes('percent') || name.includes('probability') || name.includes('rate') ||
        name.includes('progress') || name.includes('completion')) {
        return percentRenderer;
    }

    // Date patterns
    if (name.endsWith('_at') || name.endsWith('_date') || name.includes('created') ||
        name.includes('updated') || name.includes('date') || name === 'timestamp') {
        return dateRenderer;
    }

    // Company patterns
    if (name === 'company' || name.includes('company_name') || name === 'organization') {
        return companyRenderer;
    }

    // User/Assignee patterns
    if (name.includes('assigned') || name.includes('owner') || name.includes('assignee') ||
        name.includes('user_name') || name.includes('created_by') || name.includes('updated_by')) {
        return userRenderer;
    }

    // Boolean patterns (by data type)
    if (dataType === 'boolean' || name.startsWith('is_') || name.startsWith('has_') ||
        name.startsWith('can_') || name === 'enabled' || name === 'active') {
        return booleanRenderer;
    }

    // Number patterns
    if (dataType === 'integer' || dataType === 'bigint' || dataType === 'numeric' ||
        dataType === 'real' || dataType === 'double precision') {
        return numberRenderer;
    }

    // No special renderer - return undefined for default text rendering
    return undefined;
};

export default {
    currencyRenderer,
    largeCurrencyRenderer,
    dateRenderer,
    dateOnlyRenderer,
    percentRenderer,
    statusRenderer,
    priorityRenderer,
    emailRenderer,
    phoneRenderer,
    booleanRenderer,
    userRenderer,
    companyRenderer,
    numberRenderer,
    getAutoRenderer,
};
