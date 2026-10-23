'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'threadly-v2');
function fail(message) { console.error('✗ Netlify config: ' + message); process.exitCode = 1; }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function section(source, header) {
  const start = source.indexOf(header);
  if (start < 0) return '';
  const next = source.indexOf('\n[', start + header.length);
  return source.slice(start, next < 0 ? source.length : next);
}
try {
  const rootConfig = read(path.join(root, 'netlify.toml'));
  const appConfig = read(path.join(app, 'netlify.toml'));
  const pkg = JSON.parse(read(path.join(app, 'package.json')));
  const build = section(rootConfig, '[build]');
  const functions = section(rootConfig, '[functions]');
  const appBuild = section(appConfig, '[build]');
  const appFunctions = section(appConfig, '[functions]');
  const checks = [
    ['root Netlify base points to threadly-v2', /^\s*base\s*=\s*["']threadly-v2["']/m.test(build)],
    ['root build command runs npm run build', /^\s*command\s*=\s*["']npm run build["']/m.test(build)],
    ['root publish directory is public relative to base', /^\s*publish\s*=\s*["']public["']/m.test(build)],
    ['root functions directory is netlify/functions relative to base', /^\s*functions\s*=\s*["']netlify\/functions["']/m.test(build)],
    ['Netlify Node bundler is esbuild', /^\s*node_bundler\s*=\s*["']esbuild["']/m.test(functions)],
    ['catalogue build script exists', typeof pkg.scripts?.build === 'string' && pkg.scripts.build.includes('scripts/build-catalog.js')],
    ['app-local publish directory remains public', /^\s*publish\s*=\s*["']public["']/m.test(appBuild)],
    ['app-local functions directory remains netlify/functions', /^\s*functions\s*=\s*["']netlify\/functions["']/m.test(appBuild)],
    ['API redirects to Netlify functions', /from\s*=\s*["']\/api\/\*["'][\s\S]*?to\s*=\s*["']\/\.netlify\/functions\/:splat["']/m.test(rootConfig)],
    ['admin route redirects to admin.html', /from\s*=\s*["']\/admin["'][\s\S]*?to\s*=\s*["']\/admin\.html["']/m.test(rootConfig)]
  ];
  for (const [label, ok] of checks) {
    if (ok) console.log('✓ ' + label);
    else fail(label);
  }
  if (!process.exitCode) console.log('Netlify repository configuration checks passed (' + checks.length + ').');
} catch (error) {
  fail(error.message);
}
