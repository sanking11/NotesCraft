import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

/* localStorage polyfill — expose as window.storage with async-like API */
if (!window.storage) {
  window.storage = {
    get(key) {
      const v = localStorage.getItem(key);
      return Promise.resolve(v ? { value: v } : null);
    },
    set(key, value) {
      localStorage.setItem(key, value);
      return Promise.resolve(true);
    },
    delete(key) {
      localStorage.removeItem(key);
      return Promise.resolve(true);
    },
    list(prefix = '') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return Promise.resolve({ keys });
    },
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
