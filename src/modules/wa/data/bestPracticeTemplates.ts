export interface BestPracticeTemplate {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    components: any[];
    description: string;
    industry: 'E-commerce' | 'Service' | 'General';
}

export const BEST_PRACTICE_TEMPLATES: BestPracticeTemplate[] = [
    // --- UTILITY: ACCOUNT UPDATE ---
    {
        name: 'account_creation_confirmation_1',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'General',
        description: 'Confirm account creation and ask for verification.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Finalize account set-up'
            },
            {
                type: 'BODY',
                text: 'Hi {{1}}, Your new account has been created successfully. Please verify {{2}} to complete your profile.',
                example: { body_text: [['Alex', 'your email']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'Verify account',
                        url: 'https://example.com/verify'
                    }
                ]
            }
        ]
    },
    // --- UTILITY: APPOINTMENT UPDATE ---
    {
        name: 'appointment_confirmation_1',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'Service',
        description: 'Confirm a booked appointment.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Your appointment is booked'
            },
            {
                type: 'BODY',
                text: 'Hello {{1}}, Thank you for booking with {{2}}. Your appointment for {{3}} on {{4}} at {{5}} is confirmed.',
                example: { body_text: [['Sarah', 'Dr. Smith', 'Dental Checkup', 'Monday', '10:00 AM']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'View details',
                        url: 'https://example.com/appointments/{{1}}'
                    }
                ]
            }
        ]
    },
    {
        name: 'appointment_reminder_2',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'Service',
        description: 'Remind a customer about an upcoming appointment.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'You have an upcoming appointment'
            },
            {
                type: 'BODY',
                text: 'Hello {{1}}, This is a reminder about your upcoming appointment with {{2}} on {{3}} at {{4}}. We look forward to seeing you!',
                example: { body_text: [['John', 'Salon Luxe', 'Tomorrow', '2:00 PM']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'View details',
                        url: 'https://example.com/appointments'
                    }
                ]
            }
        ]
    },
    {
        name: 'appointment_cancellation_1',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'Service',
        description: 'Notify a customer of a cancelled appointment.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Your appointment was canceled'
            },
            {
                type: 'BODY',
                text: 'Hello {{1}}, Your upcoming appointment with {{2}} on {{3}} at {{4}} has been canceled. Let us know if you have any questions or need to reschedule.',
                example: { body_text: [['Mike', 'Tech Support', 'Friday', '3:00 PM']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'View details',
                        url: 'https://example.com/appointments'
                    }
                ]
            }
        ]

    },
    {
        name: 'acknowledge_service_request',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'Service',
        description: 'Acknowledge receipt of a customer service request.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Acknowledge Service Request'
            },
            {
                type: 'BODY',
                text: 'Hello {{1}}, we got your service request.\nWe will attend shortly.\n{{2}} is your ticket ID.',
                example: { body_text: [['John', '#T-12345']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'QUICK_REPLY',
                        text: 'Reply'
                    }
                ]
            }
        ]
    },
    // --- UTILITY: SHIPPING UPDATE ---
    {
        name: 'delivery_confirmation_1',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'E-commerce',
        description: 'Confirm that an order has been delivered.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Order delivered'
            },
            {
                type: 'BODY',
                text: 'Hi {{1}}, your order {{2}} was delivered on {{3}}. If you need to return or replace item(s), please click below.',
                example: { body_text: [['Jane', '#12345', 'yesterday']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'Start return',
                        url: 'https://example.com/returns'
                    }
                ]
            }
        ]
    },
    {
        name: 'shipment_tracking_1',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'E-commerce',
        description: 'Send tracking information for a shipped order.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Your order is on the way'
            },
            {
                type: 'BODY',
                text: 'Great news {{1}}! Your order {{2}} has shipped. You can track your package using the link below.',
                example: { body_text: [['Tom', '#98765']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'Track Order',
                        url: 'https://example.com/track/{{1}}'
                    }
                ]
            }
        ]
    },
    // --- MARKETING ---
    {
        name: 'abandoned_cart_offer',
        category: 'MARKETING',
        language: 'en_US',
        industry: 'E-commerce',
        description: 'Recover lost sales with a discount code.',
        components: [
            {
                type: 'HEADER',
                format: 'IMAGE',
                example: { header_handle: ['https://scontent.whatsapp.net/v/t61.29466-34/426346663_1356885821644788_2159021706606362540_n.jpg?ccb=1-7&_nc_sid=8b1bef&_nc_ohc=u0i8X8b8_cMQ7kNvgG_y-zE&_nc_ht=scontent.whatsapp.net&edm=AH51TzQEAAAA&oh=01_Q5AaIHuK5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y5y'] } // Placeholder or valid URL
            },
            {
                type: 'BODY',
                text: 'Hi {{1}}, you left some items in your cart! Use code {{2}} to get 10% off your purchase.',
                example: { body_text: [['Sarah', 'SAVE10']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'URL',
                        text: 'Checkout Now',
                        url: 'https://example.com/cart'
                    }
                ]
            }
        ]
    },
    {
        name: 'feedback_request',
        category: 'MARKETING',
        language: 'en_US',
        industry: 'General',
        description: 'Ask for customer feedback after a service or purchase.',
        components: [
            {
                type: 'BODY',
                text: 'Hi {{1}}, we hope you enjoyed your experience with us. Would you mind rating us?',
                example: { body_text: [['Alex']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'QUICK_REPLY',
                        text: 'Excellent'
                    },
                    {
                        type: 'QUICK_REPLY',
                        text: 'Good'
                    },
                    {
                        type: 'QUICK_REPLY',
                        text: 'Poor'
                    }
                ]
            }
        ]
    },
    {
        name: 'return_exchange_request',
        category: 'UTILITY',
        language: 'en_US',
        industry: 'E-commerce',
        description: 'Help customers start a return or exchange.',
        components: [
            {
                type: 'HEADER',
                format: 'TEXT',
                text: 'Returns & Exchanges'
            },
            {
                type: 'BODY',
                text: 'Hi {{1}}, we\'re sorry it didn\'t work out. Would you like to return your item for a refund or exchange it for a different size/color?',
                example: { body_text: [['John']] }
            },
            {
                type: 'BUTTONS',
                buttons: [
                    {
                        type: 'QUICK_REPLY',
                        text: 'Return Item'
                    },
                    {
                        type: 'QUICK_REPLY',
                        text: 'Exchange Item'
                    }
                ]
            }
        ]
    }
];
