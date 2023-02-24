import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';
import createVuePlugin from '@vitejs/plugin-vue';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { FM_API_ENDPOINT, FM_SCRIPT_DIR, snake } from '@farmos.org/field-kit/namespaces/index.js';
import createMockServer from './mock-server.js';

// The current working directory of the downstream application, which will call
// `npm run field-scripts develop`.
const cwd = process.cwd();
// The root path of the @farmos.org/field-kit package itself, which may be a
// workspace in the monorepo, or a peer dependency of a field module project,
// under node_modules alongside field-scripts.
const main = createRequire(import.meta.url).resolve('@farmos.org/field-kit');
const root = path.dirname(main);

/**
 * Explicitly use strict mode on the file system (already Vite's default), but
 * also add both the root and the cwd to the allow list. Vite will only include
 * the root by default, not the cwd.
 * @see https://vitejs.dev/config/server-options.html#server-fs-allow
 */
const fs = {
  strict: true,
  allow: [cwd, root],
};

/**
 * Optimize dependencies for @farmos.org/field-kit, except @farmos.org/farmos-map.
 * @see https://vitejs.dev/config/dep-optimization-options.html
 */
const pkgPath = path.resolve(root, 'package.json');
const pkgRaw = readFileSync(pkgPath, 'utf-8');
const pkg = JSON.parse(pkgRaw);
const { dependencies = {} } = pkg || {};
const exclude = ['@farmos.org/farmos-map'];
const include = Object.keys(dependencies).filter(d => !exclude.includes(d));
const optimizeDeps = { exclude, include };

const proxyPort = port => ({
  target: `http://localhost:${port}`,
  changeOrigin: true,
  secure: false,
});

export default async function develop(options = {}) {
  const {
    config: relLocation = './module.config.js',
    server: {
      port = 8080,
      ...serverOptions
    } = {},
    ...sharedOptions
  } = options;
  const location = path.resolve(cwd, relLocation);
  const { default: config } = await import(location);

  const mockPort = 9000;
  const mockServer = createMockServer(config);
  mockServer.listen(mockPort, 'localhost');

  const devServer = await createServer({
    root,
    configFile: false,
    resolve: {
      alias: [
        {
          find: 'vue',
          replacement: 'vue/dist/vue.esm-bundler.js',
        },
      ],
      extensions: [
        '.mjs',
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
        '.vue',
      ],
    },
    plugins: [
      createVuePlugin({ jsx: true }),
      viteCommonjs(),
    ],
    optimizeDeps,
    server: {
      port,
      fs,
      proxy: {
        [`/${FM_API_ENDPOINT}`]: proxyPort(9000),
        [`/${FM_SCRIPT_DIR}/${snake(config.name)}/`]: proxyPort(9000),
        '/api': proxyPort(80),
        '/oauth': proxyPort(80),
        '/fieldkit': proxyPort(80),
        '/system': proxyPort(80),
      },
      ...serverOptions,
    },
    ...sharedOptions,
  });
  devServer.watcher.add(cwd);
  await devServer.listen(port);
  devServer.printUrls();
}
