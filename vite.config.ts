import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
export default defineConfig({css:{postcss:{plugins:[tailwindcss()]}},plugins:[vinext()]});
