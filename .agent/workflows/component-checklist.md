---
description: Agentic checklist for adding a new component or page to a module with all follow-through steps
---

# Component & Page Creation Checklist

// turbo-all

Complete agentic workflow for creating a new component or page in a module, including all integration steps.

## Quick Reference

| Step | File(s) to Update |
|------|-------------------|
| Component | `src/modules/{module}/pages/{PageName}.tsx` |
| Route | `src/routes/index.tsx` |
| Menu | `src/config/menuConfig.json` |
| Icon | `src/core/components/Layout/Sider/navigation.tsx` |
| i18n (module) | `src/modules/{module}/i18n/en.json` |
| i18n (core) | `src/core/i18n/locales/en.json` |
| Permissions | Database: `identity.role_permissions` |

---

## Phase 1: Component Creation

- [ ] **1.1 Create Page Component**
  - File: `src/modules/{module}/pages/{PageName}.tsx`
  - Use `DynamicViews` for entity-based pages
  - Import `useAuthStore` from `@/core/lib/store`
  - Import `supabase` from `@/core/lib/supabase`
  - Use proper namespace: `useTranslation('{module}')`

- [ ] **1.2 Create Supporting Components (if needed)**
  - Custom forms: `src/modules/{module}/components/{ComponentName}Form.tsx`
  - Custom views: `src/modules/{module}/components/{ComponentName}View.tsx`
  - Modals/Drawers: `src/modules/{module}/components/{ComponentName}Modal.tsx`
  - Shared utils: `src/modules/{module}/utils.ts`

---

## Phase 2: Routing Setup

- [ ] **2.1 Add Lazy Import**
  - File: `src/routes/index.tsx`
  - Pattern: `const PageName = lazy(() => import('@/modules/{module}/pages/{PageName}'));`

- [ ] **2.2 Add Route Definition**
  - File: `src/routes/index.tsx`
  - Pattern: `<Route path="/{module}/{page-path}" element={<PageName />} />`
  - Place inside protected routes section

---

## Phase 3: Menu Configuration

- [ ] **3.1 Add Menu Entry**
  - File: `src/config/menuConfig.json`
  - Add to module's array:
  ```json
  {
    "filePath": "src/modules/{module}/pages/{PageName}.tsx",
    "routePath": "/{module}/{page-path}",
    "translationKey": "{page-key}",
    "key": "{page-key}",
    "submoduleKey": "{module}-{page-key}"
  }
  ```

- [ ] **3.2 Add Icon Mapping**
  - File: `src/core/components/Layout/Sider/navigation.tsx`
  - Add to `iconMap`:
  ```tsx
  '{page-key}': <IconName size={18} />,
  ```
  - **IMPORTANT**: Use `lucide-react` icons ONLY (NOT Ant Design icons)
  - Common icons: `Settings`, `Users`, `FileText`, `Home`, `List`, etc.

---

## Phase 4: Internationalization (i18n)

- [ ] **4.1 Module Translations**
  - File: `src/modules/{module}/i18n/en.json`
  - Add page-specific labels, tabs, messages

- [ ] **4.2 Core Translations**
  - File: `src/core/i18n/locales/en.json`
  - Add under `common.label`:
  ```json
  "{page-key}": "{Page Display Name}"
  ```

- [ ] **4.3 Kannada Translations (if applicable)**
  - File: `src/modules/{module}/i18n/kn.json`
  - Mirror all keys from en.json

---

## Phase 5: Permissions Setup

- [ ] **5.1 Verify Permission Key**
  - Pattern: `{module}.{page-key}`
  - Required: At least `'r'` (read) permission

- [ ] **5.2 Update Role Permissions (if new)**
  - Database: `identity.role_permissions`
  - Add permission for relevant user roles

- [ ] **5.3 Add Permission Check (if custom)**
  - File: `src/utils/permissions.ts` (if needed)
  - Add to permission definitions

---

## Phase 6: Entity Configuration (if entity-based page)

- [ ] **6.1 Add View Config**
  - Database: `core.view_configs`
  - Define columns, filters, actions for the entity

- [ ] **6.2 Add Form Config**
  - Database: `core.view_configs` (form type)
  - Define form fields, validation rules

- [ ] **6.3 Register Custom Component (if needed)**
  - File: Module's view registry
  - Pattern: Export component in module index

---

## Phase 7: Verification

- [ ] **7.1 Build Check**
  - Run: `yarn build` or `yarn dev`
  - Ensure no TypeScript/compilation errors

- [ ] **7.2 Route Navigation**
  - Navigate to `/{module}/{page-path}`
  - Verify page loads without errors

- [ ] **7.3 Menu Visibility**
  - Check sidebar shows menu item under correct module
  - Verify icon displays correctly

- [ ] **7.4 i18n Labels**
  - Check all labels render (no raw keys visible)
  - Toggle language if multi-language enabled

- [ ] **7.5 Permission-Based Access**
  - Test with user having permission (should see page)
  - Test with user without permission (should be hidden/blocked)

- [ ] **7.6 Theme Compatibility**
  - Verify component looks good in light mode
  - Verify component looks good in dark mode
  - **MANDATORY**: Run the [/styling-component-checklist](file:///.agent/workflows/styling-component-checklist.md) workflow on the new file to ensure zero hardcoded colors.

---

## Best Practices (from real migrations)

### Import Paths
- Always use `@/core/lib/` for core imports:
  - `import { supabase } from '@/core/lib/supabase'`
  - `import { useAuthStore } from '@/core/lib/store'`
- Use `@/core/components/` for shared components:
  - `import DynamicViews from '@/core/components/DynamicViews'`
  - `import DynamicForm from '@/core/components/DynamicForm'`

### Icon Library
- **NEVER** use Ant Design icons (`@ant-design/icons`)
- **ALWAYS** use Lucide icons with size prop:
  ```tsx
  import { Plus, Pencil, Trash2, AlertCircle, Settings } from 'lucide-react';
  
  <Button icon={<Plus size={14} />}>Add</Button>
  <Button icon={<Trash2 size={14} />} danger />
  ```
- Common replacements:
  | Ant Design | Lucide |
  |------------|--------|
  | `PlusOutlined` | `Plus` |
  | `EditOutlined`/`EditFilled` | `Pencil` |
  | `DeleteOutlined` | `Trash2` |
  | `ExclamationCircleFilled` | `AlertCircle` |
  | `SettingOutlined` | `Settings` |
  | `SearchOutlined` | `Search` |
  | `SaveOutlined` | `Save` |
  | `HomeOutlined` | `Home` |

### TypeScript Patterns
- Make optional fields explicit in interfaces:
  ```tsx
  interface Entity {
    id: string;
    name: string;
    organization_id?: string;  // Optional for DB fetches
  }
  ```
- Use nullish coalescing for booleans:
  ```tsx
  isConfigured: hasCustomSettings ?? false,
  ```
- Properly escape regex forward slashes:
  ```tsx
  // ❌ Wrong - causes parse error
  link.replace(/(/edit|/preview)?$/, '/embed');
  
  // ✅ Correct
  link.replace(/(\/edit|\/preview)?$/, '/embed');
  ```

### Conditional Rendering
- Check component props exist before rendering:
  ```tsx
  {schema && <DynamicForm schemas={schema} onFinish={handleSubmit} />}
  ```
- Handle undefined strings safely:
  ```tsx
  message.success(`${selectedType ? formatTitle(selectedType) : 'item'} added`);
  ```

---

## Lean Code Principles

### Use Standard Components
- **ALWAYS** use Ant Design components instead of custom elements:
  ```tsx
  // ❌ Wrong - custom button with custom CSS
  <motion.button className="custom-btn" onClick={...}>Click</motion.button>
  
  // ✅ Correct - Ant Design Button with theme styling
  <Button type="primary" onClick={...}>Click</Button>
  ```

### No Framer Motion for UI Elements
- **AVOID** `framer-motion` for buttons, forms, and standard UI
- Use CSS transitions for simple hover/active states
- Framer Motion is acceptable ONLY for complex page transitions or charts
- If motion.button exists, replace with `<Button>` from antd

### Icons inside Primary Elements
- [ ] All SVG icons in primary buttons are `#000000`
- [ ] All Lucide icons are `#000000` in primary elements

### Typography Standards
- [ ] Uses `.text-h1` through `.text-h6` for headings
- [ ] Uses `.text-title` for card titles
- [ ] Uses `.text-subtitle` for descriptions
- [ ] Font weights match standards (600 for H1-H3, 500 for H4-H6)

### Border Radius & Layout
- [ ] Uses `var(--tenant-border-radius)` for all custom rounding
- [ ] Layout uses `.layout-canvas` or `.layout-record` as appropriate
- [ ] Page implements `.entry-animate` for surface transitions
- [ ] Grid/List items use `.entry-animate-container` for staggered loading

### CSS Variable Consistency
- Use `--color-primary`, `--color-secondary` for colors
- Use `--color-primary-rgb` for rgba() transparency effects
- Use `var(--tenant-border-radius)` for custom border radii
- These are set by ThemeRegistry from database theme_config

### Typography Standardization
- **ALWAYS** use standardized typography classes for headings:
  - `text-h1` to `text-h6` for primary headers
  - `text-title` for secondary/card titles
  - `text-subtitle` for descriptions
- Avoid hardcoded `font-bold` or `text-4xl` without the standard classes.

### Layout & Animations
- Use `.layout-canvas` for dashbods/profiles (no outer border)
- Use `.layout-record` for data tables (with border)
- Apply `.entry-animate` to the main content container
- Use `.entry-animate-container` on the parent of staggered items (Cards, Grid items)

---

## Common Patterns

### Standard Page with DynamicViews
```tsx
import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

const PageName: React.FC = () => {
  const { t } = useTranslation('{module}');
  const { user } = useAuthStore();

  const tabOptions = [
    { key: '1', label: t('tabs.myItems'), condition: { field: 'assignee_id', value: user?.id, filter_type: 'eq' } },
    { key: '2', label: t('tabs.allItems') },
  ];

  return (
    <DynamicViews
      entityType="{entity}"
      entitySchema="{schema}"
      tabOptions={tabOptions}
    />
  );
};

export default PageName;
```

### Custom Page Component
```tsx
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/store';
import PageActionBar from '@/core/components/ActionBar/PageActionBar';

const CustomPage: React.FC = () => {
  const { t } = useTranslation('{module}');
  
  return (
    <div className="page-container">
      <PageActionBar title={t('page.title')} />
      {/* Page content */}
    </div>
  );
};

export default CustomPage;
```

---

## Placeholder Reference

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{module}` | Module folder name | `support`, `hr`, `settings` |
| `{PageName}` | Component name (PascalCase) | `Tickets`, `LeaveRequests` |
| `{page-path}` | URL path segment | `tickets`, `leave-requests` |
| `{page-key}` | Menu/permission key | `tickets`, `leave_requests` |
| `{entity}` | Entity type | `tickets`, `leave_applications` |
| `{schema}` | Database schema | `blueprint`, `support` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not showing in menu | Check `menuConfig.json` entry and translation key |
| 404 on navigation | Verify route in `index.tsx` and lazy import |
| Missing icon | Add mapping in `navigation.tsx` iconMap |
| Raw translation keys showing | Add translations in both module and core i18n |
| Permission denied | Verify role has permission in database |
| Invalid regex flag error | Escape forward slashes: `/\/edit/` not `//edit/` |
| `Module has no exported member` | Define interface locally or check export |
| `Property does not exist on type` | Check component props interface, remove unsupported props |
| `undefined is not assignable` | Use optional chaining or nullish coalescing |
| Ant Design icons showing blank | Replace with Lucide icons |
| i18n duplicate key warnings | Check for duplicate keys in JSON files |
