// see https://github.com/facebook/create-react-app/issues/5673#issuecomment-438654051

const workboxBuild = require('workbox-build');
// NOTE: This should be run *AFTER* all your assets are built
const buildSW = async () => {
  // This will return a Promise
  return workboxBuild.generateSW({
    swDest: 'build/service-worker-custom.js', // this will be created in the build step
    clientsClaim: true,
    skipWaiting: true,
    importWorkboxFrom: 'local',
    navigateFallback: /*publicUrl + */ '/index.html',
    navigateFallbackBlacklist: [
      // Exclude URLs starting with /api
      new RegExp('^/api'),
      // Exclude URLs containing a dot, as they're likely a resource in
      // public/ and not a SPA route
      new RegExp('/[^/]+\\.[^/]+$'),
    ],
    globDirectory: 'build',
    globPatterns: [
      '**/*.{js,css,html,png,svg}',
    ],
    globIgnores: [
      'precache-manifest.*.js',
      'service-worker.js',
      'apple-touch-icon.png',
      'mask-icon.svg',
    ]
  }).then(({count, size, warnings}) => {
    // Optionally, log any warnings and details.
    warnings.forEach(console.warn);
    console.log(`${count} files will be precached, totaling ${size} bytes.`);
  });
}
buildSW();