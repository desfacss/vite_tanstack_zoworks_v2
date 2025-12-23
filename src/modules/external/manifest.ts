export const manifest = {
  name: 'external',
  version: '1.0.0',
  description: 'External-facing pages and service assets',
  dependencies: ['core'],
  routes: ['/external/*'],
  permissions: ['external.service-assets'],
};

export default manifest;
