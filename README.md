# Agnes Playground

线上地址：https://ijaa.github.io/agnes-playground/

免费畅用 Agnes 大模型的前端体验台：支持文本对话、图像生成与视频生成。纯静态页面，API Key 与生成结果仅保存在本地浏览器。

> 非官方托管页，用于快速试用 [Agnes](https://agnes-ai.com/) 模型 API。

## 功能

- **媒体生成**
  - 文生图 / 图生图（最多 4 张参考图）
  - 文生视频 / 图生视频
  - 可切换模型、画面比例与视频时长
- **分析与问答**
  - 文本对话、图片分析
  - 默认开启深度思考
  - 支持联网搜索补充信息
- **本地结果管理**
  - 生成结果写入 IndexedDB
  - 支持预览、复制提示词、下载
  - 预览弹窗统一图片 / 视频布局，视频按原始比例展示

## 支持的模型

| 模型 | 用途 |
| --- | --- |
| `agnes-image-2.5-flash` | 图像生成（推荐） |
| `agnes-image-2.1-flash` | 图像生成（上一代） |
| `agnes-image-2.0-flash` | 图像快速生成 |
| `agnes-video-2.5-flash` | 视频生成 |
| `agnes-2.5-flash` | 通用对话 / 高并发（推荐） |
| `agnes-2.0-flash` | 编程 / Agent / 推理 |

图像模型默认使用 `agnes-image-2.5-flash`（[官方文档](https://agnes-ai.com/zh-Hans/docs/agnes-image-25-flash)）：相比 2.1 在图像生成、编辑、构图、细节与提示词遵循上整体更强，请求参数、支持尺寸与计费方式与 2.1 完全一致。下拉框保留 2.1 / 2.0 以便对比。

## 快速开始

### 1. 获取 API Key

前往 [Agnes 开发者平台](https://platform.agnes-ai.com/) 获取 Key。

### 2. 本地预览

任意静态服务器即可，例如：

```bash
# Python
python3 -m http.server 5173

# Node.js
npx serve .
```

浏览器打开：

```text
http://localhost:5173
```

### 3. 开始使用

1. 点击右上角 **API Key**，保存密钥（仅写入 `localStorage`）
2. 选择「媒体输出」或「分析与问答」
3. 输入提示词 / 上传参考图后开始生成

## 项目结构

```text
.
├── index.html      # 页面结构
├── styles.css      # 样式
├── app.js          # 交互与 API 调用
├── assets/         # Logo、favicon 等静态资源
└── README.md
```

## API 说明

针对部分国内网络访问情况，本项目已统一使用国内 API 域名：

| 项目 | 地址 |
| --- | --- |
| **Base URL** | `https://apihub.agnes-ai.cn/v1` |
| 图像生成 | `POST /images/generations` |
| 视频生成 | `POST /videos` |
| 视频查询 | `GET /agnesapi?video_id=...` |
| 对话补全 | `POST /chat/completions` |

### 图像生成参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `model` | 是 | `agnes-image-2.5-flash` |
| `prompt` | 是 | 生成或编辑指令 |
| `size` | 是 | 官方推荐档位 `1K` / `2K` / `3K` / `4K`；也兼容 `1024x768` 这类精确尺寸，但非原生尺寸会被服务端归一化 |
| `ratio` | 否 | 与档位式 `size` 配合，支持 `1:1`、`3:4`、`4:3`、`16:9`、`9:16`、`2:3`、`3:2`、`21:9`，默认 `1:1` |
| `extra_body.image` | 图生图必填 | 参考图数组，公网 HTTPS URL 或完整 Data URI Base64 |
| `extra_body.response_format` | 否 | `url` 或 `b64_json`；**不要放在请求体顶层** |

> 当前页面传的是精确尺寸（如 9:16 → `2048x3640`），与 2.1 时期行为一致；如需可预期的输出尺寸，建议改用档位 `size` + `ratio`。

说明：

- 原国际域名 `apihub.agnes-ai.com` 已替换为 `apihub.agnes-ai.cn`
- 仅接口域名变更；**API Key、模型名称、请求参数与调用方式均无需修改**
- 详细能力与参数以 [Agnes 平台文档](https://platform.agnes-ai.com/) 为准

## 隐私与数据

| 数据 | 存储位置 | 说明 |
| --- | --- | --- |
| API Key | `localStorage`（`agnes_api_key`） | 仅本机浏览器，不上传到本站 |
| 生成结果 | IndexedDB（`AgnesCreativeSpace` / `results`） | 刷新后仍可查看；清理站点数据会删除 |

请求直接发往 Agnes 官方 API；部分辅助能力（如图片代理、联网搜索）会走项目配置的辅助服务。

## 相关链接

- [Agnes 官网](https://agnes-ai.com/)
- [Agnes 开发者平台](https://platform.agnes-ai.com/)

## 许可

本仓库为非官方体验页，仅供学习与试用。使用 Agnes API 请遵守官方服务条款。


## 部署

本项目作为 `ijaa.github.io` 的私有子站聚合发布：

```text
https://ijaa.github.io/agnes-playground/
```

构建命令：

```bash
npm install
npm run build
```

产物输出到 `dist/`，静态资源使用相对路径，可直接挂到子路径。

## 许可证

本项目采用 [Apache License 2.0](./LICENSE) 开源协议。
