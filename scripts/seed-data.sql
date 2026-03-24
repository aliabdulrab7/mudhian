node:internal/modules/cjs/loader:1421
  const err = new Error(message);
              ^

Error: Cannot find module '@libsql/client'
Require stack:
- /Users/waled/Desktop/Mudhian/scripts/export-sqlite-data.ts
    at node:internal/modules/cjs/loader:1421:15
    at nextResolveSimple (/Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-D46fvsV_.cjs:4:1004)
    at /Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-D46fvsV_.cjs:3:2630
    at /Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-D46fvsV_.cjs:3:1542
    at resolveTsPaths (/Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-D46fvsV_.cjs:4:760)
    at /Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-D46fvsV_.cjs:4:1102
    at m._resolveFilename (file:///Users/waled/.npm/_npx/fd45a72a545557e9/node_modules/tsx/dist/register-B7jrtLTO.mjs:1:789)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1059:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1064:22)
    at Module._load (node:internal/modules/cjs/loader:1227:37) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/waled/Desktop/Mudhian/scripts/export-sqlite-data.ts' ]
}

Node.js v24.11.1
