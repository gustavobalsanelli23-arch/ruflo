import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

declare global {
  interface Window {
    __meireReady?: boolean;
  }
}

// Avisa o script do <head> que as animações vão assumir (cancela o fallback).
window.__meireReady = true;

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Em produção o HTML já vem pré-renderizado (scripts/prerender.mjs): só hidratamos,
// depois do primeiro quadro, para a foto do hero ser pintada sem esperar o JS.
if (root.firstElementChild) requestAnimationFrame(() => setTimeout(() => hydrateRoot(root, app), 0));
else createRoot(root).render(app);
