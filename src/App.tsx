// // // import React, { useEffect } from 'react';
// // // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// // // import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// // // import { BrowserRouter } from 'react-router-dom';
// // // import { App as AntApp } from 'antd';
// // // import AppRoutes from './routes';
// // // import { ThemeProvider } from './components/shared/ThemeProvider';
// // // import './i18n';
// // // import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
// // // import { persistQueryClient } from '@tanstack/react-query-persist-client';
// // // import './App.css';
// // // import { NestedProvider } from './lib/NestedContext';
// // // import { supabase } from './lib/supabase';

// // // const isDev = import.meta.env.VITE_APP_ENV === 'development';

// // // const queryClient = new QueryClient({
// // //   defaultOptions: {
// // //     queries: {
// // //       staleTime: isDev ? 10 : 1000 * 60 * 5, // Data remains fresh for 5 minutes
// // //       cacheTime: isDev ? 10 : 1000 * 60 * 30, // Cache persists for 30 minutes
// // //       retry: 1, // Retry failed requests 3 times
// // //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// // //       refetchOnWindowFocus: true, // Refresh data when window regains focus
// // //       refetchOnReconnect: true, // Refresh data on network reconnection
// // //     },
// // //     mutations: {
// // //       retry: 1,
// // //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// // //     },
// // //   },
// // // });


// // // if (!isDev) {
// // //   const persister = createSyncStoragePersister({
// // //     storage: window.localStorage,
// // //     key: 'QUERY_CACHE',
// // //   });

// // //   persistQueryClient({
// // //     queryClient,
// // //     persister,
// // //     maxAge: 1000 * 60 * 60 * 24, // 24 hours
// // //   });
// // // }


// // // function App() {
// // //   /**
// // //    * Handles authentication for the React Native WebView.
// // //    *
// // //    * This effect hook manages the two-way handshake required for the web app
// // //    * to receive session data when embedded in a React Native WebView.
// // //    *
// // //    * Here's how it works:
// // //    * 1. It adds an event listener to intercept messages from the native host.
// // //    * 2. When a 'SESSION_DATA' message is received, it uses the Supabase client
// // //    *    to set the session, effectively logging the user in.
// // //    * 3. It checks for the existence of `window.ReactNativeWebView`, which is
// // //    *    injected by the native app.
// // //    * 4. If the app is running in the WebView, it sends a 'REQUEST_SESSION'
// // //    *    message to the native host, initiating the handshake.
// // //    *
// // //    * This ensures seamless authentication between the native and web layers.
// // //    */

// // //   // -------------- Jules agent fixed code not working ------------
// // //   // The main issue is that the code is attaching a global event listener that reacts to a standard browser event: 'message'
// // //   // useEffect(() => {
// // //   //   const handleWebViewMessage = async (event: MessageEvent) => {
// // //   //     try {
// // //   //       const message = JSON.parse(event.data);
// // //   //       if (message.type === 'SESSION_DATA' && message.session) {
// // //   //         console.log('Received session data from React Native:', message.session);

// // //   //         // Use the received session to authenticate the user in the web app
// // //   //         const { error } = await supabase.auth.setSession(message.session);
// // //   //         if (error) {
// // //   //           console.error('Error setting session in Supabase:', error);
// // //   //         } else {
// // //   //           console.log('Session successfully set in web app.');
// // //   //           // Optionally, you can force a re-render or redirect here if needed
// // //   //           window.location.reload();
// // //   //         }
// // //   //       }
// // //   //     } catch (error) {
// // //   //       // Ignore errors from non-JSON messages
// // //   //     }
// // //   //   };

// // //   //   window.addEventListener('message', handleWebViewMessage);

// // //   //   // If running inside a React Native WebView, request the session
// // //   //   if (window.ReactNativeWebView) {
// // //   //     console.log('Requesting session from React Native...');
// // //   //     window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));
// // //   //   }

// // //   //   return () => {
// // //   //     window.removeEventListener('message', handleWebViewMessage);
// // //   //   };
// // //   // }, []);

// // //   useEffect(() => {
// // //     // 1. Check if we are running inside the React Native WebView.
// // //     if (window.ReactNativeWebView) {
// // //       console.log('Detected React Native WebView environment. Starting handshake.');

// // //       // 2. Define the handler *only* if the environment is RN.
// // //       const handleWebViewMessage = async (event) => {
// // //         // NOTE: In a regular browser, this code is now completely skipped.
// // //         try {
// // //           const message = JSON.parse(event.data);

// // //           if (message.type === 'SESSION_DATA' && message.session) {
// // //             console.log('Received session data from React Native:', message.session);

// // //             // Use the received session to authenticate the user in the web app
// // //             const { error } = await supabase.auth.setSession(message.session);

// // //             if (error) {
// // //               console.error('Error setting session in Supabase:', error);
// // //             } else {
// // //               console.log('Session successfully set in web app. (No reload)');
// // //               // If you need a *specific* action after successful login (like redirecting
// // //               // to the dashboard), use React Router's `Maps` hook here, 
// // //               // not `window.location.reload()`.
// // //             }
// // //           }
// // //         } catch (error) {
// // //           // Ignore errors from non-JSON messages
// // //         }
// // //       };

// // //       // 3. Attach the listener *only* in the RN environment.
// // //       window.addEventListener('message', handleWebViewMessage);

// // //       // 4. Initiate the handshake *only* in the RN environment.
// // //       console.log('Requesting session from React Native...');
// // //       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));

// // //       // 5. Clean up the listener *only* if it was added.
// // //       return () => {
// // //         window.removeEventListener('message', handleWebViewMessage);
// // //       };
// // //     }

// // //     // If not in a WebView, the useEffect returns an empty cleanup function (default),
// // //     // and no event listener is ever added.

// // //   }, []); // The empty dependency array is correct.
// // // //   By moving the logic inside the if (window.ReactNativeWebView) block, you ensure:

// // // // Regular Browser: The useEffect runs, the if condition is false, and nothing happens. There is zero interference.

// // // // RN WebView: The useEffect runs, the if condition is true, and the session handshake is executed correctly, ensuring a seamless login
// // //   // -------------- Jules agent fixed code not working , Fixed Manually ------------

// // //   return (
// // //     <QueryClientProvider client={queryClient}>
// // //       <ThemeProvider>
// // //         <AntApp>
// // //           <BrowserRouter>
// // //           <NestedProvider>
// // //             <AppRoutes />
// // //           </NestedProvider>
// // //           </BrowserRouter>
// // //         </AntApp>
// // //       </ThemeProvider>
// // //       {/* <ReactQueryDevtools initialIsOpen={false} /> */}
// // //     </QueryClientProvider>
// // //   );
// // // }

// // // export default App;



// // // src/App.tsx

// // import React, { useEffect } from 'react';
// // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// // // Removed ReactQueryDevtools import as it was commented out in render
// // import { BrowserRouter } from 'react-router-dom';
// // import { App as AntApp } from 'antd'; // Keep this AntApp wrapper
// // import AppRoutes from './routes';
// // import { ThemeProvider } from './components/shared/ThemeProvider';
// // import './i18n'; // Keep i18n import for initialization context if needed
// // import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
// // import { persistQueryClient } from '@tanstack/react-query-persist-client';
// // import './App.css';
// // import { NestedProvider } from './lib/NestedContext';
// // import { supabase } from './lib/supabase'; // Keep Supabase import if needed (e.g., for RN effect)

// // const isDev = import.meta.env.VITE_APP_ENV === 'development';

// // // --- Query Client Setup (Keep as is) ---
// // const queryClient = new QueryClient({
// //   defaultOptions: {
// //     queries: {
// //       staleTime: isDev ? 10 : 1000 * 60 * 5,
// //       cacheTime: isDev ? 10 : 1000 * 60 * 30,
// //       retry: 1,
// //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// //       refetchOnWindowFocus: true,
// //       refetchOnReconnect: true,
// //     },
// //     mutations: {
// //       retry: 1,
// //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// //     },
// //   },
// // });

// // // --- Query Client Persistence (Keep as is) ---
// // if (!isDev) {
// //   const persister = createSyncStoragePersister({
// //     storage: window.localStorage,
// //     key: 'QUERY_CACHE',
// //   });

// //   persistQueryClient({
// //     queryClient,
// //     persister,
// //     maxAge: 1000 * 60 * 60 * 24, // 24 hours
// //   });
// // }

// // function App() {

// //   // --- React Native WebView Handshake Effect (Keep commented out or remove if not needed) ---
// //   useEffect(() => {
// //     // 1. Check if we are running inside the React Native WebView.
// //     if (window.ReactNativeWebView) {
// //       console.log('Detected React Native WebView environment. Starting handshake.');

// //       // 2. Define the handler *only* if the environment is RN.
// //       const handleWebViewMessage = async (event: MessageEvent) => { // Added type annotation
// //         try {
// //           // Ensure event.data is a string before parsing
// //           if (typeof event.data === 'string') {
// //               const message = JSON.parse(event.data);

// //               if (message.type === 'SESSION_DATA' && message.session) {
// //                 console.log('Received session data from React Native:', message.session);
// //                 const { error } = await supabase.auth.setSession(message.session);
// //                 if (error) {
// //                   console.error('Error setting session in Supabase:', error);
// //                 } else {
// //                   console.log('Session successfully set in web app. (No reload)');
// //                   // Consider using navigate hook from react-router if redirect is needed
// //                 }
// //               }
// //           }
// //         } catch (error) {
// //           // Ignore errors from non-JSON messages or invalid event data
// //            console.warn('Error processing message from RN WebView:', error);
// //         }
// //       };

// //       // 3. Attach the listener *only* in the RN environment.
// //       window.addEventListener('message', handleWebViewMessage);

// //       // 4. Initiate the handshake *only* in the RN environment.
// //       console.log('Requesting session from React Native...');
// //       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));

// //       // 5. Clean up the listener *only* if it was added.
// //       return () => {
// //         console.log('Cleaning up RN WebView message listener.');
// //         window.removeEventListener('message', handleWebViewMessage);
// //       };
// //     } else {
// //         console.log('Not running in RN WebView environment.');
// //     }
// //     // If not in a WebView, the useEffect returns undefined (implicitly),
// //     // and no event listener is ever added.
// //   }, []); // Empty dependency array is correct for mount/unmount behavior

// //   // --- Component Render ---
// //   return (
// //     <QueryClientProvider client={queryClient}>
// //       <ThemeProvider>
// //         {/* This is the single, necessary AntApp provider */}
// //         <AntApp>
// //           <BrowserRouter>
// //             {/* NestedProvider wraps AppRoutes */}
// //             <NestedProvider>
// //               <AppRoutes />
// //             </NestedProvider>
// //           </BrowserRouter>
// //         </AntApp>
// //       </ThemeProvider>
// //       {/* <ReactQueryDevtools initialIsOpen={false} /> // Keep commented if not needed */}
// //     </QueryClientProvider>
// //   );
// // }

// // export default App;


// // src/App.tsx

// import React, { useEffect } from 'react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { BrowserRouter } from 'react-router-dom';
// import { App as AntApp } from 'antd';
// import AppRoutes from './routes';
// import { ThemeProvider } from './components/shared/ThemeProvider';
// import './i18n';
//     queries: {
//       staleTime: isDev ? 10 : 1000 * 60 * 5,
//       cacheTime: isDev ? 10 : 1000 * 60 * 30,
//       retry: 1,
//       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
//       refetchOnWindowFocus: true,
//       refetchOnReconnect: true,
//     },
//     mutations: {
//       retry: 1,
//       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
//     },
//   },
// });

// if (!isDev) {
//   const persister = createSyncStoragePersister({
//     storage: window.localStorage,
//     key: 'QUERY_CACHE',
//   });

//   persistQueryClient({
//     queryClient,
//     persister,
//     maxAge: 1000 * 60 * 60 * 24, // 24 hours
//   });
// }

// function App() {

//   useEffect(() => {
//     if (window.ReactNativeWebView) {
//       console.log('Detected React Native WebView environment. Starting handshake.');
//       const handleWebViewMessage = async (event: MessageEvent) => {
//         try {
//           if (typeof event.data === 'string') {
//               const message = JSON.parse(event.data);
//               if (message.type === 'SESSION_DATA' && message.session) {
//                 console.log('Received session data from React Native:', message.session);
//                 const { error } = await supabase.auth.setSession(message.session);
//                 if (error) {
//                   console.error('Error setting session in Supabase:', error);
//                 } else {
//                   console.log('Session successfully set in web app.');
//                 }
//               }
//           }
//         } catch (error) {
//            console.warn('Error processing message from RN WebView:', error);
//         }
//       };
//       window.addEventListener('message', handleWebViewMessage);
//       console.log('Requesting session from React Native...');
//       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));
//       return () => {
//         console.log('Cleaning up RN WebView message listener.');
//         window.removeEventListener('message', handleWebViewMessage);
//       };
//     }
//   }, []);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <SessionManager />
//       <GlobalSessionWatcher />
//       <ThemeProvider>
//         <AntApp>
//           <BrowserRouter>
//             <NestedProvider>
//               <AppRoutes />
//             </NestedProvider>
//           </BrowserRouter>
//         </AntApp>
//       </ThemeProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;


// // import React, { useEffect } from 'react';
// // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// // import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// // import { BrowserRouter } from 'react-router-dom';
// // import { App as AntApp } from 'antd';
// // import AppRoutes from './routes';
// // import { ThemeProvider } from './components/shared/ThemeProvider';
// // import './i18n';
// // import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
// // import { persistQueryClient } from '@tanstack/react-query-persist-client';
// // import './App.css';
// // import { NestedProvider } from './lib/NestedContext';
// // import { supabase } from './lib/supabase';

// // const isDev = import.meta.env.VITE_APP_ENV === 'development';

// // const queryClient = new QueryClient({
// //   defaultOptions: {
// //     queries: {
// //       staleTime: isDev ? 10 : 1000 * 60 * 5, // Data remains fresh for 5 minutes
// //       cacheTime: isDev ? 10 : 1000 * 60 * 30, // Cache persists for 30 minutes
// //       retry: 1, // Retry failed requests 3 times
// //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// //       refetchOnWindowFocus: true, // Refresh data when window regains focus
// //       refetchOnReconnect: true, // Refresh data on network reconnection
// //     },
// //     mutations: {
// //       retry: 1,
// //       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
// //     },
// //   },
// // });


// // if (!isDev) {
// //   const persister = createSyncStoragePersister({
// //     storage: window.localStorage,
// //     key: 'QUERY_CACHE',
// //   });

// //   persistQueryClient({
// //     queryClient,
// //     persister,
// //     maxAge: 1000 * 60 * 60 * 24, // 24 hours
// //   });
// // }


// // function App() {
// //   /**
// //    * Handles authentication for the React Native WebView.
// //    *
// //    * This effect hook manages the two-way handshake required for the web app
// //    * to receive session data when embedded in a React Native WebView.
// //    *
// //    * Here's how it works:
// //    * 1. It adds an event listener to intercept messages from the native host.
// //    * 2. When a 'SESSION_DATA' message is received, it uses the Supabase client
// //    *    to set the session, effectively logging the user in.
// //    * 3. It checks for the existence of `window.ReactNativeWebView`, which is
// //    *    injected by the native app.
// //    * 4. If the app is running in the WebView, it sends a 'REQUEST_SESSION'
// //    *    message to the native host, initiating the handshake.
// //    *
// //    * This ensures seamless authentication between the native and web layers.
// //    */

// //   // -------------- Jules agent fixed code not working ------------
// //   // The main issue is that the code is attaching a global event listener that reacts to a standard browser event: 'message'
// //   // useEffect(() => {
// //   //   const handleWebViewMessage = async (event: MessageEvent) => {
// //   //     try {
// //   //       const message = JSON.parse(event.data);
// //   //       if (message.type === 'SESSION_DATA' && message.session) {
// //   //         console.log('Received session data from React Native:', message.session);

// //   //         // Use the received session to authenticate the user in the web app
// //   //         const { error } = await supabase.auth.setSession(message.session);
// //   //         if (error) {
// //   //           console.error('Error setting session in Supabase:', error);
// //   //         } else {
// //   //           console.log('Session successfully set in web app.');
// //   //           // Optionally, you can force a re-render or redirect here if needed
// //   //           window.location.reload();
// //   //         }
// //   //       }
// //   //     } catch (error) {
// //   //       // Ignore errors from non-JSON messages
// //   //     }
// //   //   };

// //   //   window.addEventListener('message', handleWebViewMessage);

// //   //   // If running inside a React Native WebView, request the session
// //   //   if (window.ReactNativeWebView) {
// //   //     console.log('Requesting session from React Native...');
// //   //     window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));
// //   //   }

// //   //   return () => {
// //   //     window.removeEventListener('message', handleWebViewMessage);
// //   //   };
// //   // }, []);

// //   useEffect(() => {
// //     // 1. Check if we are running inside the React Native WebView.
// //     if (window.ReactNativeWebView) {
// //       console.log('Detected React Native WebView environment. Starting handshake.');

// //       // 2. Define the handler *only* if the environment is RN.
// //       const handleWebViewMessage = async (event) => {
// //         // NOTE: In a regular browser, this code is now completely skipped.
// //         try {
// //           const message = JSON.parse(event.data);

// //           if (message.type === 'SESSION_DATA' && message.session) {
// //             console.log('Received session data from React Native:', message.session);

// //             // Use the received session to authenticate the user in the web app
// //             const { error } = await supabase.auth.setSession(message.session);

// //             if (error) {
// //               console.error('Error setting session in Supabase:', error);
// //             } else {
// //               console.log('Session successfully set in web app. (No reload)');
// //               // If you need a *specific* action after successful login (like redirecting
// //               // to the dashboard), use React Router's `Maps` hook here, 
// //               // not `window.location.reload()`.
// //             }
// //           }
// //         } catch (error) {
// //           // Ignore errors from non-JSON messages
// //         }
// //       };

// //       // 3. Attach the listener *only* in the RN environment.
// //       window.addEventListener('message', handleWebViewMessage);

// //       // 4. Initiate the handshake *only* in the RN environment.
// //       console.log('Requesting session from React Native...');
// //       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));

// //       // 5. Clean up the listener *only* if it was added.
// //       return () => {
// //         window.removeEventListener('message', handleWebViewMessage);
// //       };
// //     }

// //     // If not in a WebView, the useEffect returns an empty cleanup function (default),
// //     // and no event listener is ever added.

// //   }, []); // The empty dependency array is correct.
// // //   By moving the logic inside the if (window.ReactNativeWebView) block, you ensure:

// // // Regular Browser: The useEffect runs, the if condition is false, and nothing happens. There is zero interference.

// // // RN WebView: The useEffect runs, the if condition is true, and the session handshake is executed correctly, ensuring a seamless login
// //   // -------------- Jules agent fixed code not working , Fixed Manually ------------

// //   return (
// //     <QueryClientProvider client={queryClient}>
// //       <ThemeProvider>
// //         <AntApp>
// //           <BrowserRouter>
// //           <NestedProvider>
// //             <AppRoutes />
// //           </NestedProvider>
// //           </BrowserRouter>
// //         </AntApp>
// //       </ThemeProvider>
// //       {/* <ReactQueryDevtools initialIsOpen={false} /> */}
// //     </QueryClientProvider>
// //   );
// // }

// // export default App;



// // src/App.tsx

// import React, { useEffect } from 'react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// // Removed ReactQueryDevtools import as it was commented out in render
// import { BrowserRouter } from 'react-router-dom';
// import { App as AntApp } from 'antd'; // Keep this AntApp wrapper
// import AppRoutes from './routes';
// import { ThemeProvider } from './components/shared/ThemeProvider';
// import './i18n'; // Keep i18n import for initialization context if needed
// import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
// import { persistQueryClient } from '@tanstack/react-query-persist-client';
// import './App.css';
// import { NestedProvider } from './lib/NestedContext';
// import { supabase } from './lib/supabase'; // Keep Supabase import if needed (e.g., for RN effect)

// const isDev = import.meta.env.VITE_APP_ENV === 'development';

// // --- Query Client Setup (Keep as is) ---
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: isDev ? 10 : 1000 * 60 * 5,
//       cacheTime: isDev ? 10 : 1000 * 60 * 30,
//       retry: 1,
//       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
//       refetchOnWindowFocus: true,
//       refetchOnReconnect: true,
//     },
//     mutations: {
//       retry: 1,
//       retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
//     },
//   },
// });

// // --- Query Client Persistence (Keep as is) ---
// if (!isDev) {
//   const persister = createSyncStoragePersister({
//     storage: window.localStorage,
//     key: 'QUERY_CACHE',
//   });

//   persistQueryClient({
//     queryClient,
//     persister,
//     maxAge: 1000 * 60 * 60 * 24, // 24 hours
//   });
// }

// function App() {

//   // --- React Native WebView Handshake Effect (Keep commented out or remove if not needed) ---
//   useEffect(() => {
//     // 1. Check if we are running inside the React Native WebView.
//     if (window.ReactNativeWebView) {
//       console.log('Detected React Native WebView environment. Starting handshake.');

//       // 2. Define the handler *only* if the environment is RN.
//       const handleWebViewMessage = async (event: MessageEvent) => { // Added type annotation
//         try {
//           // Ensure event.data is a string before parsing
//           if (typeof event.data === 'string') {
//               const message = JSON.parse(event.data);

//               if (message.type === 'SESSION_DATA' && message.session) {
//                 console.log('Received session data from React Native:', message.session);
//                 const { error } = await supabase.auth.setSession(message.session);
//                 if (error) {
//                   console.error('Error setting session in Supabase:', error);
//                 } else {
//                   console.log('Session successfully set in web app. (No reload)');
//                   // Consider using navigate hook from react-router if redirect is needed
//                 }
//               }
//           }
//         } catch (error) {
//           // Ignore errors from non-JSON messages or invalid event data
//            console.warn('Error processing message from RN WebView:', error);
//         }
//       };

//       // 3. Attach the listener *only* in the RN environment.
//       window.addEventListener('message', handleWebViewMessage);

//       // 4. Initiate the handshake *only* in the RN environment.
//       console.log('Requesting session from React Native...');
//       window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));

//       // 5. Clean up the listener *only* if it was added.
//       return () => {
//         console.log('Cleaning up RN WebView message listener.');
//         window.removeEventListener('message', handleWebViewMessage);
//       };
//     } else {
//         console.log('Not running in RN WebView environment.');
//     }
//     // If not in a WebView, the useEffect returns undefined (implicitly),
//     // and no event listener is ever added.
//   }, []); // Empty dependency array is correct for mount/unmount behavior

//   // --- Component Render ---
//   return (
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         {/* This is the single, necessary AntApp provider */}
//         <AntApp>
//           <BrowserRouter>
//             {/* NestedProvider wraps AppRoutes */}
//             <NestedProvider>
//               <AppRoutes />
//             </NestedProvider>
//           </BrowserRouter>
//         </AntApp>
//       </ThemeProvider>
//       {/* <ReactQueryDevtools initialIsOpen={false} /> // Keep commented if not needed */}
//     </QueryClientProvider>
//   );
// }

// export default App;


// src/App.tsx

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App as AntApp } from 'antd';
import AppRoutes from './routes';
import { ThemeProvider } from './core/components/shared/ThemeProvider';
import './i18n';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import './App.css';
import { NestedProvider } from './lib/NestedContext';
import { supabase } from './lib/supabase';
import { SessionManager } from './core/components/Layout/SessionManager'; // Import the new SessionManager
import { GlobalSessionWatcher } from './core/components/Layout/GlobalSessionWatcher'; // Import the new GlobalSessionWatcher

const isDev = import.meta.env.DEV;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isDev ? 10 : 1000 * 60 * 5,
      cacheTime: isDev ? 10 : 1000 * 60 * 30,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

if (!isDev) {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'QUERY_CACHE',
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });
}

import { TenantProvider } from '@/core/bootstrap/TenantProvider';
import { ThemeProvider as CoreThemeProvider } from '@/core/theme/ThemeProvider';

function App() {

  useEffect(() => {
    if (window.ReactNativeWebView) {
      console.log('Detected React Native WebView environment. Starting handshake.');
      const handleWebViewMessage = async (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            if (message.type === 'SESSION_DATA' && message.session) {
              console.log('Received session data from React Native:', message.session);
              const { error } = await supabase.auth.setSession(message.session);
              if (error) {
                console.error('Error setting session in Supabase:', error);
              } else {
                console.log('Session successfully set in web app.');
              }
            }
          }
        } catch (error) {
          console.warn('Error processing message from RN WebView:', error);
        }
      };
      window.addEventListener('message', handleWebViewMessage);
      console.log('Requesting session from React Native...');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SESSION' }));
      return () => {
        console.log('Cleaning up RN WebView message listener.');
        window.removeEventListener('message', handleWebViewMessage);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <CoreThemeProvider>
          <AntApp>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <SessionManager />
              <GlobalSessionWatcher />
              <NestedProvider>
                <AppRoutes />
              </NestedProvider>
            </BrowserRouter>
          </AntApp>
        </CoreThemeProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;