/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />


interface ReactNativeWebView {
  postMessage: (message: string) => void;
}

interface Window {
  ReactNativeWebView?: ReactNativeWebView;
}
