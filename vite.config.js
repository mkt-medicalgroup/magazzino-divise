import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: se pubblichi su GitHub Pages con un URL del tipo
// https://mkt-medicalgroup.github.io/nome-repository/
// cambia la riga "base" sotto in:  base: '/nome-repository/',
// Se invece usi un dominio personalizzato o Vercel/Netlify, lascia base: '/'

export default defineConfig({
  plugins: [react()],
  base: '/magazzino-divise/',
})
