// Base level: always green, applied to src/ and tests/.
// Projects extend this and add their own layer rules and next levels.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: 'dependency-cruiser/configs/recommended-strict',
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {circular: true},
    },
    {
      name: 'src-not-to-tests',
      comment: 'production code must not import tests: tests import src.',
      severity: 'error',
      from: {path: '^src/'},
      to: {path: '^tests/'},
    },
  ],
  options: {
    doNotFollow: {path: ['node_modules']},
    includeOnly: '^(src|tests)/',
  },
}
