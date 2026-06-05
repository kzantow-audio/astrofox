import { createRequire } from 'node:module';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const require = createRequire(import.meta.url);
const { version: appVersion } = require('./package.json');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import("next").NextConfig} */
const resolveFromRoot = target => path.resolve(process.cwd(), target);
const shaderLoader = resolveFromRoot('loaders/glsl-loader.cjs');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: false,
  turbopack: {
    resolveAlias: {
      '@': resolveFromRoot('src'),
    },
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
      '*.glsl': {
        loaders: [shaderLoader],
        as: '*.js',
      },
      '*.vs': {
        loaders: [shaderLoader],
        as: '*.js',
      },
      '*.fs': {
        loaders: [shaderLoader],
        as: '*.js',
      },
      '*.vert': {
        loaders: [shaderLoader],
        as: '*.js',
      },
      '*.frag': {
        loaders: [shaderLoader],
        as: '*.js',
      },
    },
  },
  rewrites: async () => [
    {
      source: '/u.js',
      destination: 'https://cloud.umami.is/script.js',
    },
  ],
};

export default withNextIntl(nextConfig);
