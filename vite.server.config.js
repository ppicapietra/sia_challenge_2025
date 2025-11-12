import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server build configuration
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't empty - client build already created public folder
    ssr: true, // Server-side rendering mode
    rollupOptions: {
      input: {
        server: resolve(__dirname, 'src/server.js'),
        const: resolve(__dirname, 'src/const.js')
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es', // ES modules for Node.js
        // Preserve module structure for relative imports
        preserveModules: false
      },
      // Externalize node_modules - don't bundle them
      external: (id) => {
        // Externalize all node_modules and Node.js built-ins
        return !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\\') && !id.startsWith(resolve(__dirname));
      }
    },
    target: 'node18', // Target Node.js 18+
    minify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});

