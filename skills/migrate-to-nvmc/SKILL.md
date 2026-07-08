---
name: migrate-to-nvmc
description: Use when converting an existing JavaScript or TypeScript project to nvmc, package.json scripts that pin Node.js and pnpm versions, or .npmrc configs for nvmc-node and nvmc-pnpm while preserving cross-platform behavior.
---

# Migrate To nvmc

## Goal

Convert an existing project so package scripts run through `nvmc`:

- scripts use the configured Node.js and pnpm versions;
- the interactive shell keeps its global `node` and `pnpm`;
- Windows and macOS scripts stay portable;
- unrelated project changes are preserved.

## Inspect First

Before editing, read:

- `package.json`
- `.npmrc`, if present
- `.node-version`, `.nvmrc`, `.tool-versions`, and Volta settings, if present
- `pnpm-lock.yaml`, `node_modules/.modules.yaml`, and package-manager metadata
- `git status --short`

Do not revert unrelated dirty files. If a dirty file must be edited, inspect it first and preserve the user's changes.

## Choose Script Prefix

Before modifying `package.json`, check the host runtime and whether nvmc is already available:

```bash
node -v
npm -v
npx --version
nvmc version
```

Ask whether the rewritten scripts need to run in a dedicated build environment, such as Jenkins, CI runners, Docker build images, or other shared build machines.

If scripts must run in a dedicated build environment and npm major is 7 or newer, prefer `npx -y @fexd/nvmc` in scripts. Do not require a global nvmc install on Jenkins or other build machines unless the user explicitly wants to manage that machine image.

If `nvmc version` works, use `nvmc` in scripts:

```bash
nvmc <command>
```

If nvmc is not installed globally and npm major is 7 or newer, use npx in scripts:

```bash
npx -y @fexd/nvmc <command>
```

If npm major is older than 7 and Node.js 12.17 or newer is available, install nvmc globally once and use the command directly:

```bash
npm install -g @fexd/nvmc
nvmc version
```

Then scripts should use:

```bash
nvmc <command>
```

If Node.js is older than 12.17, stop and ask the user to upgrade the host Node.js or provide another host runtime. Do not add nvmc to the target project's dependencies.

## Infer Versions Before Editing

Do not copy versions from this skill. Infer versions from the target project, present the evidence, and ask the user to confirm the exact Node.js and pnpm versions before modifying files.

Prefer version sources in this order:

1. existing `.npmrc` values: `nvmc-node`, `nvmc-pnpm`
2. user-provided versions in the current request
3. `packageManager`, `corepack pnpm@...`, `pnpm@...`, or similar script syntax for the pnpm version
4. `pnpm-lock.yaml` `lockfileVersion`, `node_modules/.modules.yaml`, and existing pnpm-generated metadata for the pnpm version family
5. `.node-version`, `.nvmrc`, `.tool-versions`, or Volta settings for the Node.js version
6. CI files, Dockerfiles, README setup notes, deploy images, or exact `engines.node` values for the Node.js version

For pnpm, treat `pnpm-lock.yaml` `lockfileVersion` as evidence for a compatible pnpm family, not as an exact patch version. Combine it with `packageManager`, scripts, installed metadata, and project history when possible.

For Node.js, exact files such as `.nvmrc` are stronger than broad ranges such as `>=16`. If only a range exists, propose a concrete patch version with a confidence note and wait for confirmation.

Ask the user to confirm the inferred versions in this shape:

```text
I found these nvmc versions:
- Node.js: <candidate-node-version> from <evidence>
- pnpm: <candidate-pnpm-version> from <evidence>

Please confirm these versions before I edit .npmrc or package.json.
```

Do not edit `.npmrc` or `package.json` until the user confirms. If the user explicitly provided both versions in the current request, that counts as confirmation; still echo the versions before editing.

Update `.npmrc` without removing unrelated npm settings:

```ini
nvmc-node=<confirmed-node-version>
nvmc-pnpm=<confirmed-pnpm-version>
```

Keep `packageManager` when it is useful for standard package-manager metadata:

```json
{
  "packageManager": "pnpm@<confirmed-pnpm-version>"
}
```

## Script Rewrite Rules

Use the selected script prefix from "Choose Script Prefix".

| Before | After |
| --- | --- |
| `node script.js` | `<prefix> node script.js` |
| `pnpm install` | `<prefix> pnpm install` |
| `pnpm run build` | `<prefix> pnpm run build` |
| `pnpm --filter @pkg dev` | `<prefix> pnpm --filter @pkg dev` |
| `pnpm exec prettier ...` | `<prefix> pnpm exec prettier ...` |
| `pnpm.cmd ...` | `<prefix> pnpm ...` |
| `fnm exec node ...` | `<prefix> node ...` |
| `fnm exec pnpm ...` | `<prefix> pnpm ...` |
| `corepack pnpm@x ...` | `<prefix> pnpm ...` |

For nested scripts, keep the outer command under nvmc and use plain `pnpm` inside quoted child commands:

```json
{
  "dev": "nvmc pnpm exec concurrently \"pnpm --filter @app/web dev\" \"pnpm --filter @app/server dev\""
}
```

Use plain `pnpm`, not `pnpm.cmd`, inside scripts so the same `package.json` works on Windows and macOS. `nvmc pnpm` injects a pinned pnpm shim into the child process `PATH`.

## What Not To Wrap

Do not wrap commands that are intentionally system tools:

- `open`
- `xcrun`
- `xcodebuild`
- `ios-deploy`
- `idevicedebug`
- `idevicesyslog`
- `adb`
- `gradlew` or `./gradlew`, unless the command itself is launched through a pnpm script that needs nvmc

Do not make nvmc manage ordinary npm dependencies such as `vite`, `webpack`, `rollup`, `eslint`, `prettier`, `typescript`, `husky`, or project-specific CLIs. Run them through `nvmc pnpm exec` or existing package scripts.

## Validation

After migration, run the smallest checks that prove the scripts use nvmc correctly:

```bash
nvmc version
npm run nvmc:versions
```

Run one lightweight real project script, such as a small build or package build.

Verify nested `pnpm` through a shell command on Windows, because `child_process.execFileSync('pnpm')` does not necessarily resolve `.cmd` files:

```bash
nvmc pnpm exec node -e "require('child_process').execSync('pnpm -v', {stdio:'inherit'})"
```

Optionally confirm the interactive shell is unchanged:

```bash
node -v
pnpm -v
```

Report validation output, remaining warnings, and any unrelated dirty files left untouched.

## Common Mistakes

- Installing nvmc into the target project's dependencies. Use npx or a global command.
- Editing `.npmrc` or scripts before the user confirms the inferred Node.js and pnpm versions.
- Copying placeholder versions from examples instead of inferring from project evidence.
- Using `npx -y` with npm 6. Use a global nvmc command for old hosts.
- Replacing inner quoted `pnpm.cmd` with another `pnpm.cmd`; use plain `pnpm`.
- Wrapping macOS/iOS system commands in nvmc.
- Removing existing `.npmrc` settings while adding nvmc versions.
- Treating `engines.node` ranges such as `>=16` as exact install versions.
- Deleting `.node-version` or `.nvmrc` without confirming they are obsolete for the project.
- Using global `pnpm` to test a project whose global pnpm version is known to be incompatible.
