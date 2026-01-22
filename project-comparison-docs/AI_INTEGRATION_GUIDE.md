# AI Workbench Integration Guide

## Overview
This guide shows you how to add the AI Workbench page to your application routing and test the implemented AI components.

---

## ✅ What's Been Implemented

### 1. CSS & Styling
- **File:** `src/index.css` (+306 lines)
- Glass morphism, premium shadows, gradients, AI animations
- Ready to use: `.glass-card`, `.ai-glow`, `.premium-shadow`, etc.

### 2. Tailwind Config
- **File:** `tailwind.config.js`
- AI colors, enhanced shadows, animations
- Ready to use: `bg-accent`, `shadow-ai`, `animate-shimmer`, etc.

### 3. Column Renderers
- **File:** `src/core/components/utils/columnRenderers.tsx`
- 13 smart auto-detection renderers for tables

### 4. AI Components
- **MarkdownRenderer:** `src/modules/ai/components/MarkdownRenderer.tsx`
- **AgentBubble:** `src/modules/ai/components/AgentBubble.tsx`
- **Types:** `src/modules/ai/types/index.ts`
- **Service:** `src/modules/ai/services/aiService.ts` (placeholder)
- **Demo Page:** `src/modules/ai/pages/AIWorkbench.tsx` ✨

---

## 🚀 How to Add AI Workbench Route

### Step 1: Add Lazy Import
**File:** `src/routes/index.tsx`

Add this import with the other lazy loads (around line 40):

```tsx
// AI Module
const AIWorkbench = lazy(() => import('@/modules/ai/pages/AIWorkbench'));
```

### Step 2: Add Route
In the same file, add the route within the `AuthedLayout` section (after line 137, before the Sample page):

```tsx
{/* AI - Workbench */}
<Route path="/ai/workbench" element={<AIWorkbench />} />
```

### Complete Example:
```tsx
// Around line 40 - Add with other imports
const AIWorkbench = lazy(() => import('@/modules/ai/pages/AIWorkbench'));

// Around line 137 - Add with other routes
{/* Workforce */}
<Route path="/workforce/leaves" element={<WorkforceLeaves />} />
<Route path="/workforce/timesheets" element={<WorkforceTimesheets />} />
<Route path="/workforce/expenses" element={<WorkforceExpenses />} />

{/* AI - Workbench */}
<Route path="/ai/workbench" element={<AIWorkbench />} />

{/* Admin - Settings */}
<Route path="/admin/settings" element={<AdminSettings />} />
```

---

## 🧪 Testing the Implementation

### Access the Page
Once you've added the route, visit:
```
http://localhost:5173/ai/workbench
```

### What You'll See
1. **Glass Card Design** - Premium frosted glass effect
2. **Sample Chat Messages** - User and AI conversation
3. **Markdown Rendering** - Tables, code blocks, formatted text
4. **View Mode Toggle** - Switch between rendered and source view
5. **Copy Buttons** - Copy message content
6. **Next Steps Guide** - Instructions for enabling real AI

### Test the CSS Classes
Try adding these to any page:

```tsx
// Glass morphism card
<Card className="glass-card premium-shadow hover-lift">
  Your content
</Card>

// AI-themed badge
<Tag className="ai-glow">AI Feature</Tag>

// Animated loader
<div className="animate-shimmer">Loading...</div>
```

### Test the Column Renderers
In any table component, try:

```tsx
import { getAutoRenderer } from '@/core/components/utils/columnRenderers';

// Auto-detect and render
const renderer = getAutoRenderer('email'); // Returns emailRenderer
const renderer = getAutoRenderer('created_at'); // Returns dateRenderer
const renderer = getAutoRenderer('amount'); // Returns currencyRenderer
```

---

## 🔧 Optional: Add to Navigation Menu

If you want to add AI Workbench to the sidebar navigation:

**File:** `src/core/components/Layout/Sider/navigation.ts` (or equivalent)

Add this item to your navigation array:

```tsx
{
  key: '/ai/workbench',
  label: t('AI Workbench'), // or 'AI Workbench' directly
  path: '/ai/workbench',
  icon: <RobotOutlined />, // or any icon
  allowedRoles: ['admin', 'user'], // adjust as needed
}
```

---

## 🔌 Optional: Enable Real AI Backend

### Step 1: Environment Variables
Create or update `.env`:

```env
VITE_ENABLE_AI=true
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key_here
VITE_AI_MODEL=gemini-1.5-pro
```

### Step 2: Implement AI Service
**File:** `src/modules/ai/services/aiService.ts`

Replace the placeholder with real implementation:

```tsx
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function streamAIResponse(
    messages: AgentMessage[],
    options?: StreamOptions
): Promise<void> {
    const result = await streamText({
        model: google(import.meta.env.VITE_AI_MODEL || 'gemini-1.5-pro'),
        messages: messages.map(m => ({ 
            role: m.role, 
            content: m.content 
        })),
        maxTokens: 2000,
        temperature: 0.7,
    });
    
    for await (const chunk of result.textStream) {
        options?.onChunk?.(chunk);
    }
    
    options?.onComplete?.();
}
```

### Step 3: Add Chat Input Component
Create a chat input component to send messages and call the AI service.

---

## 📁 File Structure Summary

```
src/
├── modules/
│   └── ai/
│       ├── components/
│       │   ├── AgentBubble.tsx ✅
│       │   └── MarkdownRenderer.tsx ✅
│       ├── pages/
│       │   └── AIWorkbench.tsx ✅ (Demo page)
│       ├── services/
│       │   └── aiService.ts ✅ (Placeholder)
│       └── types/
│           └── index.ts ✅
├── core/
│   └── components/
│       └── utils/
│           └── columnRenderers.tsx ✅
├── routes/
│   └── index.tsx (ADD ROUTE HERE)
├── index.css ✅ (Enhanced)
└── tailwind.config.js ✅ (Enhanced)
```

---

## 🎯 Quick Test Checklist

- [ ] Add lazy import for AIWorkbench
- [ ] Add route to `/ai/workbench`
- [ ] Start dev server (`npm run dev`)
- [ ] Navigate to `http://localhost:5173/ai/workbench`
- [ ] Verify glass card effect displays
- [ ] Test view mode toggle (VIEW/SRC buttons)
- [ ] Test copy button
- [ ] Check markdown rendering (tables, code)
- [ ] Try CSS classes on other pages
- [ ] Test column renderers in existing tables

---

## 📝 Notes

- **No Breaking Changes:** All additions are isolated
- **Lazy Loading:** AI components only load when accessed
- **Production Ready:** UI components fully functional
- **Placeholder Backend:** Replace `aiService.ts` when ready for real AI
- **TypeScript:** Full type safety included

---

## 🆘 Troubleshooting

**Route not found?**
- Check the import path: `@/modules/ai/pages/AIWorkbench`
- Verify the file exists
- Restart dev server

**Styles not applying?**
- Tailwind might need rebuild: Restart dev server
- Check browser CSS is enabled
- Verify glass morphism support (modern browsers only)

**Components not rendering?**
- Check console for errors
- Verify all dependencies installed (`npm install`)
- Check React version compatibility

---

## 🎉 What's Next?

1. **Add Route** - Follow Step 1 & 2 above
2. **Test Demo** - Visit `/ai/workbench`
3. **Optional:** Add to navigation menu
4. **Optional:** Configure real AI backend
5. **Build Features:** Use components in your own pages!

---

**Status:** Ready to integrate! 🚀  
**Documentation:** See `walkthrough_2026-01-21T09-54-41.md` for complete details
