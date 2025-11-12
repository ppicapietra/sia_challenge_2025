import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to copy HTML file after build
function copyHtml() {
  return {
    name: 'copy-html',
    writeBundle() {
      const htmlSource = resolve(__dirname, 'public/index.html');
      const htmlDest = resolve(__dirname, 'dist/public/index.html');
      
      if (!existsSync(resolve(__dirname, 'dist/public'))) {
        mkdirSync(resolve(__dirname, 'dist/public'), { recursive: true });
      }
      
      copyFileSync(htmlSource, htmlDest);
      console.log('✓ Copied index.html to dist/public/');
    }
  };
}

// Plugin to fix the IIFE output to expose channelApp globally
function exposeChannelApp() {
  return {
    name: 'expose-channel-app',
    writeBundle(options, bundle) {
      // Post-process the generated file
      const clientPath = resolve(__dirname, 'dist/public/client.js');
      
      if (existsSync(clientPath)) {
        let code = readFileSync(clientPath, 'utf8');
        
        // Check if channelApp is already assigned
        if (code.includes('function channelApp()') && !code.match(/var\s+channelApp\s*=/)) {
          // The IIFE wraps the function but doesn't assign it
          // We need to extract the function and assign it
          // Pattern: (function() { "use strict"; function channelApp() { ... } })();
          // Should become: var channelApp = function channelApp() { ... };
          
          // Find the function definition inside the IIFE
          const iifeMatch = code.match(/\(function\(\)\s*\{[\s\S]*?"use strict";\s*function\s+channelApp\(\)\s*\{([\s\S]*?)\}\s*\}\)\(\);/);
          if (iifeMatch) {
            // Replace the entire IIFE with a direct assignment
            code = code.replace(
              /\(function\(\)\s*\{[\s\S]*?"use strict";\s*function\s+channelApp\(\)\s*\{[\s\S]*?\}\s*\}\)\(\);/,
              `var channelApp = function channelApp() {${iifeMatch[1]}};`
            );
          }
        }
        
        // Ensure window.channelApp is set (remove duplicates first)
        code = code.replace(/\n\/\/ Expose to window[\s\S]*?window\.channelApp = channelApp;[\s\S]*?\}/g, '');
        if (!code.includes('window.channelApp')) {
          code += '\n\n// Expose to window for global access\nif (typeof window !== "undefined") {\n  window.channelApp = channelApp;\n}';
        }
        
        writeFileSync(clientPath, code, 'utf8');
      }
    }
  };
}

// Client build configuration
export default defineConfig({
  plugins: [copyHtml(), exposeChannelApp()],
  build: {
    outDir: 'dist/public',
    emptyOutDir: true, // Clean the output directory
    rollupOptions: {
      input: resolve(__dirname, 'public/client.js'),
      output: {
        entryFileNames: 'client.js',
        format: 'iife', // IIFE format for browser compatibility
        // Make channelApp available globally - this creates var channelApp = ...
        name: 'channelApp',
        // Preserve relative paths
        preserveModules: false
      },
      // Don't tree-shake - include everything
      treeshake: false
    },
    // Target ES2015 - will be transpiled by esbuild
    target: 'es2015',
    minify: false, // Set to 'terser' for production minification
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
