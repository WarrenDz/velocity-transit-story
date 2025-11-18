import { defineConfig } from 'vite';

// Use repo name as the base for GitHub Pages when building for production
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/velocity-transit-story/' : '/'
});
