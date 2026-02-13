/**
 * WORKFLOW-LEVEL HELP TOURS
 * 
 * This file contains streamlined, user-goal-focused tours organized by workflow.
 * Each tour is 4-6 steps focused on what users want to ACCOMPLISH.
 */

import type { HelpTour } from '../types';

// ============================================================================
// ONBOARDING TOURS (New Users)
// ============================================================================

/**
 * First-time user welcome tour
 * Goal: Understand what this app does and how to get started
 */
export const welcomeTour: HelpTour = {
    id: 'onboarding-welcome',
    name: 'Welcome to the CRM',
    description: 'Quick intro to your WhatsApp business hub',
    pages: ['/', '/inbox'],
    steps: [
        {
            element: '.ant-layout-sider',
            title: 'Welcome! 👋',
            description: 'This is your WhatsApp CRM - manage all customer conversations in one place.',
            mobileDescription: 'Your WhatsApp business hub.',
            side: 'right',
        },
        {
            element: '[href="/inbox"], [href="/"]',
            title: 'Inbox',
            description: 'Your inbox shows all WhatsApp conversations. This is where you\'ll spend most of your time.',
            mobileDescription: 'All your conversations here.',
            side: 'right',
        },
        {
            element: '[href="/contacts"]',
            title: 'Contacts',
            description: 'Store and organize your customer contacts with tags and notes.',
            mobileDescription: 'Your customer directory.',
            side: 'right',
        },
        {
            element: '[href="/library"]',
            title: 'Templates & Quick Replies',
            description: 'Save time with pre-approved WhatsApp templates and quick response shortcuts.',
            mobileDescription: 'Message templates.',
            side: 'right',
        },
        {
            element: '[href="/settings"]',
            title: 'Get Started',
            description: 'Head to Settings to connect your WhatsApp Business account. Let\'s go!',
            mobileDescription: 'Connect WhatsApp here.',
            side: 'right',
        },
    ],
};

/**
 * WhatsApp setup tour
 * Goal: Connect WhatsApp Business account
 */
export const whatsappSetupTour: HelpTour = {
    id: 'onboarding-whatsapp-setup',
    name: 'Connect WhatsApp',
    description: 'Link your WhatsApp Business account',
    pages: ['/settings'],
    steps: [
        {
            element: '[data-tour="whatsapp-section"]',
            title: 'WhatsApp Configuration',
            description: 'Let\'s connect your WhatsApp Business account to start messaging.',
            side: 'top',
            route: '/settings',
        },
        {
            element: '[data-tour="wa-phone-id"]',
            title: 'Step 1: Phone Number ID',
            description: 'Find this in Meta Business Manager → WhatsApp → Phone Numbers.',
            side: 'right',
        },
        {
            element: '[data-tour="wa-business-id"]',
            title: 'Step 2: Business Account ID',
            description: 'Your WABA ID is in Meta Business Manager → WhatsApp → Getting Started.',
            side: 'right',
        },
        {
            element: '[data-tour="wa-token"]',
            title: 'Step 3: Access Token',
            description: 'Create a permanent token in Meta Developers portal. Keep this secret!',
            side: 'right',
        },
        {
            element: '[data-tour="wa-save"]',
            title: 'Save & Connect',
            description: 'Click to save. We\'ll test the connection and you\'re ready to go!',
            side: 'top',
        },
    ],
};

// ============================================================================
// MESSAGING WORKFLOW TOURS (Core Feature)
// ============================================================================

/**
 * How to handle incoming messages
 * Goal: Respond to customers efficiently
 */
export const respondToCustomersTour: HelpTour = {
    id: 'workflow-respond-customers',
    name: 'Responding to Customers',
    description: 'Learn to reply quickly and efficiently',
    pages: ['/', '/inbox'],
    steps: [
        {
            element: '.ant-tabs-nav',
            title: 'Filter Your Inbox',
            description: 'Open = needs response, Waiting = you\'re waiting on customer, Resolved = done.',
            mobileDescription: 'Filter conversations.',
            side: 'bottom',
            route: '/inbox',
        },
        {
            element: '.ant-list',
            title: 'Pick a Conversation',
            description: 'Click any conversation to open it. Newest messages appear first.',
            mobileDescription: 'Tap to open chat.',
            side: 'right',
            mobileSide: 'bottom',
        },
        {
            element: '[data-tour="message-input"]',
            title: 'Type Your Reply',
            description: 'Write your message. Use "/" to insert quick replies or templates.',
            mobileDescription: 'Type message, use / for shortcuts.',
            side: 'top',
        },
        {
            element: '[data-tour="send-button"]',
            title: 'Send Message',
            description: 'Click to send. Messages appear in real-time on customer\'s WhatsApp.',
            mobileDescription: 'Tap to send.',
            side: 'left',
        },
    ],
};

/**
 * Using templates for faster responses
 * Goal: Send pre-approved messages quickly
 */
export const useTemplatesTour: HelpTour = {
    id: 'workflow-use-templates',
    name: 'Using Templates',
    description: 'Send approved messages faster',
    pages: ['/library', '/inbox'],
    steps: [
        {
            element: '[href="/library"]',
            title: 'Templates Library',
            description: 'All your WhatsApp-approved message templates live here.',
            side: 'right',
        },
        {
            element: '.ant-tabs-nav',
            title: 'Template Categories',
            description: 'Templates = WhatsApp approved. Quick Replies = instant responses.',
            side: 'bottom',
            route: '/library',
        },
        {
            element: '[data-tour="primary-action"]',
            title: 'Create New Template',
            description: 'New templates must be approved by Meta (24-48 hours).',
            side: 'left',
            route: '/library',
        },
        {
            element: '[data-tour="message-input"]',
            title: 'Use in Conversation',
            description: 'Type "/" in any chat to quickly insert templates and quick replies.',
            mobileDescription: 'Type / in chat.',
            side: 'top',
            skipOnDesktop: true, // Only show this step if on inbox page
            route: '/inbox',
        },
    ],
};

// ============================================================================
// AUTOMATION WORKFLOW TOURS
// ============================================================================

/**
 * Setting up automated sequences
 * Goal: Create drip campaigns that run automatically
 */
export const createAutomationTour: HelpTour = {
    id: 'workflow-create-automation',
    name: 'Automated Messaging',
    description: 'Set up messages that send automatically',
    pages: ['/sequences'],
    steps: [
        {
            element: '[data-tour="primary-action"]',
            title: 'Create a Sequence',
            description: 'A sequence is a series of messages sent automatically over time.',
            side: 'bottom',
            route: '/sequences',
        },
        {
            element: '.ant-card',
            title: 'Your Sequences',
            description: 'Each card is a sequence. Click to edit, toggle to activate/pause.',
            mobileDescription: 'Tap to edit sequence.',
            side: 'top',
        },
        {
            element: '[data-tour="more-actions"]',
            title: 'More Options',
            description: 'Clone sequences, export data, or access help from here.',
            side: 'bottom',
        },
    ],
};

// ============================================================================
// TEAM COLLABORATION TOUR
// ============================================================================

/**
 * Adding team members
 * Goal: Get teammates on the platform
 */
export const inviteTeamTour: HelpTour = {
    id: 'workflow-invite-team',
    name: 'Add Your Team',
    description: 'Invite colleagues to collaborate',
    pages: ['/settings'],
    steps: [
        {
            element: '[data-tour="team-section"]',
            title: 'Team Management',
            description: 'Add team members so everyone can help with customer conversations.',
            side: 'top',
            route: '/settings',
        },
        {
            element: '[data-tour="team-invite"]',
            title: 'Send Invites',
            description: 'Click to invite by email. They\'ll get a secure signup link.',
            side: 'left',
        },
        {
            element: '[data-tour="team-list"]',
            title: 'Manage Roles',
            description: 'Admin = full access. Agent = conversations only. Viewer = read-only.',
            side: 'top',
        },
    ],
};

// ============================================================================
// EXPORT ALL WORKFLOW TOURS
// ============================================================================

// Organized by user journey
export const ONBOARDING_TOURS = [welcomeTour, whatsappSetupTour];
export const MESSAGING_TOURS = [respondToCustomersTour, useTemplatesTour];
export const AUTOMATION_TOURS = [createAutomationTour];
export const TEAM_TOURS = [inviteTeamTour];

// All tours
export const ALL_WORKFLOW_TOURS = [
    ...ONBOARDING_TOURS,
    ...MESSAGING_TOURS,
    ...AUTOMATION_TOURS,
    ...TEAM_TOURS,
];

// Default export - main tour registry
export default {
    onboarding: ONBOARDING_TOURS,
    messaging: MESSAGING_TOURS,
    automation: AUTOMATION_TOURS,
    team: TEAM_TOURS,
};
