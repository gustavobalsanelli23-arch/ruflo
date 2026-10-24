import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Em produção a abertura vem embutida no HTML (scripts/prerender.mjs) e começa
// sem esperar este bundle. No desenvolvimento, não há pré-renderização.
if (import.meta.env.DEV) void import('./lib/intro').then((m) => m.playIntro());

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Em produção o HTML já vem pré-renderizado (scripts/prerender.mjs): só hidratamos.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
