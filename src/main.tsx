// // import { StrictMode } from 'react';
// // import { createRoot } from 'react-dom/client';
// // import { registerSW } from 'virtual:pwa-register';
// // import App from './App.tsx';
// // import './i18n';
// // import './index.css';
// // import './utils/deviceTypeStore.ts'; // This defines window.isMobile

// // // Initialize i18n before rendering
// // import './i18n';

// // // Register service worker
// // const updateSW = registerSW({
// //   onNeedRefresh() {
// //     if (confirm('New content available. Reload?')) {
// //       updateSW(true);
// //     }
// //   },
// //   onOfflineReady() {
// //     console.log('App ready to work offline');
// //   },
// // });

// // createRoot(document.getElementById('root')!).render(
// //   // <StrictMode>
// //     <App />
// //   // </StrictMode>
// // );


// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import { registerSW } from 'virtual:pwa-register';
// import { App as AntApp } from 'antd';
// import App from './App.tsx';
// import './i18n';
// import './index.css';
// import './utils/deviceTypeStore.ts'; // This defines window.isMobile

// // Initialize i18n before rendering
// import './i18n';

// // Register service worker
// const updateSW = registerSW({
//   onNeedRefresh() {
//     if (confirm('New content available. Reload?')) {
//       updateSW(true);
//     }
//   },
//   onOfflineReady() {
//     console.log('App ready to work offline');
//   },
// });

// createRoot(document.getElementById('root')!).render(
//   // <StrictMode>
//     <AntApp>
//       <App />
//     </AntApp>
//   // </StrictMode>
// );


// src/main.tsx

import React from 'react'; // Import React if using StrictMode (optional)
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// No need to import AntApp here anymore
import App from './App.tsx';
import './i18n'; // Initialize i18n before rendering
import './index.css';
import './utils/deviceTypeStore.ts'; // This defines window.isMobile

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('PWA: New content available, prompting user.');
    // Keep the confirm prompt or implement a custom UI notification
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('PWA: App ready to work offline');
  },
});

// Get the root element
const rootElement = document.getElementById('root');

// Ensure the root element exists before creating the root
if (rootElement) {
  createRoot(rootElement).render(
    // <React.StrictMode> // Optional: Uncomment if needed for development checks
      <App /> // Render App directly without the extra AntApp wrapper
    // </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element. Make sure your index.html has <div id="root"></div>.');
}