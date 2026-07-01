import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: se pubblichi su GitHub Pages con un URL del tipo
// https://tuonome.github.io/nome-repository/
// cambia la riga "base" sotto in:  base: '/magazzino-divise/',
// Se invece usi un dominio personalizzato o Vercel/Netlify, lascia base: '/'

export default defineConfig({
  plugins: [react()],
  base: '/',
})
