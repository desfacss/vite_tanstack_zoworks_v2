---
description: Complete checklist for adding a new component or page to a module
---

# /add-component Workflow

// turbo-all

**Trigger phrases**: "add page", "create component", "new feature"

Complete agentic workflow for creating a new component or page in a module, including all integration steps.

---

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
  ```tsx
  // src/modules/{module}/pages/{PageName}.tsx
  import DynamicViews from '@/core/components/DynamicViews';
  import { useAuthStore } from '@/core/lib/store';
  import { useTranslation } from 'react-i18next';

  const PageName: React.FC = () => {
    const { t } = useTranslation('{module}');
    const { user } = useAuthStore();
    
    return (
      <DynamicViews
        entityType="{entity}"
        entitySchema="{schema}"
      />
    );
  };

  export default PageName;
  ```

---

## Phase 2: Routing Setup

- [ ] **2.1 Add Lazy Import**
  - File: `src/routes/index.tsx`
  - Pattern: `const PageName = lazy(() => import('@/modules/{module}/pages/{PageName}'));`

- [ ] **2.2 Add Route Definition**
  - File: `src/routes/index.tsx`
  - Pattern: `<Route path="/{module}/{page-path}" element={<PageName />} />`

---

## Phase 3: Menu Configuration

- [ ] **3.1 Add Menu Entry**
  - File: `src/config/menuConfig.json`
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
  - **IMPORTANT**: Use `lucide-react` icons ONLY

---

## Phase 4: Internationalization (i18n)

- [ ] **4.1 Module Translations**: `src/modules/{module}/i18n/en.json`
- [ ] **4.2 Core Translations**: `src/core/i18n/locales/en.json` under `common.label`
- [ ] **4.3 Kannada Translations (if applicable)**: `src/modules/{module}/i18n/kn.json`
- [ ] **4.4 Key Naming Convention**:
  - Pattern: `[namespace].[module].[context].[element]`
  - Contexts: `label`, `action`, `placeholder`, `message`, `status`, `tip`
  - Use `snake_case` for element names
  - Example: `modules.crm.contacts.label.first_name`

---

## Phase 5: ActionBar & Layout Patterns

- [ ] **5.1 Use PageActionBar** for list pages (not custom headers)
- [ ] **5.2 Use PrimaryAction** component for main action button
- [ ] **5.3 Use ViewToggle** only if >1 view available
- [ ] **5.4 Brand Components**: Use `<BrandLogo />` / `<BrandIcon />` for tenant logos (no raw `<img>`)

---

## Phase 6: Verification

- [ ] **6.1 Build Check**: `yarn build` passes
- [ ] **6.2 Route Navigation**: Page loads without errors
- [ ] **6.3 Menu Visibility**: Sidebar shows menu item
- [ ] **6.4 i18n Labels**: No raw keys visible
- [ ] **6.5 Theme Compatibility**: Works in light and dark mode
- [ ] **6.6 Run Styling Audit**: Execute `/styling-component-checklist` on new file

---

## Icon Library Rules

- **NEVER** use Ant Design icons (`@ant-design/icons`)
- **ALWAYS** use Lucide icons with size prop:
  ```tsx
  import { Plus, Pencil, Trash2 } from 'lucide-react';
  <Button icon={<Plus size={14} />}>Add</Button>
  ```

| Ant Design | Lucide |
|------------|--------|
| `PlusOutlined` | `Plus` |
| `EditOutlined` | `Pencil` |
| `DeleteOutlined` | `Trash2` |
| `SettingOutlined` | `Settings` |
| `SearchOutlined` | `Search` |
| `SaveOutlined` | `Save` |

---

## CSS Variable Standards

- Use `var(--color-primary)`, `var(--color-bg-primary)` for colors
- Use `var(--tenant-border-radius)` for custom border radii
- Use `.text-h1` to `.text-h6` for headings
- Use `.layout-canvas` or `.layout-record` for page layout

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not showing in menu | Check `menuConfig.json` and translation key |
| 404 on navigation | Verify route and lazy import |
| Missing icon | Add mapping in `navigation.tsx` iconMap |
| Raw translation keys | Add translations in module i18n |
| Ant Design icons blank | Replace with Lucide icons |

---

*Last Updated: 2025-12-25*
