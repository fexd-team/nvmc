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
- lockfiles and package-manager metadata
- `git status --short`

Do not revert unrelated dirty files. If a dirty file must be edited, inspect it first and preserve the user's changes.

## Version Sources

Prefer version sources in this order:

1. existing `.npmrc` values: `tc-version-node`, `tc-version-pnpm`
2. user-provided versions
3. `packageManager` for the pnpm version
4. `.node-version` or `.nvmrc` for the Node.js version
5. `engines.node` only when it pins a concrete version

If the pnpm version exists in both `.npmrc` and `packageManager`, keep them consistent or ask before choosing one.

Update `.npmrc` without removing unrelated npm settings:

```ini
tc-version-node=20.19.5
tc-version-pnpm=9.15.9
```

Keep `packageManager` when it is useful for standard package-manager metadata:

```json
{
  "packageManager": "pnpm@9.15.9"
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

## Dependency Handling

If `@fexd/toolchain` is not already available in the project, add it as a dev dependency using the project's package manager:

```bash
pnpm add -D @fexd/toolchain
```

If the user explicitly asks for a local package link, use the local path they provide instead of adding a registry dependency.

## Validation

After migration, run the smallest checks that prove the scripts use `tc` correctly:

```bash
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

- Replacing inner quoted `pnpm.cmd` with another `pnpm.cmd`; use plain `pnpm`.
- Wrapping macOS/iOS system commands in `tc`.
- Removing existing `.npmrc` settings while adding toolchain versions.
- Treating `engines.node` ranges such as `>=16` as exact install versions.
- Deleting `.node-version` or `.nvmrc` without confirming they are obsolete for the project.
- Using global `pnpm` to test a project whose global pnpm version is known to be incompatible.
