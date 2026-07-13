# nvmc

[![npm version](https://img.shields.io/npm/v/@fexd/nvmc.svg)](https://www.npmjs.com/package/@fexd/nvmc)

[English](README.md) | [简体中文](README.zh-CN.md)

Run a single command with project-pinned Node.js and pnpm versions, without changing the current shell.

`nvmc` is a small command runner for frontend projects. It reads Node.js and pnpm versions from the project's `.npmrc`, prepares the required runtimes when needed, and applies them only to the command wrapped by `nvmc`.

## Features

- Temporarily uses a project-pinned Node.js version for one command.
- Temporarily uses a project-pinned pnpm version for one command.
- Keeps the interactive shell and global `node` / `pnpm` unchanged.
- Works on Windows, macOS, and Linux.
- Keeps nested `pnpm` calls on the pinned pnpm version.
- Downloads and caches missing Node.js and pnpm CLI versions automatically.
- Uses atomic cache installs to tolerate interrupted downloads and concurrent CI jobs.
- Does not replace pnpm store behavior; existing pnpm store settings still apply.

## Quick Start

The examples below use `nvmc`. Install it globally once:

```bash
npm install -g @fexd/nvmc
```

If global installation is not preferred, replace `nvmc` in the examples with `npx -y @fexd/nvmc`.

Initialize project versions:

```bash
nvmc init --node 20.19.5 --pnpm 9.15.9
```

Or edit `.npmrc` directly:

```properties
nvmc-node=20.19.5
nvmc-pnpm=9.15.9
```

Then prefix commands that need the project Node.js or pnpm version:

```bash
nvmc node scripts/build.js
nvmc pnpm install
nvmc pnpm run build
```

In `package.json` scripts, rewrite commands the same way. For example, change `pnpm run build` to `nvmc pnpm run build`.

## Agent Migration

The package includes a migration skill for coding agents:

```text
skills/migrate-to-nvmc/SKILL.md
```

Ask an agent to use it like this:

```text
Read the migrate-to-nvmc skill from the nvmc package. Infer the project's Node.js and pnpm versions from evidence, ask me to confirm them, then update .npmrc and package.json scripts to use nvmc.
```

The skill asks agents to inspect `package.json`, `.npmrc`, `pnpm-lock.yaml`, `.nvmrc`, `.node-version`, and related evidence before editing files.

## Host Runtime

`nvmc` itself supports Node.js 12.17 or newer.

For `npx -y @fexd/nvmc`, the host npm should be 7 or newer. In practice, Node.js 16 or newer is recommended for the host runtime.

If the host still uses npm 6, install `nvmc` globally once and use the shorter command in scripts:

```bash
npm install -g @fexd/nvmc
nvmc version
```

The target Node.js version managed by `nvmc` can be older than the host runtime, as long as that Node.js release exists for the current platform and the project itself can run on it.

## Commands

```bash
nvmc doctor
nvmc node -v
nvmc pnpm -v
```

`nvmc init` can update one or both versions:

```bash
nvmc init --node 20.19.5
nvmc init --pnpm 9.15.9
```

## Configuration

Configure project versions in `.npmrc`:

```properties
nvmc-node=20.19.5
nvmc-pnpm=9.15.9
```

- `nvmc-node`: Node.js version used by wrapped project commands.
- `nvmc-pnpm`: pnpm version used by wrapped project commands.

## package.json Scripts

```json
{
  "scripts": {
    "nvmc:versions": "nvmc doctor && npm run nvmc:node && npm run nvmc:pnpm",
    "nvmc:node": "nvmc node -v",
    "nvmc:pnpm": "nvmc pnpm -v",
    "install:deps": "nvmc pnpm install",
    "build": "nvmc pnpm run build"
  }
}
```

## Nested pnpm Scripts

`nvmc pnpm` prepends a pinned pnpm shim to the child process `PATH`, so nested `pnpm` calls keep using the pnpm version from `.npmrc`.

```json
{
  "scripts": {
    "dev": "nvmc pnpm exec concurrently \"pnpm --filter @app/web dev\" \"pnpm --filter @app/server dev\""
  }
}
```

For cross-platform scripts, use plain `pnpm` inside nested commands. Do not hard-code `pnpm.cmd`.

## How It Works

When a command runs, `nvmc`:

1. Finds the project root from the current directory.
2. Reads `nvmc-node` and `nvmc-pnpm` from `.npmrc`.
3. Checks whether the requested Node.js and pnpm CLI versions already exist in cache.
4. Downloads and extracts missing versions.
5. Starts the target command with the pinned Node.js executable.
6. Injects a temporary `PATH` only for that command and its child processes.

After the command exits, the temporary environment disappears. The current shell's global `node` and `pnpm` versions do not change.

## Cache Directory

Default cache locations:

- Windows: `%LOCALAPPDATA%\nvmc`
- macOS: `~/Library/Caches/nvmc`
- Linux: `${XDG_CACHE_HOME:-~/.cache}/nvmc`

Override the cache root with `NVMC_HOME`:

```bash
NVMC_HOME=/path/to/cache nvmc doctor
```

The cache stores Node.js distributions, pnpm CLI files, downloaded archives, and small shims. Project dependencies still use pnpm's own store.

## Download Mirrors

Default sources:

- Node.js: `https://nodejs.org/dist`
- pnpm: `https://registry.npmjs.org`

Mirror environment variables:

```bash
NVMC_NODE_MIRROR=https://nodejs.org/dist
NVMC_NPM_REGISTRY=https://registry.npmjs.org
```

## Roadmap

The current scope is intentionally focused on Node.js project commands:

- Node.js: pinned runtime version.
- pnpm: pinned package-manager version.
- npm / yarn: may be considered later as similar Node.js package managers.

`nvmc` does not manage JDK, Android SDK, Python, or other non-Node.js runtimes.
