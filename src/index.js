import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './app.css';
import App from './app.js';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);