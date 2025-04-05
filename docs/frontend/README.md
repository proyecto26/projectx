# Instructions

## Commands used to create the project structure

- Run these commands only if the Workspace was not created before:
```sh
npx create-nx-workspace@latest projectx --preset=apps
cd projectx
```

- Create web project:
```sh
npx nx add @nx/remix
npx nx g @nx/remix:app apps/web
```

More details [here](https://nx.dev/recipes/react/remix).

- Install Tailwind CSS:
```sh
npm add -D tailwindcss postcss autoprefixer postcss-import prettier-plugin-tailwindcss@0.4.1
npx nx g setup-tailwind --project=web
```

- Create a UI lib to be able to publish to a npm registry:
```sh
npx nx g @nx/react:lib libs/ui --publishable --importPath=@projectx/ui
npx nx add @nx/storybook
npm add -D @babel/preset-react @babel/preset-typescript
npx nx g storybook-configuration --project=ui
```

- Create some UI components with Storybook stories:
```sh
npx nx g @nx/react:component --project=ui --path=libs/frontend/ui/src/lib/buttons/button/Button
npx nx g @nx/react:component --project=ui --path=libs/frontend/ui/src/lib/buttons/theme/ThemeButton
npx nx g @nx/react:component --project=ui --path=libs/frontend/ui/src/lib/header/Header
npx nx g @nx/react:component --project=ui --path=libs/frontend/ui/src/lib/footer/Footer
npx nx g @nx/react:stories --project=ui
```

- Create the styles/theme with `TailwindCSS`:
```sh
npx nx g setup-tailwind --project=ui
npm add -D @tailwindcss/aspect-ratio @tailwindcss/forms @tailwindcss/line-clamp @tailwindcss/typography
```

- Update the `libs/frontend/ui/project.json` to export the `tailwind.config` file as a preset:
```json
"build": {
    "executor": "nx:run-commands",
    "outputs": ["{options.outputPath}"],
    "options": {
    "commands": [
        {
        "command": "nx run ui:build:lib"
        },
        {
        "command": "npx tsc -p libs/frontend/ui/tsconfig.tailwind.json"
        }
    ],
    "parallel": false
    }
},
"build:lib": {
...
```

- Install dependencies for UX:
```sh
npm i -D daisyui@latest @types/md5
npm add @heroicons/react @headlessui/react framer-motion usehooks-ts react-responsive md5 react-toastify
```

- Install dependencies for the web features (shopping cart, verification code input):
```sh
npm add react-use-cart react-otp-input
```

- Install dependencies for Admin/Dashboard page:
```sh
npm add lucide-react
```

- Install dependencies for security (CSRF protection, etc):
```sh
npm add remix-utils crypto-js
```

- Install dependencies for http queries/requests with ssr support
```sh
npm add @tanstack/react-query immer
npm add -D @tanstack/react-query-devtools 
```

More details here: https://tanstack.com/query/latest/docs/framework/react/guides/ssr#using-the-hydration-apis

- Install Payment third party provider
```sh
npm install --save @stripe/react-stripe-js @stripe/stripe-js
```