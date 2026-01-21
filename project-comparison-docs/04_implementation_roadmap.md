# Implementation Roadmap

## Migrating Key Features from adaptive-ai-crm to vite_tanstack_zoworks_v2

This document provides a **step-by-step implementation plan** for safely integrating the best features from adaptive-ai-crm into vite_tanstack_zoworks_v2.

---

## 🎯 Goals

1. ✅ Add AI capabilities to vite_tanstack
2. ✅ Enhance UI/UX with modern design patterns
3. ✅ Improve table functionality
4. ✅ Maintain all existing features
5. ✅ Zero breaking changes
6. ✅ Minimize risk

---

## 📅 Timeline Overview

**Total Duration:** 4 weeks  
**Team Size:** 2-3 developers  
**Risk Level:** 🟡 Medium (with mitigation)

---

## Week 1: Foundation & Preparation

### Day 1-2: Setup & Dependencies

#### Task 1.1: Create Feature Branch
```bash
cd vite_tanstack_zoworks_v2
git checkout -b feature/ai-integration
git push -u origin feature/ai-integration
```

#### Task 1.2: Add AI Dependencies
**File:** `vite_tanstack_zoworks_v2/package.json`

```json
{
  "dependencies": {
    "ai": "^6.0.5",
    "@ai-sdk/google": "^3.0.2",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1"
  }
}
```

**Command:**
```bash
yarn add ai @ai-sdk/google react-markdown remark-gfm
```

**Testing:**
- ✅ Build succeeds
- ✅ No dependency conflicts
- ✅ Dev server runs

---

#### Task 1.3: Environment Variables
**File:** `vite_tanstack_zoworks_v2/.env`

Add:
```env
# AI Configuration
VITE_ENABLE_AI=true
VITE_GOOGLE_AI_API_KEY=your_key_here
VITE_AI_MODEL=gemini-1.5-pro
```

---

### Day 3-4: CSS & Styling Foundation

#### Task 1.4: Transfer Tailwind Extensions
**File:** `vite_tanstack_zoworks_v2/tailwind.config.js`

**Add from adaptive-ai-crm:**
```javascript
module.exports = {
  theme: {
    extend: {
      // Glass morphism
      backdropBlur: {
        xs: '2px',
      },
      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
};
```

---

#### Task 1.5: Transfer CSS Utilities
**File:** `vite_tanstack_zoworks_v2/src/index.css`

**Append:**
```css
/* ============================================
   Adaptive AI CRM Styles
   ============================================ */

/* Glass Morphism */
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

[data-theme='dark'] .glass-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Premium Shadows */
.premium-shadow {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.premium-shadow-lg {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

/* Gradient Backgrounds */
.gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradient-success {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
}

.gradient-danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* Hover Effects */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
}

/* Smooth Transitions */
.transition-all-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Testing:**
- ✅ No CSS conflicts
- ✅ Styles apply correctly
- ✅ Dark mode works

---

### Day 5: Utility Functions

#### Task 1.6: Column Renderers
**File:** `vite_tanstack_zoworks_v2/src/core/components/utils/columnRenderers.tsx`

**Content:** Copy from `adaptive-ai-crm/src/utils/columnRenderers.ts`

```typescript
import React from 'react';
import { Tag, Tooltip } from 'antd';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';

export function getAutoRenderer(
  columnKey: string,
  dataType: string
): ((value: any) => React.ReactNode) | null {
  // Email
  if (columnKey.includes('email')) {
    return (value: string) =>
      value ? (
        <a href={`mailto:${value}`} className="flex items-center gap-1 text-blue-600">
          <Mail size={14} />
          {value}
        </a>
      ) : null;
  }

  // Phone
  if (columnKey.includes('phone') || columnKey.includes('mobile')) {
    return (value: string) =>
      value ? (
        <a href={`tel:${value}`} className="flex items-center gap-1 text-blue-600">
          <Phone size={14} />
          {value}
        </a>
      ) : null;
  }

  // Status/Stage
  if (
    columnKey === 'status' ||
    columnKey === 'stage' ||
    columnKey.endsWith('_status')
  ) {
    return (value: string) => {
      const colorMap: Record<string, string> = {
        active: 'green',
        inactive: 'red',
        pending: 'orange',
        completed: 'blue',
        won: 'green',
        lost: 'red',
      };
      return <Tag color={colorMap[value?.toLowerCase()] || 'default'}>{value}</Tag>;
    };
  }

  // Dates
  if (dataType === 'timestamp' || dataType === 'date' || columnKey.includes('_at')) {
    return (value: string) =>
      value ? dayjs(value).format('MMM D, YYYY HH:mm') : null;
  }

  // URLs
  if (columnKey.includes('url') || columnKey.includes('link')) {
    return (value: string) =>
      value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600"
        >
          <ExternalLink size={14} />
          View
        </a>
      ) : null;
  }

  // Booleans
  if (dataType === 'boolean') {
    return (value: boolean) => (
      <Tag color={value ? 'success' : 'error'}>{value ? 'Yes' : 'No'}</Tag>
    );
  }

  // Arrays
  if (Array.isArray(dataType) || columnKey.endsWith('_tags')) {
    return (value: any[]) =>
      Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1">
          {value.map((item, i) => (
            <Tag key={i}>{typeof item === 'object' ? item.name : item}</Tag>
          ))}
        </div>
      ) : null;
  }

  return null; // No special renderer
}
```

**Testing:**
- ✅ Utility file compiles
- ✅ Can import in other components
- ✅ Returns correct renderers

---

## Week 2: AI Module Implementation

### Day 6-7: Module Structure

#### Task 2.1: Create AI Module
```bash
mkdir -p src/modules/ai/pages
mkdir -p src/modules/ai/components
mkdir -p src/modules/ai/hooks
mkdir -p src/modules/ai/types
mkdir -p src/modules/ai/services
```

**File structure:**
```
src/modules/ai/
├── pages/
│   └── AIWorkbench.tsx
├── components/
│   ├── AgentChat.tsx
│   ├── AgentBubble.tsx
│   ├── AIAssistant.tsx
│   ├── AIChatChart.tsx
│   └── MarkdownRenderer.tsx
├── hooks/
│   ├── useAIChat.ts
│   └── useAgentStream.ts
├── types/
│   └── index.ts
└── services/
    └── aiService.ts
```

---

#### Task 2.2: Transfer Types
**File:** `src/modules/ai/types/index.ts`

```typescript
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    agent?: string;
    files?: string[];
    charts?: any[];
  };
}

export interface Agent {
  key: string;
  name: string;
  description: string;
  domain: string;
  model?: string;
}

export interface ChatConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}
```

---

### Day 8-9: Transfer Components

#### Task 2.3: AgentBubble Component
**File:** `src/modules/ai/components/AgentBubble.tsx`

**Action:** Copy from `adaptive-ai-crm/src/components/agui/AgentBubble.tsx`

**Modifications:**
1. Update imports to use vite_tanstack paths
2. Ensure Ant Design 5 compatibility
3. Test rendering

---

#### Task 2.4: MarkdownRenderer Component
**File:** `src/modules/ai/components/MarkdownRenderer.tsx`

**Action:** Copy from `adaptive-ai-crm/src/components/agui/MarkdownRenderer.tsx`

---

#### Task 2.5: AgentChat Component
**File:** `src/modules/ai/components/AgentChat.tsx`

**Action:** Copy from `adaptive-ai-crm/src/components/agui/AgentChat.tsx`

**Required changes:**
```typescript
// Update Publitio config to use env vars
const publitio = new PublitioAPI(
  import.meta.env.VITE_PUBLITIO_KEY,
  import.meta.env.VITE_PUBLITIO_SECRET
);

// Update agent API endpoint
fetch(`${import.meta.env.VITE_API_BASE_URL}/api/agents`)
```

---

### Day 10: AI Service Layer

#### Task 2.6: AI Service
**File:** `src/modules/ai/services/aiService.ts`

```typescript
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function streamAIResponse(
  messages: any[],
  onChunk: (text: string) => void,
  onComplete: () => void
) {
  const result = streamText({
    model: google(import.meta.env.VITE_AI_MODEL || 'gemini-1.5-pro'),
    messages,
    maxTokens: 2000,
    temperature: 0.7,
  });

  for await (const chunk of result.textStream) {
    onChunk(chunk);
  }

  onComplete();
}

export async function getAgentsList() {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/agents`);
  return response.json();
}
```

---

## Week 3: Integration & Enhanced Table

### Day 11-12: AI Workbench Page

#### Task 3.1: Create AI Workbench
**File:** `src/modules/ai/pages/AIWorkbench.tsx`

```typescript
import React, { useState } from 'react';
import { Card, Layout } from 'antd';
import AgentChat from '../components/AgentChat';
import { AgentMessage } from '../types';
import { streamAIResponse } from '../services/aiService';

const { Content } = Layout;

const AIWorkbench: React.FC = () => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';
    const assistantMessage: AgentMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    await streamAIResponse(
      [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      })),
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id ? { ...m, content: assistantContent } : m
          )
        );
      },
      () => setIsLoading(false)
    );
  };

  return (
    <Layout className="h-full">
      <Content className="p-6">
        <Card
          title="AI Workbench"
          className="h-full glass-card"
          bodyStyle={{ height: 'calc(100% - 64px)', padding: 0 }}
        >
          <AgentChat
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default AIWorkbench;
```

---

#### Task 3.2: Add Route
**File:** `src/routes/index.tsx`

```typescript
import AIWorkbench from '@/modules/ai/pages/AIWorkbench';

// Add to routes array
{
  path: '/ai/workbench',
  element: <AIWorkbench />,
  meta: { requiresAuth: true },
},
```

---

#### Task 3.3: Add Navigation
**File:** `src/config/menuConfig.json`

```json
{
  "key": "ai",
  "label": "AI Workbench",
  "icon": "Bot",
  "path": "/ai/workbench",
  "order": 2
}
```

---

### Day 13-14: Enhanced Table View

#### Task 3.4: Backup Current TableView
```bash
cp src/core/components/DynamicViews/TableView.tsx src/core/components/DynamicViews/TableView_v1.tsx
```

---

#### Task 3.5: Add Cursor Pagination
**File:** `src/core/components/DynamicViews/TableView.tsx`

**Add state:**
```typescript
const [cursorStack, setCursorStack] = useState<string[]>([]);
const [currentCursor, setCurrentCursor] = useState<string | undefined>();
```

**Add pagination handlers:**
```typescript
const handleNext = () => {
  if (result?.nextCursor) {
    setCursorStack([...cursorStack, currentCursor!].filter(c => c !== undefined));
    setCurrentCursor(result.nextCursor);
  }
};

const handlePrev = () => {
  const newStack = [...cursorStack];
  const prevCursor = newStack.pop();
  setCursorStack(newStack);
  setCurrentCursor(prevCursor);
};
```

---

#### Task 3.6: Enhanced Filters
**Add dynamic filter popover from adaptive-ai-crm**

**Component:**
```typescript
const DynamicFilters: React.FC<{
  metadata: ColumnMetadata[];
  activeFilters: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
}> = ({ metadata, activeFilters, onChange, onClear }) => {
  // ... implementation from adaptive-ai-crm
};
```

---

#### Task 3.7: Auto Renderers
**Update TableView to use auto renderers:**

```typescript
import { getAutoRenderer } from '../../utils/columnRenderers';

// In column mapping
const autoRenderer = getAutoRenderer(field.fieldPath, field.type);
if (autoRenderer) {
  return autoRenderer(value);
}
// ... fallback logic
```

---

### Day 15: Testing & Polish

#### Task 3.8: Feature Flag
**File:** `.env`
```env
VITE_ENHANCED_TABLE=true
```

**In TableView:**
```typescript
const useEnhancedTable = import.meta.env.VITE_ENHANCED_TABLE === 'true';
```

---

#### Task 3.9: Comprehensive Testing

**Test Checklist:**
- [ ] AI Workbench loads
- [ ] Can send messages
- [ ] AI responses stream correctly
- [ ] Markdown renders
- [ ] File upload works
- [ ] Agent selection works
- [ ] Enhanced table pagination works
- [ ] Filters work correctly
- [ ] Auto renderers apply
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Dark mode works

---

## Week 4: Polish & Deployment

### Day 16-17: Additional Components

#### Task 4.1: MorphingCard
**File:** `src/core/components/shared/MorphingCard.tsx`

Copy from adaptive-ai-crm

---

#### Task 4.2: AgentDataPanel
**File:** `src/core/components/details/AgentDataPanel.tsx`

Adapt to use entity registry

---

### Day 18: Documentation

#### Task 4.3: Update README
**File:** `README.md`

Add AI features section

---

#### Task 4.4: Create AI Module Docs
**File:** `src/modules/ai/README.md`

---

### Day 19: Code Review & Refinement

#### Task 4.5: Code Review
- [ ] Review all changes
- [ ] Fix lint errors
- [ ] Optimize imports
- [ ] Remove dead code
- [ ] Add comments

---

### Day 20: Deployment Preparation

#### Task 4.6: Build Test
```bash
yarn build
```

#### Task 4.7: Update Environment
- Add production API keys
- Configure AI model settings
- Set feature flags

---

#### Task 4.8: Create Release Notes

---

## 📋 Testing Checklist

### Unit Tests
- [ ] Column renderers
- [ ] AI service functions
- [ ] Message formatting

### Integration Tests
- [ ] AI chat flow
- [ ] Enhanced table features
- [ ] Navigation works

### E2E Tests
- [ ] Full AI conversation
- [ ] Table CRUD operations
- [ ] Filter combinations

### Performance Tests
- [ ] Bundle size check
- [ ] Load time metrics
- [ ] Memory usage

### Compatibility Tests
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## 🚨 Rollback Plan

### If Issues Arise:

1. **Disable Features:**
   ```env
   VITE_ENABLE_AI=false
   VITE_ENHANCED_TABLE=false
   ```

2. **Revert Table:**
   ```bash
   cp src/core/components/DynamicViews/TableView_v1.tsx src/core/components/DynamicViews/TableView.tsx
   ```

3. **Remove AI Route:**
   Comment out in routes config

4. **Rollback Dependencies:**
   ```bash
   git checkout package.json
   yarn install
   ```

---

## ✅ Success Metrics

### By End of Week 4:

- ✅ AI chat fully functional
- ✅ 0 breaking changes to existing features
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Team trained on new features
- ✅ Performance maintained or improved
- ✅ User feedback positive

---

## 🎯 Post-Implementation

### Week 5+: Monitor & Iterate
- Monitor error rates
- Gather user feedback
- Optimize AI responses
- Add more AI features
- Refine UI based on usage

---

## 📞 Support & Resources

### Key Contacts
- Lead Developer: [Name]
- AI Specialist: [Name]
- QA Lead: [Name]

### References
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Ant Design 5 Migration Guide](https://ant.design/docs/react/migration-v5)
