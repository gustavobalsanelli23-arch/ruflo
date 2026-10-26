import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Em produção o HTML já vem pré-renderizado (scripts/prerender.mjs): só hidratamos.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);

window.__vopReady = true;
document.documentElement.classList.remove('no-js');
