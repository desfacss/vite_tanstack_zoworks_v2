# Quick Reference Guide

## Fast lookup for developers implementing the migration

---

## 📁 File Mapping: What Goes Where

### AI Components

| From (adaptive-ai-crm) | To (vite_tanstack) |
|------------------------|-------------------|
| `src/components/agui/AgentChat.tsx` | `src/modules/ai/components/AgentChat.tsx` |
| `src/components/agui/AgentBubble.tsx` | `src/modules/ai/components/AgentBubble.tsx` |
| `src/components/agui/AIAssistant.tsx` | `src/modules/ai/components/AIAssistant.tsx` |
| `src/components/agui/AIChatChart.tsx` | `src/modules/ai/components/AIChatChart.tsx` |
| `src/components/agui/MarkdownRenderer.tsx` | `src/modules/ai/components/MarkdownRenderer.tsx` |
| `src/components/agui/AgentDataPanel.tsx` | `src/core/components/details/AgentDataPanel.tsx` |
| `src/components/agui/MorphingCard.tsx` | `src/core/components/shared/MorphingCard.tsx` |

---

### Utilities

| From | To |
|------|-----|
| `src/utils/columnRenderers.ts` | `src/core/components/utils/columnRenderers.tsx` |

---

### Styles

| From | To | Action |
|------|-----|--------|
| `src/index.css` (AI styles) | `src/index.css` | **Append** |
| `tailwind.config.ts` | `tailwind.config.js` | **Merge** theme.extend |

---

## 🎨 CSS Classes to Use

### From adaptive-ai-crm

```css
/* Glass Effect */
.glass-card

/* Shadows */
.premium-shadow
.premium-shadow-lg

/* Gradients */
.gradient-primary
.gradient-success
.gradient-danger

/* Interactions */
.hover-lift
.transition-all-smooth
```

### Usage Example
```tsx
<Card className="glass-card premium-shadow hover-lift">
  {/* content */}
</Card>
```

---

## 🔧 Key Dependencies

### To Add
```bash
yarn add ai @ai-sdk/google react-markdown remark-gfm
```

### Versions
```json
{
  "ai": "^6.0.5",
  "@ai-sdk/google": "^3.0.2",
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1"
}
```

---

## 🌐 Environment Variables

### Required
```env
# AI Configuration
VITE_ENABLE_AI=true
VITE_GOOGLE_AI_API_KEY=your_key_here
VITE_AI_MODEL=gemini-1.5-pro

# File Upload (if using Publitio)
VITE_PUBLITIO_KEY=your_key
VITE_PUBLITIO_SECRET=your_secret

# Feature Flags
VITE_ENHANCED_TABLE=true
```

---

## 🎯 Import Paths Cheat Sheet

### AI Module Imports
```typescript
// Components
import AgentChat from '@/modules/ai/components/AgentChat';
import AgentBubble from '@/modules/ai/components/AgentBubble';
import MarkdownRenderer from '@/modules/ai/components/MarkdownRenderer';

// Services
import { streamAIResponse, getAgentsList } from '@/modules/ai/services/aiService';

// Types
import { AgentMessage, Agent, ChatConfig } from '@/modules/ai/types';

// Hooks
import { useAIChat } from '@/modules/ai/hooks/useAIChat';
```

### Core Utilities
```typescript
// Column Renderers
import { getAutoRenderer } from '@/core/components/utils/columnRenderers';

// Shared Components
import MorphingCard from '@/core/components/shared/MorphingCard';
import AgentDataPanel from '@/core/components/details/AgentDataPanel';
```

---

## 🚀 Quick Start Commands

### Development
```bash
# Install dependencies
yarn install

# Run dev server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

### Feature Branch
```bash
# Create and switch to feature branch
git checkout -b feature/ai-integration

# Push to remote
git push -u origin feature/ai-integration

# Merge to main (after review)
git checkout main
git merge feature/ai-integration
git push origin main
```

---

## 📊 Component Props Reference

### AgentChat
```typescript
interface AgentChatProps {
  messages: AgentMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onBubbleClick?: (message: AgentMessage) => void;
  selectedMessageId?: string;
}
```

### AgentBubble
```typescript
interface AgentBubbleProps {
  message: AgentMessage;
  isSelected?: boolean;
  onClick?: () => void;
}
```

### MarkdownRenderer
```typescript
interface MarkdownRendererProps {
  content: string;
  className?: string;
}
```

### MorphingCard
```typescript
interface MorphingCardProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}
```

---

## 🎨 Styling Patterns

### Glass Card Pattern
```tsx
<div className="glass-card p-6 rounded-xl">
  <h2>Title</h2>
  <p>Content</p>
</div>
```

### Premium Shadow
```tsx
<Card className="premium-shadow hover-lift">
  {/* Lifts on hover with shadow */}
</Card>
```

### Gradient Background
```tsx
<div className="gradient-primary text-white p-8 rounded-lg">
  {/* Gradient background */}
</div>
```

---

## 🔍 Common Code Patterns

### AI Streaming
```typescript
const [messages, setMessages] = useState<AgentMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);

const handleSendMessage = async (content: string) => {
  setIsLoading(true);
  
  let assistantContent = '';
  await streamAIResponse(
    messages,
    (chunk) => {
      assistantContent += chunk;
      setMessages(prev => updateLastMessage(prev, assistantContent));
    },
    () => setIsLoading(false)
  );
};
```

### Auto Column Renderer
```typescript
const columns = metadata.map(field => ({
  title: field.display_name,
  dataIndex: field.key,
  render: (value: any) => {
    const autoRenderer = getAutoRenderer(field.key, field.type);
    return autoRenderer ? autoRenderer(value) : value;
  }
}));
```

### Cursor Pagination
```typescript
const [cursorStack, setCursorStack] = useState<string[]>([]);
const [currentCursor, setCurrentCursor] = useState<string>();

const handleNext = () => {
  if (nextCursor) {
    setCursorStack(prev => [...prev, currentCursor!]);
    setCurrentCursor(nextCursor);
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

## 🧪 Testing Snippets

### Test AI Chat
```typescript
describe('AgentChat', () => {
  it('sends messages correctly', async () => {
    const onSendMessage = jest.fn();
    render(<AgentChat messages={[]} isLoading={false} onSendMessage={onSendMessage} />);
    
    const input = screen.getByPlaceholderText(/ask zo/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onSendMessage).toHaveBeenCalledWith('Hello');
  });
});
```

### Test Column Renderer
```typescript
describe('getAutoRenderer', () => {
  it('renders email as link', () => {
    const renderer = getAutoRenderer('email', 'string');
    const result = renderer('test@example.com');
    expect(result).toContain('mailto:');
  });
  
  it('renders status as tag', () => {
    const renderer = getAutoRenderer('status', 'string');
    const result = renderer('active');
    expect(result).toContain('Tag');
  });
});
```

---

## 🐛 Troubleshooting

### Common Issues & Fixes

#### 1. AI not streaming
**Issue:** Messages appear all at once
**Fix:** Check `streamText` is imported from `ai` package
```typescript
import { streamText } from 'ai'; // Correct
```

---

#### 2. Markdown not rendering
**Issue:** Raw markdown text showing
**Fix:** Import and use MarkdownRenderer
```typescript
import MarkdownRenderer from '@/modules/ai/components/MarkdownRenderer';
<MarkdownRenderer content={message.content} />
```

---

#### 3. Glass effect not working
**Issue:** `.glass-card` has no effect
**Fix:** Ensure CSS is imported and Tailwind supports backdrop-filter
```javascript
// tailwind.config.js
module.exports = {
  // ...
  corePlugins: {
    backdropFilter: true, // Enable this
  },
};
```

---

#### 4. Column renderers not applying
**Issue:** Auto renderers don't work
**Fix:** Check function returns non-null
```typescript
const autoRenderer = getAutoRenderer(field.key, field.type);
if (autoRenderer) { // Important check
  return autoRenderer(value);
}
```

---

#### 5. Cursor pagination breaks
**Issue:** Can't go back
**Fix:** Ensure cursor stack is managed correctly
```typescript
// When going forward, save current cursor FIRST
setCursorStack([...cursorStack, currentCursor!].filter(c => c));
```

---

## 📦 Bundle Size Impact

### Before (vite_tanstack only)
```
Total: ~2.5 MB
Main: ~1.8 MB
Vendor: ~700 KB
```

### After (with AI features)
```
Total: ~2.9 MB (+400 KB)
Main: ~2.0 MB (+200 KB)
Vendor: ~900 KB (+200 KB)
```

**Impact:** +16% bundle size, acceptable for AI features

---

## ⚡ Performance Tips

### 1. Lazy Load AI Module
```typescript
const AIWorkbench = lazy(() => import('@/modules/ai/pages/AIWorkbench'));

<Route 
  path="/ai/workbench" 
  element={
    <Suspense fallback={<LoadingFallback />}>
      <AIWorkbench />
    </Suspense>
  } 
/>
```

### 2. Memoize Renderers
```typescript
const autoRenderer = useMemo(
  () => getAutoRenderer(field.key, field.type),
  [field.key, field.type]
);
```

### 3. Debounce Search
```typescript
const debouncedSearch = useDebouncedCallback(
  (value: string) => setSearch(value),
  300
);
```

---

## 🔐 Security Checklist

- [ ] AI API keys in environment variables only
- [ ] No API keys in client-side code
- [ ] Validate user input before AI prompt
- [ ] Rate limit AI requests
- [ ] Sanitize AI responses before rendering
- [ ] Use HTTPS for AI API calls
- [ ] Implement proper CORS for agent endpoints

---

## 📚 Additional Resources

### Documentation
- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **Google AI Studio:** https://ai.google.dev/
- **React Markdown:** https://github.com/remarkjs/react-markdown
- **TanStack Table:** https://tanstack.com/table/latest

### Internal Docs
- `adaptive-ai-crm/README.md` - Source project overview
- `vite_tanstack_zoworks_v2/README.md` - Target project overview
- `01_comprehensive_comparison.md` - Full comparison
- `02_safe_feature_migration.md` - Migration safety guide
- `03_pros_cons_analysis.md` - Detailed analysis
- `04_implementation_roadmap.md` - Step-by-step guide

---

## 🎯 Priority Actions (TL;DR)

### Week 1
```bash
# 1. Setup
git checkout -b feature/ai-integration
yarn add ai @ai-sdk/google react-markdown remark-gfm

# 2. Add CSS
# Copy glass-card and premium-shadow classes to index.css

# 3. Add utils
# Copy columnRenderers.ts to core/components/utils/
```

### Week 2
```bash
# 4. Create AI module
mkdir -p src/modules/ai/{pages,components,hooks,services,types}

# 5. Copy components
# Copy AgentChat, AgentBubble, MarkdownRenderer

# 6. Create AIWorkbench page
```

### Week 3
```bash
# 7. Add route
# Update routes/index.tsx with /ai/workbench

# 8. Enhance TableView
# Add cursor pagination and auto-renderers

# 9. Test thoroughly
```

### Week 4
```bash
# 10. Polish and document
# 11. Code review
# 12. Deploy
```

---

## ✅ Definition of Done

A feature is complete when:
- [ ] Code written and tested
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Feature flag works
- [ ] Rollback tested
- [ ] Team demo completed

---

## 🏁 Final Checklist Before Merge

- [ ] All files committed
- [ ] Branch up to date with main
- [ ] Build succeeds (`yarn build`)
- [ ] Tests pass (`yarn test`)
- [ ] Lint clean (`yarn lint`)
- [ ] Environment variables documented
- [ ] README updated
- [ ] Migration guide reviewed
- [ ] Team trained
- [ ] Rollback plan documented
- [ ] Production keys ready
- [ ] Monitoring in place

---

**Ready to start? Begin with Week 1, Day 1 from `04_implementation_roadmap.md`**
