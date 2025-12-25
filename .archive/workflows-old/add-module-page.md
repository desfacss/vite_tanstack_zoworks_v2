---
description: Add a new page to a module with menu, route, and permission setup
---

# Add New Module Page Workflow

// turbo-all

Complete workflow for adding a new page component to the application with proper menu, routing, and permission setup.

## Prerequisites
- Module exists in `src/modules/{module}/`
- Page component created in `src/modules/{module}/pages/`

## Steps

### 1. Create the Page Component
Create a new file in `src/modules/{module}/pages/{PageName}.tsx`:

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

### 2. Add Module i18n Labels
Update `src/modules/{module}/i18n/en.json`:

```json
{
  "tabs": {
    "myItems": "My Items",
    "allItems": "All Items"
  }
}
```

### 3. Add Menu Configuration
Update `src/config/menuConfig.json` to add the route under the module:

```json
{
  "modules": {
    "{module}": [
      {
        "filePath": "src/modules/{module}/pages/{PageName}.tsx",
        "routePath": "/{module}/{page-path}",
        "translationKey": "{page-key}",
        "key": "{page-key}",
        "submoduleKey": "{module}-{page-key}"
      }
    ]
  }
}
```

### 4. Add Lazy Import and Route
Update `src/routes/index.tsx`:

1. Add lazy import at the top:
```tsx
const PageName = lazy(() => import('@/modules/{module}/pages/{PageName}'));
```

2. Add Route inside the protected routes:
```tsx
<Route path="/{module}/{page-path}" element={<PageName />} />
```

### 5. Add Core Translation (if needed)
Update `src/core/i18n/locales/en.json` under `common.label`:

```json
{
  "common": {
    "label": {
      "{module}": "{Module Display Name}",
      "{page-key}": "{Page Display Name}"
    }
  }
}
```

### 6. Add Icon Mapping (if new module)
Update `src/core/components/Layout/Sider/navigation.tsx` iconMap:

```tsx
const iconMap = {
  '{page-key}': <IconComponent size={18} />,
};
```

### 7. Verify Permissions
Ensure user role has the required permission in the database:

```
permissions.{module}.{page-key} = ['r', 'w', ...] // at minimum 'r' for read access
```

Check the `identity.role_permissions` table or equivalent.

## Verification Checklist
- [ ] Page component renders without errors
- [ ] Menu item appears in sidebar under correct module
- [ ] Route navigates correctly to the page
- [ ] i18n labels display properly
- [ ] Permission-based visibility works

## Example Values
| Placeholder | Example Value |
|-------------|---------------|
| `{module}` | `support` |
| `{PageName}` | `Tickets` |
| `{page-path}` | `tickets` |
| `{page-key}` | `tickets` |
| `{entity}` | `tickets` |
| `{schema}` | `blueprint` |
