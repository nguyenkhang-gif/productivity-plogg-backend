/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-deep-import',
      comment:
        'Modules may only import another module through its public API (src/modules/<other>/index.ts).',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/(?!$1/)[^/]+/.+',
        pathNot: [
          // Public API of every module.
          '^src/modules/[^/]+/index\\.ts$',
          // Explicit exception: the social schemas register the identity User
          // mongoose model (populate). identity's index re-exports social, so
          // going through the barrel would create a runtime import cycle that
          // leaves UserSchema undefined when @Module() decorators evaluate.
          '^src/modules/identity/user/infrastructure/user\\.schema\\.ts$',
        ],
      },
    },
    {
      name: 'shared-is-leaf',
      comment: 'src/shared must not depend on feature modules.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'domain-is-pure',
      comment:
        'Domain code must not depend on application/infrastructure/presentation or framework/DB packages.',
      severity: 'error',
      from: { path: '^src/modules/.+/domain/' },
      to: {
        path: [
          '^src/modules/.+/(application|infrastructure|presentation)/',
          '^node_modules/(@nestjs|mongoose|@prisma|ioredis|socket\\.io)',
        ],
      },
    },
    {
      name: 'application-no-presentation',
      severity: 'error',
      from: { path: '/application/' },
      to: { path: '/presentation/' },
    },
    {
      name: 'application-no-own-infrastructure',
      comment:
        'Use-cases depend on domain ports, not on concrete infrastructure of their own module.',
      severity: 'error',
      from: {
        path: '^src/modules/([^/]+)/.+/application/',
        pathNot: '\\.spec\\.ts$',
      },
      to: { path: '^src/modules/$1/.+/infrastructure/' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: '(^|/)node_modules|^generated' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
