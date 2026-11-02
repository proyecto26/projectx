# Releasing the npm packages

Only `@proyecto26/temporal-workflows` and `@proyecto26/temporal-workflow-client` are published. Everything else in the workspace is private and has to stay that way, because Changesets publishes every package that isn't private.

## Day to day

1. In a PR that changes a published package, run `pnpm changeset` and commit the file.
2. Merging to `develop` makes the Publish workflow open or update a "Version Packages" PR.
3. Merging that PR publishes the new versions to npm with provenance.

## First release

Trusted publishing can't be relied on to create a package, so the first version goes by hand. The Publish workflow stays off until the last step.

1. From a clean `develop`, check the packages and log in:

   ```bash
   pnpm install --frozen-lockfile
   pnpm check:packages
   npm login
   ```

2. Publish them:

   ```bash
   pnpm --filter "./packages/workflow*" publish --access public
   ```

3. On npmjs.com, in the settings of each package, add a trusted publisher: repository `proyecto26/projectx`, workflow `publish.yml`, environment `npm-publish`. It expires if it hasn't published within 2 days, so you can also do this right before the next release.
4. In the GitHub repository, under `Settings > Environments`, create `npm-publish` and add yourself as a required reviewer and limit it to the `develop` branch, so nothing is published without your approval.
5. Also enable `Allow GitHub Actions to create and approve pull requests` under `Settings > Actions > General`.
6. Create the repository variable `NPM_RELEASE_ENABLED` with the value `true`.

Actions are pinned to a commit, so update the SHA and its comment together. The release jobs install without running scripts, and `pack` only rebuilds `esbuild`.
