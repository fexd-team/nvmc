# nvmc

[![npm version](https://img.shields.io/npm/v/nvmc.svg)](https://www.npmjs.com/package/nvmc)

`nvmc` 是一个面向前端项目脚本的 Node.js / pnpm 版本运行器。它让同一个项目的 scripts 固定使用 `.npmrc` 里声明的 Node.js 和 pnpm 版本，同时不切换当前 shell 的全局 `node` / `pnpm`。

## 特性

- 按项目固定 Node.js 版本。
- 按项目固定 pnpm 版本。
- scripts 结束后不修改当前 shell。
- 支持 Windows、macOS 和 Linux。
- 支持嵌套脚本里的 `pnpm` 继续使用项目指定版本。
- 自动下载并缓存缺失的 Node.js 和 pnpm CLI。
- 不接管 pnpm store，项目依赖仍复用 pnpm 自己的 store 配置。

## 安装与运行

推荐在 scripts 中使用 npx 运行，并固定 nvmc 版本：

```bash
npx -y nvmc@0.1.0 doctor
npx -y nvmc@0.1.0 pnpm install
npx -y nvmc@0.1.0 pnpm run build
```

`npx -y` 需要 npm 7 或更新版本。通常这意味着宿主 Node.js 需要 15 或更新版本，推荐使用 Node.js 16 或更新版本。

如果宿主环境仍是 npm 6，例如常见的 Node.js 12 / 14 构建机，可以全局安装一次：

```bash
npm install -g nvmc@0.1.0
nvmc version
```

然后在 scripts 中直接使用：

```bash
nvmc pnpm install
nvmc pnpm run build
```

`nvmc` 本体支持 Node.js 12.17 或更新版本。它管理的目标 Node.js 版本可以更低，只要该版本存在对应平台发行包，且项目本身可以运行。

## 配置

在项目根目录的 `.npmrc` 中配置：

```ini
nvmc-node=20.19.5
nvmc-pnpm=9.15.9
```

字段说明：

- `nvmc-node`：项目脚本使用的 Node.js 版本。
- `nvmc-pnpm`：项目脚本使用的 pnpm 版本。

## Scripts 示例

新宿主环境推荐：

```json
{
  "scripts": {
    "toolchain:versions": "npx -y nvmc@0.1.0 doctor && npm run toolchain:node && npm run toolchain:pnpm",
    "toolchain:node": "npx -y nvmc@0.1.0 node -v",
    "toolchain:pnpm": "npx -y nvmc@0.1.0 pnpm -v",
    "install:deps": "npx -y nvmc@0.1.0 pnpm install",
    "build": "npx -y nvmc@0.1.0 pnpm run build"
  }
}
```

老宿主环境推荐：

```json
{
  "scripts": {
    "toolchain:versions": "nvmc doctor && npm run toolchain:node && npm run toolchain:pnpm",
    "toolchain:node": "nvmc node -v",
    "toolchain:pnpm": "nvmc pnpm -v",
    "install:deps": "nvmc pnpm install",
    "build": "nvmc pnpm run build"
  }
}
```

## 嵌套脚本

`nvmc pnpm` 会在子进程的 `PATH` 前面放入项目指定版本的 pnpm shim。因此内层脚本继续执行 `pnpm` 时，仍会使用 `.npmrc` 中配置的 pnpm 版本。

```json
{
  "scripts": {
    "dev": "npx -y nvmc@0.1.0 pnpm exec concurrently \"pnpm --filter @app/web dev\" \"pnpm --filter @app/server dev\""
  }
}
```

为了让 scripts 跨平台，内层命令写 `pnpm`，不要写死 `pnpm.cmd`。

## 工作方式

执行命令时，`nvmc` 会：

1. 从当前目录向上查找项目根目录。
2. 读取项目 `.npmrc` 中的 `nvmc-node` 和 `nvmc-pnpm`。
3. 检查缓存中是否已有对应版本的 Node.js 和 pnpm CLI。
4. 如果缓存不存在，则自动下载并解压。
5. 使用指定 Node.js 启动目标命令。
6. 为目标命令注入临时 `PATH`，让子进程优先使用指定 Node.js 和 pnpm。

命令结束后，当前 shell 的全局 `node` / `pnpm` 版本不会变化。

## 缓存目录

默认缓存位置：

- Windows：`%LOCALAPPDATA%\nvmc`
- macOS：`~/Library/Caches/nvmc`
- Linux：`${XDG_CACHE_HOME:-~/.cache}/nvmc`

可以通过 `NVMC_HOME` 指定缓存目录：

```bash
NVMC_HOME=/path/to/cache nvmc doctor
```

缓存中只保存 Node.js 发行包、pnpm CLI、下载归档和少量 shim。pnpm 安装项目依赖时仍使用 pnpm 自己的 store；你已有的 pnpm store 可以继续复用。

## 下载源

默认下载源：

- Node.js：`https://nodejs.org/dist`
- pnpm：`https://registry.npmjs.org`

可以通过环境变量配置镜像：

```bash
NVMC_NODE_MIRROR=https://nodejs.org/dist
NVMC_NPM_REGISTRY=https://registry.npmjs.org
```

## Roadmap

当前版本聚焦 Node.js 语义：

- Node.js：按项目固定运行版本。
- pnpm：按项目固定包管理器版本。
- npm / yarn：后续可考虑加入同类 Node 包管理器支持。

`nvmc` 不管理 JDK、Android SDK、Python 等非 Node 工具链。
