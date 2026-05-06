import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './index.css';
import React from 'react';
import App from './App';

const queryClient = new QueryClient();

// Apply dark mode
document.documentElement.classList.add('dark');

// Initialize the application
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

// Export empty panels for ElizaOS compatibility
export const panels: any[] = [];
