# Modern TypeScript Configuration for Monorepos (2024/2025)

Based on the latest TypeScript documentation and best practices, this guide provides a simplified, modern approach to configuring TypeScript in a monorepo with NestJS and React Router applications.

## Key Principles from Official TypeScript Documentation

According to the [official TypeScript module guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html):

- **For Node.js applications**: Use `"module": "nodenext"` for modern Node.js projects
- **For bundled applications**: Use `"module": "esnext"` with `"moduleResolution": "bundler"`
- **For libraries**: Use the strictest possible settings to ensure compatibility

## Configuration Structure

```
tsconfig.base.json         # Root base configuration
tsconfig.node.json         # Node.js/NestJS optimized configuration  
tsconfig.bundler.json      # Bundler/React Router optimized configuration
```

## Base Configuration (`tsconfig.base.json`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    /* Base Options - Following 2024/2025 best practices */
    "incremental": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "allowJs": true,
    "checkJs": false,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "moduleDetection": "force",
    "isolatedModules": true,

    /* Strictness - Enable all for better type safety */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    /* Performance & Developer Experience */
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "sourceMap": true,
    "declaration": false,
    "removeComments": false,
    "preserveConstEnums": false,

    /* Path Mapping - Shared across all projects */
    "baseUrl": ".",
    "paths": {
      "@projectx/models": ["libs/models/src/index.ts"],
      "@projectx/models/*": ["libs/models/src/*"],
      "@projectx/email": ["libs/backend/email/src/index.ts"],
      "@projectx/email/*": ["libs/backend/email/src/*"],
      "@projectx/ui": ["libs/frontend/ui/src/index.ts"],
      "@projectx/ui/*": ["libs/frontend/ui/src/*"],
      "@projectx/core": ["libs/backend/core/src/index.ts"],
      "@projectx/core/*": ["libs/backend/core/src/*"],
      "@projectx/db": ["libs/backend/db/src/index.ts"],
      "@projectx/db/*": ["libs/backend/db/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", "build", ".next", "coverage"]
}
```

## Node.js/NestJS Configuration (`tsconfig.node.json`)

Following the official recommendation for Node.js applications:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    /* Node.js/NestJS Specific - Official recommendation */
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2021",
    "lib": ["ES2021"],
    "types": ["node"],
    
    /* NestJS Requirements */
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    
    /* Output Configuration */
    "outDir": "dist",
    "removeComments": true,
    "preserveConstEnums": true,
    
    /* Enhanced Strictness for Backend */
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Bundler/React Router Configuration (`tsconfig.bundler.json`)

Following the official recommendation for bundled applications:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    /* Bundler/React Specific - Official recommendation */
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    
    /* React/JSX Support */
    "jsx": "react-jsx",
    "allowJs": true,
    "checkJs": false,
    
    /* Bundler Environment */
    "types": ["vite/client", "node"],
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    
    /* Bundler Optimizations */
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "allowArbitraryExtensions": true,
    "useDefineForClassFields": true,
    
    /* Enhanced Developer Experience */
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false
  }
}
```

## Application Configurations

### NestJS Applications

```json
{
  "extends": "../../tsconfig.node.json",
  "compilerOptions": {
    "outDir": "dist",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

### React Router Applications

```json
{
  "extends": "../../tsconfig.bundler.json",
  "compilerOptions": {
    "noEmit": true,
    "outDir": "dist"
  },
  "include": [
    "app/**/*.ts",
    "app/**/*.tsx",
    "app/**/*.js",
    "app/**/*.jsx",
    ".react-router/types/**/*"
  ],
  "exclude": [
    "dist",
    "tests/**/*",
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/*.spec.tsx",
    "**/*.test.tsx"
  ]
}
```

### Library Configurations

For shared libraries, following the official library recommendations:

```json
{
  "extends": "../../tsconfig.node.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

## Key Benefits of This Approach

### 1. **Official Best Practices**
- Follows the latest TypeScript team recommendations
- Uses `nodenext` for Node.js applications as officially recommended
- Uses `bundler` module resolution for frontend applications

### 2. **Technology-Specific Optimization**
- NestJS: Optimized for Node.js runtime with decorator support
- React Router: Optimized for bundler environments with JSX support
- Libraries: Strict settings for maximum compatibility

### 3. **Modern Features**
- Latest TypeScript 5.7+ features
- Support for ES2022+ features
- Enhanced type checking and safety

### 4. **Developer Experience**
- Fast incremental compilation
- Excellent IDE support
- Clear error messages
- Consistent path mapping

## Migration Guide

### Step 1: Update Base Configuration
Replace your current `tsconfig.base.json` with the new base configuration.

### Step 2: Create Technology-Specific Configs
Add `tsconfig.node.json` and `tsconfig.bundler.json` to your root.

### Step 3: Update Application Configs
Update each application's `tsconfig.json` to extend the appropriate base:
- NestJS apps: extend `tsconfig.node.json`
- React Router apps: extend `tsconfig.bundler.json`

### Step 4: Update Libraries
Update library configurations to extend `tsconfig.node.json` with library-specific settings.

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**: Ensure you're using the correct base configuration for your application type
2. **Decorator Errors**: Make sure NestJS applications extend `tsconfig.node.json`
3. **JSX Errors**: Ensure React applications extend `tsconfig.bundler.json`

### Validation Commands

```bash
# Check configuration
npx tsc --showConfig -p apps/auth/tsconfig.json

# Type check without emitting
npx tsc --noEmit -p apps/auth/tsconfig.json

# Build specific project
npx nx run auth:build
```

## Future-Proofing

This configuration is designed to be:
- **Forward-compatible**: Uses latest TypeScript features
- **Maintainable**: Clear separation of concerns
- **Scalable**: Easy to add new applications
- **Standard-compliant**: Follows official TypeScript recommendations

## References

- [TypeScript Module Configuration Guide](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TypeScript 5.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [NestJS TypeScript Configuration](https://docs.nestjs.com/)