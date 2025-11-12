import { build } from 'vite';
import { rmSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import clientConfig from '../vite.config.js';
import serverConfig from '../vite.server.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function buildAll() {
  console.log('🚀 Starting build process...\n');

  // Clean dist directory
  console.log('📦 Cleaning dist directory...');
  if (existsSync(resolve(rootDir, 'dist'))) {
    rmSync(resolve(rootDir, 'dist'), { recursive: true, force: true });
  }
  mkdirSync(resolve(rootDir, 'dist'), { recursive: true });
  mkdirSync(resolve(rootDir, 'dist/public'), { recursive: true });

  // Build client
  console.log('\n🌐 Building client code...');
  try {
    await build(clientConfig);
    console.log('✓ Client build completed\n');
  } catch (error) {
    console.error('❌ Client build failed:', error);
    process.exit(1);
  }

  // Build server
  console.log('🖥️  Building server code...');
  try {
    await build(serverConfig);
    console.log('✓ Server build completed\n');
  } catch (error) {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  }

  // Copy HTML file (if not already copied by plugin)
  const htmlSource = resolve(rootDir, 'public/index.html');
  const htmlDest = resolve(rootDir, 'dist/public/index.html');
  if (existsSync(htmlSource) && !existsSync(htmlDest)) {
    copyFileSync(htmlSource, htmlDest);
    console.log('✓ Copied index.html\n');
  }

  // Clean up any duplicate files in dist root (should only be server files)
  const distRoot = resolve(rootDir, 'dist');
  const filesToRemove = ['client.js', 'index.html'];
  filesToRemove.forEach(file => {
    const filePath = resolve(distRoot, file);
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  });

  console.log('✅ Build completed successfully!');
  console.log('\n📁 Output structure:');
  console.log('  dist/');
  console.log('    ├── server.js');
  console.log('    ├── const.js');
  console.log('    └── public/');
  console.log('        ├── index.html');
  console.log('        └── client.js');
}

buildAll().catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});

