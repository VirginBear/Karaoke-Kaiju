import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const workspacePath = resolve(import.meta.dirname, '..');
const distPath = join(workspacePath, 'dist');
const releaseDir = join(workspacePath, 'release');
const manifestPath = join(distPath, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error('❌ Error: dist/manifest.json not found. Run `pnpm run build` first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '0.0.1';
const zipFileName = `diaochang-v${version}.zip`;
const zipFilePath = join(releaseDir, zipFileName);

if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}

// Remove old zip if exists to ensure clean repackage
if (existsSync(zipFilePath)) {
  unlinkSync(zipFilePath);
}

console.log(`📦 Packaging Diaochang Chrome Extension v${version} (Clean & Optimized)...`);

try {
  // Exclude sourcemaps, OS files, and test files for production Web Store packaging
  execFileSync(
    'zip',
    ['-r', '-9', zipFilePath, '.', '-x', '*.map', '-x', '*.DS_Store*', '-x', '__MACOSX*'],
    {
      cwd: distPath,
      stdio: 'inherit',
    },
  );

  const stats = statSync(zipFilePath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log(`\n✅ Successfully created optimized package:`);
  console.log(`   📁 File: release/${zipFileName}`);
  console.log(`   ⚖️  Size: ${sizeKb} KB (Reduced & Slimmed)`);
  console.log(`\n🚀 Ready for Chrome Web Store upload!`);
} catch (error) {
  console.error('❌ Packaging failed:', error);
  process.exit(1);
}
