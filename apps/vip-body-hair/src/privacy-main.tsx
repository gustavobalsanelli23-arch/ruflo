import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { initAnalytics } from './lib/analytics';
import { PrivacyPage } from './PrivacyPage';
import './index.css';

const root = document.getElementById('root')!;
const page = (
  <StrictMode>
    <PrivacyPage />
  </StrictMode>
);

if (root.firstElementChild) hydrateRoot(root, page);
else createRoot(root).render(page);

initAnalytics();
