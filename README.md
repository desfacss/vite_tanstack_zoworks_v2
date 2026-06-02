# Mini Project

A minimal standalone project scaffolding derived from the main `vite_tanstack_bolt` project. This project includes all the core infrastructure needed for rapid module development.

## Features Included

### ✅ Authentication & Session Management
- Login/Logout flow with Supabase Auth
- Session hydration via `jwt_get_user_session` RPC
- Auth state management with Zustand (`useAuthStore`)
- Route protection with `AuthGuard`
- Session persistence and automatic refresh

### ✅ Organization & Location Switching
- Org switcher in Header
- Location switcher
- Session re-fetch on org change
- Persistence via `set_preferred_organization` RPC

### ✅ Theme System
- Light/Dark mode toggle
- Ant Design ConfigProvider integration
- Theme persistence with `useThemeStore`

### ✅ Internationalization (i18n)
- Multi-language support with react-i18next
- Locales: English, French, Hindi, Kannada, Tamil, Telugu, Marathi
- Language switcher component

### ✅ DynamicViews System
- Table view
- Grid/Card view
- Kanban board
- Calendar view
- Dashboard with widgets
- Metrics view
- Global filters & actions
- Import/Export functionality

### ✅ DynamicForms System
- RJSF-based dynamic forms
- Custom widgets
- Field templates
- Form validation

### ✅ Layout Components
- AuthedLayout (sidebar, header, content area)
- PublicLayout (for auth pages)
- Responsive design (mobile/desktop)
- Profile menu with logout

### ✅ Pages Included
| Route | Description |
|-------|-------------|
| `/` | Public home page |
| `/login` | Login page |
| `/signup` | Sign up page |
| `/reset_password` | Password reset |
| `/dashboard` | Dynamic dashboard |
| `/crm/contacts` | Contacts page (DynamicViews demo) |
| `/profile` | User profile |
| `/user-settings` | User settings |
| `/sample` | Sample page for new module development |

## Setup

### 1. Copy to a new location
```bash
cp -r mini_project /path/to/your/new/project
cd /path/to/your/new/project
```

### 2. Create `.env` file
```bash
# Copy from the main project or create new one
cp ../.env .env

# Or create with these variables:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WORKSPACE=your_workspace
VITE_APP_URL=http://localhost:5173
VITE_API_BASE_URL=your_api_base_url
```

### 3. Install dependencies
```bash
yarn install
# or
npm install
```

### 4. Run development server
```bash
yarn dev
# or
npm run dev
```

## Developing a New Module

1. **Create your page component** in `src/pages/`
2. **Add your route** in `src/routes/index.tsx`
3. **Update navigation** in the `generateNavItems` function in routes
4. **Use DynamicViews** for list pages:
   ```tsx
   import DynamicViews from "../components/DynamicViews";

   const MyPage = () => (
     <DynamicViews 
       entityType="my_entity"
       entitySchema="my_schema"
     />
   );
   ```
5. **Use DynamicForm** for create/edit forms
6. **Connect to Supabase** tables for data

## Project Structure

```
src/
├── components/
│   ├── DynamicViews/    # Dynamic view rendering system
│   ├── Layout/          # AuthedLayout, Header, Sider, etc.
│   ├── common/          # DynamicForm, utilities
│   ├── pages/           # Reusable page components
│   └── shared/          # ThemeProvider, LoadingFallback
├── config/              # menuConfig.json
├── hooks/               # useUserSession, useSettings
├── i18n/                # Internationalization
├── lib/                 # store, supabase client, theme, types
├── pages/               # Route pages
├── routes/              # Router configuration
├── schemas/             # JSON schemas for forms/views
├── types/               # TypeScript types
└── utils/               # Constants, device detection
```

## Notes

- Uses the **same Supabase project** as the main app
- Authentication works with existing users
- Theme and language preferences persist
- CSS uses TailwindCSS + Ant Design
