import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

declare global {
  interface Window {
    __geriReady?: boolean;
  }
}

// Avisa o script do <head> que as animações vão assumir (cancela o fallback).
window.__geriReady = true;

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Em produção o HTML já vem pré-renderizado (scripts/prerender.mjs): só hidratamos.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
