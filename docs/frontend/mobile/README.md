# React Native Integration

> Mobile wrapper for the web application.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT NATIVE APP                              │
├─────────────────────────────────────────────────────────────────┤
│  Native Features:                                                │
│  - Geo location tracking                                         │
│  - Push notifications                                            │
│  - Camera/media access                                           │
│  - Offline storage                                               │
│  - Deep linking                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    WEBVIEW CONTAINER                             │
│  - Loads mini version of web app                                 │
│  - Injects native context                                        │
│  - Bridges native ↔ web communication                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    WEB APP (mini_project)                        │
│  - Receives injected context                                     │
│  - Runs in WebView                                               │
│  - Responsive mobile UI                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Context Injection

The RN app injects context into the WebView:

```typescript
// React Native side
const injectedContext = {
  platform: 'mobile',
  deviceId: deviceInfo.id,
  pushToken: notificationToken,
  location: currentLocation,
  isOffline: netInfo.isConnected === false,
};

<WebView
  source={{ uri: webAppUrl }}
  injectedJavaScriptBeforeContentLoaded={`
    window.__NATIVE_CONTEXT__ = ${JSON.stringify(injectedContext)};
  `}
/>
```

---

## Web App Detection

```typescript
// Web app side
const isNativeApp = (): boolean => {
  return typeof window !== 'undefined' && window.__NATIVE_CONTEXT__ !== undefined;
};

const getNativeContext = () => {
  return window.__NATIVE_CONTEXT__ || {};
};
```

---

## Native Features Used

| Feature | Purpose | Status |
|---------|---------|--------|
| Geolocation | Field service tracking | 🟡 TBD |
| Push Notifications | Alerts, messages | 🟡 TBD |
| Camera | Document scanning | 🟡 TBD |
| Background Location | Route tracking | 🟡 TBD |

---

## TODO

- [ ] Document RN repo location
- [ ] Document build process
- [ ] Document bridge API
- [ ] Document offline mode

---

*Last Updated: 2025-12-25 — Placeholder for RN documentation*
