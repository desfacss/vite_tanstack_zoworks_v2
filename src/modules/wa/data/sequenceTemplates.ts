
export const SEQUENCE_TEMPLATES = [
    // --- E-COMMERCE ---
    {
        id: 'abandoned-cart',
        name: '🛒 Abandoned Cart Recovery',
        description: 'Recover lost sales by sending a reminder 1 hour and 24 hours after cart abandonment.',
        category: 'E-Commerce',
        trigger: 'cart_abandoned',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Cart Abandoned' } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 100 }, data: { label: 'Wait 1 Hour', delayHours: 1 } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 200 }, data: { label: 'Friendly Reminder', content: { text: 'Hi {{name}}, you left something great in your cart! 🛒 Complete your order now: {{link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 300 }, data: { label: 'Wait 24 Hours', delayHours: 24 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 400 }, data: { label: 'Discount Offer', content: { text: 'Still thinking about it? Use code SAVE10 for 10% off! Expires soon. {{link}}' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'delay-1' },
            { id: 'e2', source: 'delay-1', target: 'msg-1' },
            { id: 'e3', source: 'msg-1', target: 'delay-2' },
            { id: 'e4', source: 'delay-2', target: 'msg-2' },
        ],
    },
    {
        id: 'post-purchase-review',
        name: '⭐ Post-Purchase Review',
        description: 'Ask for a review 24 hours after delivery and suggest related products later.',
        category: 'E-Commerce',
        trigger: 'order_delivered',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Order Delivered' } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 100 }, data: { label: 'Wait 24 Hours', delayHours: 24 } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 200 }, data: { label: 'Review Request', content: { text: 'Hi {{name}}, we hope you love your order! Would you mind leaving a quick review? {{review_link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 300 }, data: { label: 'Wait 3 Days', delayHours: 72 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 400 }, data: { label: 'Cross-Sell', content: { text: 'Since you bought {{product}}, you might also like these accessories! {{link}}' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'delay-1' },
            { id: 'e2', source: 'delay-1', target: 'msg-1' },
            { id: 'e3', source: 'msg-1', target: 'delay-2' },
            { id: 'e4', source: 'delay-2', target: 'msg-2' },
        ],
    },
    {
        id: 'smart-review-escalation',
        name: '⭐ Smart Review & Support (Branched)',
        description: 'Advanced flow that asks for feedback and branches into Review Request or Support Escalation based on customer rating.',
        category: 'E-Commerce',
        trigger: 'order_delivered',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 400, y: 0 }, data: { label: 'Order Delivered' } },
            { id: 'delay-1', type: 'delay', position: { x: 400, y: 100 }, data: { label: 'Wait 24 Hours', delayHours: 24 } },
            {
                id: 'feedback-msg',
                type: 'message',
                position: { x: 400, y: 200 },
                data: {
                    label: 'Ask for Rating',
                    content: {
                        template_name: 'feedback_request'
                    }
                }
            },
            {
                id: 'review-request',
                type: 'message',
                position: { x: 200, y: 400 },
                data: {
                    label: 'Review Request',
                    content: {
                        text: 'We are so happy! Please leave a review here: {{link}}',
                        trigger_payload: 'Excellent',
                        button_text: 'Excellent ⭐⭐⭐⭐⭐'
                    }
                }
            },
            {
                id: 'support-escalation',
                type: 'message',
                position: { x: 600, y: 400 },
                data: {
                    label: 'Support Escalation',
                    content: {
                        text: 'We are sorry! A human agent will contact you shortly to make it right.',
                        trigger_payload: 'Poor',
                        button_text: 'Poor ⭐'
                    }
                }
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'delay-1' },
            { id: 'e2', source: 'delay-1', target: 'feedback-msg' },
            { id: 'e-excellent', source: 'feedback-msg', target: 'review-request' },
            { id: 'e-poor', source: 'feedback-msg', target: 'support-escalation' },
        ],
    },

    // --- REAL ESTATE ---
    {
        id: 'new-lead-nurture',
        name: '🏠 New Lead Nurture',
        description: 'Welcome new leads and showcase properties over a few days.',
        category: 'Real Estate',
        trigger: 'lead_created',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'New Lead' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Welcome', content: { text: 'Hi {{name}}, thanks for your interest! I\'m here to help you find your dream home.' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait 1 Day', delayHours: 24 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Property Showcase', content: { text: 'Check out these new listings that match your criteria: {{link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 400 }, data: { label: 'Wait 2 Days', delayHours: 48 } },
            { id: 'msg-3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Agent Intro', content: { text: 'Would you like to schedule a viewing this weekend? Let me know!' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
            { id: 'e4', source: 'msg-2', target: 'delay-2' },
            { id: 'e5', source: 'delay-2', target: 'msg-3' },
        ],
    },
    {
        id: 'open-house-invite',
        name: '🔑 Open House Invite',
        description: 'Invite interested leads to an open house and send a reminder.',
        category: 'Real Estate',
        trigger: 'tag_added',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Tag: Interested' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Invitation', content: { text: 'Hi {{name}}, we are hosting an open house at {{address}} this Sunday! Hope to see you there.' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait 2 Days', delayHours: 48 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Reminder', content: { text: 'Just a reminder about the open house tomorrow at 2 PM! 🏠' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
        ],
    },

    // --- SERVICES ---
    {
        id: 'appointment-prep',
        name: '📅 Appointment Prep',
        description: 'Confirm appointment, send reminders, and ask for feedback.',
        category: 'Services',
        trigger: 'appointment_booked',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Appointment Booked' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Confirmation', content: { text: 'Your appointment is confirmed for {{date}} at {{time}}.' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait until 24h before', delayHours: 0 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Reminder', content: { text: 'Reminder: Your appointment is tomorrow! Please arrive 10 mins early.' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 400 }, data: { label: 'Wait 2 Hours After', delayHours: 26 } },
            { id: 'msg-3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Feedback', content: { text: 'How was your visit today? We\'d love your feedback!' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
            { id: 'e4', source: 'msg-2', target: 'delay-2' },
            { id: 'e5', source: 'delay-2', target: 'msg-3' },
        ],
    },
    {
        id: 'rebooking-reminder',
        name: '✂️ Rebooking Reminder',
        description: 'Remind clients to book their next appointment after 30 days.',
        category: 'Services',
        trigger: 'appointment_completed',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Appointment Done' } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 100 }, data: { label: 'Wait 30 Days', delayHours: 720 } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 200 }, data: { label: 'Rebook Nudge', content: { text: 'Hi {{name}}, it\'s been a while! Ready for your next appointment? Book here: {{link}}' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'delay-1' },
            { id: 'e2', source: 'delay-1', target: 'msg-1' },
        ],
    },

    // --- EDUCATION ---
    {
        id: 'webinar-countdown',
        name: '🎓 Webinar Countdown',
        description: 'Drive attendance with a countdown series.',
        category: 'Education',
        trigger: 'webinar_registered',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Registered' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Confirmation', content: { text: 'You are registered for the webinar! Add to calendar: {{link}}' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait until 1h before', delayHours: 0 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Starting Soon', content: { text: 'We start in 1 hour! Join here: {{link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 400 }, data: { label: 'Wait 24 Hours', delayHours: 24 } },
            { id: 'msg-3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Replay', content: { text: 'Missed it? Watch the replay here: {{link}}' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
            { id: 'e4', source: 'msg-2', target: 'delay-2' },
            { id: 'e5', source: 'delay-2', target: 'msg-3' },
        ],
    },

    // --- B2B / GENERAL ---
    {
        id: 'consultation-followup',
        name: '🤝 Consultation Follow-up',
        description: 'Nurture prospects after a meeting.',
        category: 'B2B',
        trigger: 'meeting_completed',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Meeting Done' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Thank You', content: { text: 'Great meeting you, {{name}}! Here is a summary of what we discussed.' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait 2 Days', delayHours: 48 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Case Study', content: { text: 'Thought you might find this case study interesting: {{link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 400 }, data: { label: 'Wait 3 Days', delayHours: 72 } },
            { id: 'msg-3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Closing', content: { text: 'Any other questions? Ready to get started?' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
            { id: 'e4', source: 'msg-2', target: 'delay-2' },
            { id: 'e5', source: 'delay-2', target: 'msg-3' },
        ],
    },
    {
        id: 'inactive-winback',
        name: '💔 Inactive Win-back',
        description: 'Re-engage customers who haven\'t purchased in a while.',
        category: 'Marketing',
        trigger: 'tag_added',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Tag: Inactive' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'We Miss You', content: { text: 'Hi {{name}}, we miss you! Here is a special 20% off coupon just for you: COMEBACK20' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait 3 Days', delayHours: 72 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Last Chance', content: { text: 'Your coupon expires tomorrow! Don\'t miss out.' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
        ],
    },
    {
        id: 'onboarding-series',
        name: '🚀 Onboarding Series',
        description: 'Guide new users through your product or service.',
        category: 'General',
        trigger: 'account_created',
        nodes: [
            { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'Account Created' } },
            { id: 'msg-1', type: 'message', position: { x: 250, y: 100 }, data: { label: 'Welcome', content: { text: 'Welcome to the family, {{name}}! We are excited to have you.' } } },
            { id: 'delay-1', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Wait 1 Day', delayHours: 24 } },
            { id: 'msg-2', type: 'message', position: { x: 250, y: 300 }, data: { label: 'Feature Highlight', content: { text: 'Did you know you can do X? Check out this tutorial: {{link}}' } } },
            { id: 'delay-2', type: 'delay', position: { x: 250, y: 400 }, data: { label: 'Wait 2 Days', delayHours: 48 } },
            { id: 'msg-3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Pro Tips', content: { text: 'Here are 3 pro tips to get the most out of your account.' } } },
        ],
        edges: [
            { id: 'e1', source: 'trigger', target: 'msg-1' },
            { id: 'e2', source: 'msg-1', target: 'delay-1' },
            { id: 'e3', source: 'delay-1', target: 'msg-2' },
            { id: 'e4', source: 'msg-2', target: 'delay-2' },
            { id: 'e5', source: 'delay-2', target: 'msg-3' },
        ],
    },
];