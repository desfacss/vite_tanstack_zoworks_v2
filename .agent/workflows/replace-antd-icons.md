---
description: Replace Ant Design icons with Lucide icons
---

# Replace Ant Design Icons with Lucide Icons

## Overview
This workflow replaces Ant Design icons (`@ant-design/icons`) with Lucide React icons (`lucide-react`). Lucide provides a more modern, consistent icon set with smaller bundle size.

## Steps

### 1. Find Ant Design Icon Usage
Search for Ant Design icon imports in the target file:
```bash
grep -n "@ant-design/icons" src/path/to/file.tsx
```

### 2. Identify Each Icon
For each icon found (e.g., `MenuOutlined`, `SearchOutlined`), extract the keyword:
- `MenuOutlined` → keyword: **menu**
- `SearchOutlined` → keyword: **search**
- `SettingOutlined` → keyword: **settings**
- `TableOutlined` → keyword: **table**
- `AppstoreOutlined` → keyword: **grid**, **layout**
- `CalendarOutlined` → keyword: **calendar**
- `UserOutlined` → keyword: **user**
- `PlusOutlined` → keyword: **plus**
- `DeleteOutlined` → keyword: **trash**
- `EditOutlined` → keyword: **pencil**, **edit**
- `EyeOutlined` → keyword: **eye**
- `DownloadOutlined` → keyword: **download**
- `UploadOutlined` → keyword: **upload**
- `CheckOutlined` → keyword: **check**
- `CloseOutlined` → keyword: **x**
- `InfoCircleOutlined` → keyword: **info**
- `ExclamationCircleOutlined` → keyword: **alert-circle**

### 3. Find Lucide Equivalent
// turbo
Go to https://lucide.dev/icons/ and search for the keyword.

or go to https://github.com/lucide-icons/lucide/tree/main/icons

Common mappings:
| Ant Design | Lucide |
|------------|--------|
| MenuOutlined | Menu |
| SearchOutlined | Search |
| SettingOutlined | Settings |
| TableOutlined | Table |
| AppstoreOutlined | LayoutGrid |
| CalendarOutlined | Calendar |
| UserOutlined | User |
| PlusOutlined | Plus |
| DeleteOutlined | Trash2 |
| EditOutlined | Pencil |
| EyeOutlined | Eye |
| EyeInvisibleOutlined | EyeOff |
| DownloadOutlined | Download |
| UploadOutlined | Upload |
| CheckOutlined | Check |
| CloseOutlined | X |
| InfoCircleOutlined | Info |
| ExclamationCircleOutlined | AlertCircle |
| ProjectOutlined | FolderKanban |
| EnvironmentOutlined | MapPin |
| DashboardOutlined | LayoutDashboard |
| InsertRowAboveOutlined | Columns |
| FilterOutlined | Filter |
| SortAscendingOutlined | ArrowUpNarrowWide |
| HomeOutlined | Home |
| LogoutOutlined | LogOut |
| BellOutlined | Bell |
| MailOutlined | Mail |

### 4. Replace Import Statement
Change from:
```tsx
import { MenuOutlined, SearchOutlined } from '@ant-design/icons';
```
To:
```tsx
import { Menu, Search } from 'lucide-react';
```

### 5. Replace JSX Usage
Ant Design icons use component syntax:
```tsx
<MenuOutlined />
```

Lucide icons also use component syntax but with different prop names:
```tsx
<Menu size={24} />
```

Key differences:
- Use `size` prop instead of `style={{ fontSize: X }}`
- Use `strokeWidth` prop to change weight (default is 2)
- Lucide icons are stroked, not filled (use `fill="currentColor"` if needed)

### 6. Verify
// turbo
After replacement, run `yarn dev` and visually check the icons appear correctly.

## Example Full Replacement

### Before (Ant Design)
```tsx
import { MenuOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';

<Button icon={<MenuOutlined style={{ fontSize: 24 }} />} />
<Button icon={<SearchOutlined />} />
```

### After (Lucide)
```tsx
import { Menu, Search, Settings } from 'lucide-react';

<Button icon={<Menu size={24} />} />
<Button icon={<Search size={20} />} />
```

## Notes
- Check that `lucide-react` is installed: `yarn add lucide-react` if not
- Some Ant Design icons don't have exact Lucide equivalents - choose the closest match
- Keep Ant Design icons for internal Ant Design components (Form, Table columns, etc.)