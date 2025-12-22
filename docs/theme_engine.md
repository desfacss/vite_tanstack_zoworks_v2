# Theme Engine Architecture - Zoworks SaaS

## 1. Overview

The Zoworks Theme Engine is designed for a multi-tenant SaaS environment where:
- **Tenants** have primary control over branding (logo, brand name, primary colors).
- **Platform** provides "Base Themes" (presets) that define high-level aesthetics.
- **Users** can toggle between Light and Dark modes (if allowed by the tenant).

## 2. Theme Configuration Layers

| Layer | Owner | Description |
|-------|-------|-------------|
| **Presets** | Platform Developer | Pre-built theme styles (Glassmorphism, Corporate, Minimal) |
| **Tenant Config** | SaaS Admin | Assigns a preset + brand overrides (logo, name, colors) |
| **User Preference** | End User | Dark/Light mode toggle (if `allowUserDarkMode: true`) |

---

## 3. Available Theme Presets

### Current Presets in `src/core/theme/presets.ts`

| Preset ID | Style | Best For |
|-----------|-------|----------|
| `glassmorphism` | Semi-transparent cards, blur effects, Apple-style UI | Modern consumer apps |
| `ultra_glass` | Extreme transparency, gradient backgrounds | Showcase/demo environments |
| *(none/undefined)* | Standard solid Ant Design colors | Enterprise/traditional apps |

### Adding New Presets

To add a new preset (e.g., `corporate`), update `src/core/theme/presets.ts`:

```typescript
export const THEME_PRESETS = {
    glassmorphism: { /* existing */ },
    
    corporate: {
        borderRadius: 4,  // Sharp corners
        light: {
            primaryColor: '#003366',
            cardBg: '#ffffff',
            layoutBg: '#f5f5f5',
            headerBg: '#003366',
            siderBg: '#001529',
            textColor: '#333333',
        },
        dark: {
            primaryColor: '#4da6ff',
            cardBg: '#1a1a1a',
            layoutBg: '#0d0d0d',
            headerBg: '#001529',
            siderBg: '#000c17',
            textColor: '#e0e0e0',
        }
    },
    
    minimal: {
        borderRadius: 0,  // No rounded corners
        light: {
            primaryColor: '#000000',
            cardBg: '#ffffff',
            layoutBg: '#ffffff',
        },
        dark: {
            primaryColor: '#ffffff',
            cardBg: '#1a1a1a',
            layoutBg: '#0a0a0a',
        }
    }
};
```

---

## 4. Database Configuration (Per-Tenant)

Theme is stored in `identity.organizations.theme_config` as JSONB.

### Schema: `theme_config`

```json
{
  "preset": "glassmorphism",      // Which base theme to use
  "mode": "light",                // Default mode on first load
  "brandName": "Acme Corp",       // Display name in header/title
  "primaryColor": "#FF6B00",      // Override preset's primary color
  "borderRadius": 16,             // Override preset's border radius
  "allowUserDarkMode": true,      // Can user toggle dark mode?
  "defaultMode": "light",         // Fallback mode
  "light": {                      // Light mode overrides (optional)
    "logoUrl": "https://...",
    "cardBg": "#ffffff",
    "headerBg": "#ffffff"
  },
  "dark": {                       // Dark mode overrides (optional)
    "logoUrl": "https://...",
    "cardBg": "#1f1f1f"
  }
}
```

### What Each Field Controls

| Field | Type | Description | User Control? |
|-------|------|-------------|---------------|
| `preset` | `string` | Base theme preset ID | ❌ Admin only |
| `mode` | `"light" \| "dark"` | Default mode | ❌ Admin only |
| `brandName` | `string` | Organization display name | ❌ Admin only |
| `primaryColor` | `string` | Brand accent color | ❌ Admin only |
| `borderRadius` | `number` | Global corner roundness (px) | ❌ Admin only |
| `allowUserDarkMode` | `boolean` | Show dark mode toggle? | ❌ Admin controls visibility |
| `light.logoUrl` | `string` | Logo for light mode | ❌ Admin only |
| `dark.logoUrl` | `string` | Logo for dark mode | ❌ Admin only |
| *(User's mode preference)* | - | Current mode (light/dark) | ✅ User toggles |

---

## 5. SQL Examples for Setting Up Themes

### Example 1: Apply Glassmorphism to a Tenant

```sql
UPDATE identity.organizations
SET theme_config = '{
    "preset": "glassmorphism",
    "mode": "light",
    "brandName": "Glass Studio",
    "primaryColor": "#007AFF",
    "borderRadius": 16,
    "allowUserDarkMode": true
}'::jsonb
WHERE subdomain = 'glassstudio';
```

### Example 2: Apply Corporate Theme to a Tenant

```sql
UPDATE identity.organizations
SET theme_config = '{
    "preset": "corporate",
    "mode": "light",
    "brandName": "Enterprise Inc",
    "primaryColor": "#003366",
    "borderRadius": 4,
    "allowUserDarkMode": false,
    "light": {
        "logoUrl": "https://example.com/logo-dark.png",
        "headerBg": "#003366"
    },
    "dark": {
        "logoUrl": "https://example.com/logo-light.png"
    }
}'::jsonb
WHERE subdomain = 'enterprise';
```

### Example 3: Minimal Theme (No Preset, Standard Colors)

```sql
UPDATE identity.organizations
SET theme_config = '{
    "mode": "light",
    "brandName": "Simple Co",
    "primaryColor": "#1890ff",
    "borderRadius": 8,
    "allowUserDarkMode": true
}'::jsonb
WHERE subdomain = 'simpleco';
```

### Example 4: Just Add Preset to Existing Config

```sql
-- Add glassmorphism preset while preserving other settings
UPDATE identity.organizations
SET theme_config = theme_config || '{"preset": "glassmorphism"}'::jsonb
WHERE id = '55555555-5555-5555-5555-555555555555';
```

---

## 6. How It Works (Technical Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION BOOT                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  TenantProvider.tsx                                              │
│  1. Resolves tenant subdomain                                    │
│  2. Fetches organization from DB                                 │
│  3. Calls loadTenantTheme(theme_config)                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  ThemeRegistry.loadTenantTheme()                                 │
│  1. If preset exists, merge THEME_PRESETS[preset]                │
│  2. Apply tenant overrides (primaryColor, logos, etc.)           │
│  3. Set CSS variables (--tenant-primary, --tenant-card-bg)       │
│  4. If glassmorphism, set data-glass-effect="true" on <html>     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  User Login → SessionManager.tsx                                 │
│  1. Fetches organization.theme_config                            │
│  2. Re-applies theme (in case user switches orgs)                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  User Toggle (Settings)                                          │
│  1. User clicks Light/Dark toggle                                │
│  2. useThemeStore updates isDarkMode                             │
│  3. ThemeRegistry.applyThemeMode() updates CSS variables         │
│  4. ConfigProvider re-renders with getAntdTheme(isDarkMode)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CSS Variable Reference

These variables are set by `ThemeRegistry.ts` and can be used anywhere:

| Variable | Description |
|----------|-------------|
| `--tenant-primary` | Brand primary color |
| `--tenant-card-bg` | Card/container background (mode-aware) |
| `--tenant-layout-bg` | Page background (mode-aware) |
| `--tenant-backdrop-blur` | Blur amount for glass effects |
| `--tenant-card-border` | Border style for glass cards |
| `--tenant-border-radius` | Global corner roundness |

### Usage in Custom Components

```tsx
// In JSX
<div style={{ background: 'var(--tenant-card-bg)' }}>

// In CSS/Tailwind
.custom-card {
  background: var(--tenant-card-bg);
  border-radius: var(--tenant-border-radius);
}
```

---

## 8. Glassmorphism Special Handling

When `preset: "glassmorphism"` is active:

1. **Attribute Added**: `<html data-glass-effect="true">`
2. **CSS Overrides Activate**: All rules in `index.css` targeting `[data-glass-effect="true"]` apply
3. **Affected Components**:
   - `.ant-layout-sider` - Semi-transparent sidebar
   - `.ant-layout-header` - Frosted glass header
   - `.ant-card` - Glassmorphic cards
   - `.ant-drawer-content` - Blurred drawer backgrounds
   - `.ant-modal-content` - Blurred modal backgrounds
   - `.glass-card` - Custom class for any element

### Adding Glass Effect to Custom Components

```tsx
// Use the glass-card class for automatic glass styling
<div className="glass-card p-4 rounded-xl">
  This will have glassmorphism when the preset is active
</div>
```

---

## 9. Summary: Control Distribution

| Feature | Platform Dev | SaaS Admin | End User |
|---------|--------------|------------|----------|
| Create new presets | ✅ | ❌ | ❌ |
| Assign preset to tenant | ❌ | ✅ | ❌ |
| Set brand name/logo | ❌ | ✅ | ❌ |
| Set primary color | ❌ | ✅ | ❌ |
| Enable/disable dark mode toggle | ❌ | ✅ | ❌ |
| Toggle dark/light mode | ❌ | ❌ | ✅ |

---

*Last Updated: 2025-12-22*
