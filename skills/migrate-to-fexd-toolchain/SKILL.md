---
name: migrate-to-fexd-toolchain
description: Use when converting an existing JavaScript or TypeScript project to @fexd/toolchain, tc, or package.json scripts that pin Node.js and pnpm versions, especially when replacing nvm, fnm, corepack, pnpm.cmd, direct node, or direct pnpm commands while preserving cross-platform behavior.
---

# Migrate To FEXD Toolchain

## Goal

Convert an existing project so its package scripts run through `@fexd/toolchain`:

- project scripts use the configured Node.js and pnpm versions;
- the user's interactive shell keeps its global `node` and `pnpm`;
- Windows and macOS scripts stay portable;
- unrelated project changes are preserved.

## Inspect First

Before editing, read:

- `package.json`
- `.npmrc`, if present
- `.node-version` and `.nvmrc`, if present
- `.tool-versions` and Volta settings, if present
- lockfiles and package-manager metadata
- `git status --short`

Do not revert unrelated dirty files. If a dirty file must be edited, inspect it first and preserve the user's changes.

## Global Tc Requirement

Use only a global `tc` command to migrate or validate a target project.

Do not add `@fexd/toolchain` to the target project. Do not edit the target project's `dependencies`, `devDependencies`, lockfile, or workspace package list just to make `tc` available.

Before editing project files, run:

```bash
tc --version
```

If `tc` is missing, install it globally, then verify `tc --version` again:

1. If the current `node -v` is available and Node.js is 14 or newer, prefer the active Node.js installation:

   ```bash
   npm install -g @fexd/toolchain
   ```

2. If Node.js is older than 14 or missing and `bun` is available, use Bun as the global installer:

   ```bash
   bun add -g @fexd/toolchain
   ```

   If Bun installs the package but `tc --version` is still not on `PATH`, stop and report the PATH issue instead of adding a project dependency. `bunx @fexd/toolchain --version` is only a diagnostic fallback, not a replacement for the global `tc` required by package scripts.

3. If Node.js is older than 14 or missing and `nvm` is available, use `nvm` to install or activate a Node.js version that can host the global `tc`, then install globally with npm.

If no global installation path works, stop and ask the user for a machine-level Node.js, Bun, or nvm setup. Never solve this by installing `@fexd/toolchain` into the target project.

## Infer Versions Before Editing

Do not copy versions from this skill. Infer versions from the target project, present the evidence, and ask the user to confirm the exact Node.js and pnpm versions before modifying files.

Prefer version sources in this order:

1. existing `.npmrc` values: `tc-version-node`, `tc-version-pnpm`
2. user-provided versions in the current request
3. `packageManager`, `corepack pnpm@...`, `pnpm@...`, or similar script syntax for the pnpm version
4. `pnpm-lock.yaml` `lockfileVersion`, `node_modules/.modules.yaml`, and existing pnpm-generated metadata for the pnpm version family
5. `.node-version`, `.nvmrc`, `.tool-versions`, or Volta settings for the Node.js version
6. CI files, Dockerfiles, README setup notes, deploy images, or exact `engines.node` values for the Node.js version

For pnpm, treat `pnpm-lock.yaml` `lockfileVersion` as evidence for a compatible pnpm family, not as an exact patch version. Combine it with `packageManager`, scripts, installed metadata, and project history when possible.

For Node.js, exact files such as `.nvmrc` are stronger than broad ranges such as `>=16`. If only a range exists, propose a concrete patch version with a confidence note and wait for confirmation.

If the pnpm version exists in both `.npmrc` and `packageManager`, keep them consistent or ask before choosing one.

Ask the user to confirm the inferred versions in this shape:

```text
I found these toolchain versions:
- Node.js: <candidate-node-version> from <evidence>
- pnpm: <candidate-pnpm-version> from <evidence>

Please confirm these versions before I edit .npmrc or package.json.
```

Do not edit `.npmrc` or `package.json` until the user confirms. If the user explicitly provided both versions in the current request, that counts as confirmation; still echo the versions before editing.

Update `.npmrc` without removing unrelated npm settings:

```ini
tc-version-node=<confirmed-node-version>
tc-version-pnpm=<confirmed-pnpm-version>
```

Keep `packageManager` when it is useful for standard package-manager metadata:

```json
{
  "packageManager": "pnpm@<confirmed-pnpm-version>"
}
```

## Script Rewrite Rules

Rewrite only commands that need the project-pinned Node.js or pnpm.

| Before | After |
| --- | --- |
| `node script.js` | `tc node script.js` |
| `pnpm install` | `tc pnpm install` |
| `pnpm run build` | `tc pnpm run build` |
| `pnpm --filter @pkg dev` | `tc pnpm --filter @pkg dev` |
| `pnpm exec prettier ...` | `tc pnpm exec prettier ...` |
| `pnpm.cmd ...` | `tc pnpm ...` |
| `fnm exec node ...` | `tc node ...` |
| `fnm exec pnpm ...` | `tc pnpm ...` |
| `fnm exec pnpm.cmd ...` | `tc pnpm ...` |
| `corepack pnpm@x ...` | `tc pnpm ...` |

For nested scripts, keep the outer command under `tc` and use plain `pnpm` inside quoted child commands:

```json
{
  "dev": "tc pnpm exec concurrently \"pnpm --filter @app/web dev\" \"pnpm --filter @app/server dev\""
}
```

Use plain `pnpm`, not `pnpm.cmd`, inside scripts so the same `package.json` works on Windows and macOS. `tc pnpm` injects a pinned pnpm shim into the child process `PATH`.

## What Not To Wrap

Do not wrap commands that are intentionally system tools:

- `open`
- `xcrun`
- `xcodebuild`
- `ios-deploy`
- `idevicedebug`
- `idevicesyslog`
- `adb`
- `gradlew` or `./gradlew`, unless the command itself is launched through a pnpm script that needs `tc pnpm`

Do not make `tc` manage ordinary npm dependencies such as `vite`, `webpack`, `rollup`, `eslint`, `prettier`, `typescript`, `husky`, or project-specific CLIs. Run them through `tc pnpm exec` or existing package scripts.

## Validation

After migration, run the smallest checks that prove the scripts use `tc` correctly:

```bash
tc --version
npm run toolchain:versions
```

Run one lightweight real project script, such as a small build or package build:

```bash
npm run build:bridge
```

Verify nested `pnpm` through a shell command on Windows, because `child_process.execFileSync('pnpm')` does not necessarily resolve `.cmd` files:

```bash
tc pnpm exec node -e "require('child_process').execSync('pnpm -v', {stdio:'inherit'})"
```

Optionally confirm the interactive shell is unchanged:

```bash
node -v
pnpm -v
```

Report validation output, remaining warnings, and any unrelated dirty files left untouched.

## Common Mistakes

- Installing `@fexd/toolchain` into the target project. `tc` must be global.
- Editing `.npmrc` or scripts before the user confirms the inferred Node.js and pnpm versions.
- Copying placeholder versions from examples instead of inferring from project evidence.
- Replacing inner quoted `pnpm.cmd` with another `pnpm.cmd`; use plain `pnpm`.
- Wrapping macOS/iOS system commands in `tc`.
- Removing existing `.npmrc` settings while adding toolchain versions.
- Treating `engines.node` ranges such as `>=16` as exact install versions.
- Deleting `.node-version` or `.nvmrc` without confirming they are obsolete for the project.
- Using global `pnpm` to test a project whose global pnpm version is known to be incompatible.
