import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import App from "./App";

// Register service worker for caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Silenciar logs en PRODUCCIÓN (o si REACT_APP_DISABLE_LOGS === 'true')
if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_DISABLE_LOGS === 'true') {
  const noop = () => {};
  const methods = ['log','info','debug','warn','error','trace','table','time','timeEnd','group','groupCollapsed','groupEnd','dir'];
  if (typeof window !== 'undefined' && window.console) {
    methods.forEach(m => {
      try {
        if (typeof window.console[m] === 'function') {
          window.console[m] = noop;
        } else {
          window.console[m] = noop;
        }
      } catch (_) {
        // ignorar
      }
    });
  }
}
const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);