---
"@proyecto26/temporal-workflows": patch
---

Supports NestJS 12. The peer ranges now accept `@nestjs/common` 12 and `@nestjs/config` 12, next to the 10 and 11 lines and `@nestjs/config` 3 and 4. The package still ships CommonJS and loads the ESM-only Nest 12 packages through `require(esm)`, which needs Node.js 20.19+ or 22.12+, the same floor Nest 12 sets.
