import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('l-') } } }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@hydrosure/shared': fileURLToPath(new URL('./src/shared/index.ts', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
})
