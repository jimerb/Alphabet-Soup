import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '');
export default defineConfig({
  base: basePath ? `${basePath}/` : '/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
});
