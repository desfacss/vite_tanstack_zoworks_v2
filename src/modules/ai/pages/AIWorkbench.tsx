/**
 * AI Workbench Demo Page
 * Demonstrates AI chat components with sample messages
 */

import React, { useState } from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AgentBubble, { type AgentMessage } from '../components/AgentBubble';

const { Title, Text } = Typography;

// Sample messages for demonstration
const sampleMessages: AgentMessage[] = [
    {
        id: '1',
        role: 'user',
        name: 'You',
        content: 'Hello! Can you help me understand the AI features?',
        timestamp: '10:30 AM',
    },
    {
        id: '2',
        role: 'assistant',
        name: 'AI Assistant',
        content: `Hello! I'd be happy to help you understand the AI features.

Here are the **key capabilities**:

1. **Smart Conversations** - Natural language interactions
2. **Markdown Support** - Rich text formatting with tables and code
3. **Context Awareness** - Remembers previous messages

### Example Table

| Feature | Status |
|---------|--------|
| Chat Interface | ✅ Ready |
| Markdown | ✅ Ready |
| AI Backend | 🚧 In Progress |

Would you like to know more about any specific feature?`,
        timestamp: '10:30 AM',
    },
    {
        id: '3',
        role: 'user',
        name: 'You',
        content: 'Yes, show me a code example!',
        timestamp: '10:31 AM',
    },
    {
        id: '4',
        role: 'assistant',
        name: 'AI Assistant',
        content: `Sure! Here's a simple example:

\`\`\`typescript
import { AgentBubble } from '@/modules/ai/components';

// Display a chat message
<AgentBubble 
  message={message} 
  isSelected={false}
  onClick={() => console.log('Message clicked')}
/>
\`\`\`

You can also use \`inline code\` like this!`,
        timestamp: '10:31 AM',
    },
];

const AIWorkbench: React.FC = () => {
    const [messages] = useState<AgentMessage[]>(sampleMessages);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <Title level={2} className="page-title">
                        <RobotOutlined style={{ marginRight: 12, color: '#1677ff' }} />
                        AI Workbench
                    </Title>
                    <Text type="secondary">
                        Demonstration of AI chat components
                    </Text>
                </div>
            </div>

            <Card
                className="glass-card premium-shadow"
                style={{ maxWidth: 900, margin: '0 auto' }}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: 20,
                        borderRadius: 12,
                        color: 'white',
                    }}>
                        <Title level={4} style={{ color: 'white', margin: 0 }}>
                            Demo Mode
                        </Title>
                        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                            The AI backend is not yet configured. These are sample messages
                            demonstrating the UI components.
                        </Text>
                    </div>

                    {/* Chat Messages */}
                    <div className="custom-scrollbar-ai" style={{
                        maxHeight: '600px',
                        overflowY: 'auto',
                        padding: '8px 0',
                    }}>
                        {messages.map((message) => (
                            <AgentBubble
                                key={message.id}
                                message={message}
                                isSelected={false}
                            />
                        ))}
                    </div>

                    {/* Info Section */}
                    <div style={{
                        background: '#f0f2f5',
                        padding: 16,
                        borderRadius: 8,
                        marginTop: 16,
                    }}>
                        <Title level={5}>Next Steps to Enable Real AI:</Title>
                        <ol style={{ marginBottom: 0 }}>
                            <li>Set up environment variables (VITE_GOOGLE_AI_API_KEY)</li>
                            <li>Implement AI service in <code>aiService.ts</code></li>
                            <li>Add chat input component</li>
                            <li>Connect to backend API or use Vercel AI SDK</li>
                        </ol>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default AIWorkbench;
