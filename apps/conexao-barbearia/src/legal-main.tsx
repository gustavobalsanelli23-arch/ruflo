import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { LegalPage } from './components/LegalPage';
import type { LegalSlug } from './data/legal';
import { initAnalytics } from './lib/analytics';
import './index.css';

const slug = (document.body.dataset.page ?? 'termos-de-uso') as LegalSlug;
const root = document.getElementById('root')!;
const page = (
  <StrictMode>
    <LegalPage slug={slug} />
  </StrictMode>
);

if (root.firstElementChild) hydrateRoot(root, page);
else createRoot(root).render(page);

initAnalytics();
