# @fexd/toolchain

[![npm version](https://img.shields.io/npm/v/@fexd/toolchain.svg)](https://www.npmjs.com/package/@fexd/toolchain)

`@fexd/toolchain` 是一个面向前端项目的工具链运行器，用于让项目脚本固定使用指定版本的 Node.js 和 pnpm。

它适合这种场景：不同项目依赖不同的 Node.js / pnpm 版本，但开发者希望自己的全局 shell 环境保持不变。通过 `tc` 执行的命令只会在当前子进程中使用项目指定的工具链，不会切换或污染全局 `node` / `pnpm`。

## 特性

- 按项目固定 Node.js 版本。
- 按项目固定 pnpm 版本。
- 不依赖 `nvm`、`fnm` 或 Corepack。
- 不修改当前 shell 的全局 `node` / `pnpm`。
- 支持 Windows、macOS 和 Linux。
- 支持嵌套脚本中的 `pnpm` 命令继续使用项目指定版本。
- 自动下载并缓存所需的 Node.js 和 pnpm。

## 安装

```bash
pnpm add -D @fexd/toolchain
```

也可以使用 npm：

```bash
npm install -D @fexd/toolchain
```

## 配置

在项目根目录的 `.npmrc` 中配置工具链版本：

```ini
tc-version-node=20.19.5
tc-version-pnpm=9.15.9
```

字段说明：

- `tc-version-node`：项目脚本使用的 Node.js 版本。
- `tc-version-pnpm`：项目脚本使用的 pnpm 版本。

## 使用

在 `package.json` scripts 中通过 `tc` 执行命令：

```json
{
  "scripts": {
    "toolchain:versions": "tc doctor && npm run toolchain:node && npm run toolchain:pnpm",
    "toolchain:node": "tc node -v",
    "toolchain:pnpm": "tc pnpm -v",
    "install:deps": "tc pnpm install",
    "dev": "tc pnpm dev",
    "build": "tc pnpm build"
  }
}
```

常用命令：

```bash
tc --version
tc doctor
tc node -v
tc node scripts/build.js
tc pnpm -v
tc pnpm install
tc pnpm run build
```

## 嵌套脚本

`tc` 会在子进程的 `PATH` 前面放入项目指定版本的 pnpm shim。因此通过 `tc pnpm` 启动的脚本中，如果继续执行 `pnpm`，仍然会使用 `.npmrc` 中配置的 pnpm 版本。

例如：

```json
{
  "scripts": {
    "dev": "tc pnpm exec concurrently \"pnpm --filter @app/web dev\" \"pnpm --filter @app/server dev\""
  }
}
```

上面两个内层 `pnpm` 命令都会使用项目指定的 pnpm 版本。

## 工作方式

执行 `tc` 时会按以下流程运行：

1. 从当前目录向上查找项目根目录。
2. 读取项目 `.npmrc` 中的 `tc-version-node` 和 `tc-version-pnpm`。
3. 检查本地缓存中是否已有对应版本的 Node.js 和 pnpm。
4. 如果缓存不存在，则自动下载并解压。
5. 使用指定 Node.js 启动目标命令。
6. 为目标命令注入临时 `PATH`，确保子进程优先使用指定 Node.js 和 pnpm。

命令结束后，当前 shell 的全局 `node` / `pnpm` 版本不会变化。

## 缓存目录

默认缓存位置：

- Windows：`%LOCALAPPDATA%\fexd-toolchain`
- macOS：`~/Library/Caches/fexd-toolchain`
- Linux：`${XDG_CACHE_HOME:-~/.cache}/fexd-toolchain`

可以通过 `TC_HOME` 指定缓存目录：

```bash
TC_HOME=/path/to/toolchain-cache tc doctor
```

## 下载源

默认下载源：

- Node.js：`https://nodejs.org/dist`
- pnpm：`https://registry.npmjs.org`

可以通过环境变量配置镜像：

```bash
TC_NODE_MIRROR=https://nodejs.org/dist
TC_NPM_REGISTRY=https://registry.npmjs.org
```

## Roadmap

当前版本聚焦于 Node.js 和 pnpm 的项目级版本管理。后续可以继续扩展到更多项目运行所需的外部工具链：

- JDK：支持通过 `.npmrc` 指定项目需要的 Java 版本，并在执行脚本时注入 `JAVA_HOME`。
- Android SDK：支持管理 Android platform、build-tools、platform-tools 等 SDK 组件。
- Android NDK：支持为 native 构建固定 NDK 版本。
- Python：支持为 `node-gyp`、native addon 等构建场景固定 Python 版本，并注入 `PYTHON` 环境变量。

这些能力会继续遵循当前定位：只管理项目脚本运行所需的外部工具链，不替代包管理器，也不管理已经适合放在 `devDependencies` 中的普通前端依赖。

## 注意事项

- 启动 `tc` 本身需要本机已有可用的 Node.js。
- 启动 `tc` 的 Node.js 版本需要满足 `>=14.17`。
- 第一次使用某个 Node.js / pnpm 版本时需要联网下载。
- 为了让 scripts 跨平台，建议在脚本中写 `pnpm`，不要写死 `pnpm.cmd`。
