# RepoCensus

> Fork 即用的 GitHub 仓库智能分类仪表盘 —— 零服务器、零成本、自动刷新。

[English](./README.md) | **中文**

## 这是什么？

RepoCensus 扫描你 **所有的 GitHub 仓库**（自建 + Fork + Star），自动智能分类，生成一个精美的交互式仪表盘，部署到 GitHub Pages。

### 核心特性

| 特性 | 说明 |
|------|------|
| **三合一视图** | 自建仓库、Fork 仓库、Star 仓库统一展示在一个仪表盘 |
| **智能自动分类** | 多信号加权引擎（Topics + 语言 + 关键词），无需手动打标签 |
| **6 种预设模板** | 按技术领域 / 按编程语言 / 按活跃度 / 按用途 / 按来源 / AI 专项，一键切换 |
| **Trending 热榜** | Star 增速排行 + 月均 velocity，支持分类筛选 |
| **健康评分** | 每个仓库 0-100 综合分（更新时间 + Star + README + License + Topics） |
| **沉默仓库检测** | 自动识别长期未更新、低 Star 的自建仓库，建议归档/删除 |
| **Star 时间线** | 按时间分组展示你最近 Star 了什么，标记新增 |
| **技术画像** | 语言分布、领域覆盖、活跃度分析 |
| **分享卡片 + Badge** | 一键生成技术画像分享卡片（PNG/SVG）+ shields.io 风格 README Badge |
| **暗色/亮色主题** | 自动检测系统主题，一键切换 |
| **零服务器** | 纯静态站点，部署在 GitHub Pages，不花一分钱 |
| **自动刷新** | GitHub Actions 每周自动拉取最新数据（也可手动触发） |

## 快速开始

```
1. Fork 本仓库
2. 进入 Settings → Pages → Source 选择 GitHub Actions
3. 进入 Actions 标签页 → "Generate Dashboard" → Run workflow
4. 访问 https://<你的用户名>.github.io/repocensus/
```

就这几步，无需配置任何环境变量 —— `GITHUB_TOKEN` 由 GitHub Actions 自动提供。

## 工作原理

```
GitHub Actions（每周定时触发）
  │
  ├─ 1. 通过 GitHub API 拉取 repos + starred 数据
  ├─ 2. 运行分类引擎（5 种模板，多信号加权匹配）
  ├─ 3. 计算健康评分 + 生成技术画像
  ├─ 4. 用 Vite 构建 Vue 3 SPA
  └─ 5. 部署到 GitHub Pages
```

所有数据在 **构建时** 烘焙到静态文件中。仪表盘在运行时 **零 API 调用** —— 纯 HTML/CSS/JS，页面秒开。

## 分类模板详解

### 5 种预设模板

| 模板 | 分类维度 | 适用场景 | 分类示例 |
|------|---------|---------|---------|
| **按技术领域** | 仓库做什么 | 了解技术栈全貌 | AI/ML · 后端 · 前端 · DevOps · 数据 · 安全 · 机器人 |
| **按编程语言** | 用什么语言写 | 看语言分布、技术栈偏向 | Java · Python · TypeScript · Go · Rust · 其他 |
| **按活跃度** | 最后更新时间 | 清理 stale 仓库、看维护状态 | 活跃(<6月) · 沉默(6月-2年) · 归档(>2年) |
| **按用途** | 仓库的角色 | 看自己的产出结构 | 模板/脚手架 · 学习/笔记 · 应用/工具 · 配置/个人主页 |
| **按来源** | 自建/Fork/Star | 区分仓库来源 | 自建 · Fork · Star |

### 分类引擎：多信号加权

| 信号 | 权重 | 说明 |
|------|------|------|
| Topics | 10 | 仓库 owner 自己打的标签，最可靠 |
| Language | 5 | 主语言 → 领域映射 |
| 关键词（名称） | 3 | name 中的模板词："template"、"admin"、"algo" |
| 关键词（描述） | 2 | description 中的领域词："机器学习"、"proxy"、"agent" |

匹配流程：Topics → Language → 名称关键词 → 描述关键词 → 兜底 Other

## 自定义配置

### 修改分类规则

编辑 `config/templates.yml` 添加自定义分类模板：

```yaml
templates:
  - id: my-custom
    name: 我的分类
    categories:
      - name: 前端
        matchers:
          - { field: topics, operator: contains, value: [vue, react, angular], weight: 10 }
          - { field: language, operator: equals, value: [typescript, javascript], weight: 5 }
      - name: 后端
        matchers:
          - { field: topics, operator: contains, value: [spring, fastapi, django], weight: 10 }
          - { field: language, operator: equals, value: [java, python, go], weight: 5 }
```

### 修改刷新频率

编辑 `.github/workflows/generate.yml`：

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # 每周一次（默认）
    - cron: '0 0 * * *'  # 每天一次
```

### 本地开发

```bash
npm install
npm run dev
```

开发服务器使用 `src/data/repos.json` 中的示例数据。如需拉取真实数据：

```bash
export GITHUB_TOKEN=ghp_your_token
export GITHUB_USERNAME=your_username
npm run fetch
npm run dev
```

## 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Vue 3 + TypeScript | 主流、轻量、生态好 |
| 构建 | Vite 6 | 快速构建，Vue 官方推荐 |
| 分类引擎 | 纯 TypeScript | 零依赖，可独立测试 |
| CI/CD | GitHub Actions | 免费无限分钟（公开仓库） |
| 托管 | GitHub Pages | 零成本静态托管 |
| 图表 | 手写 SVG | 不引入图表库，控制体积 |

## 项目结构

```
repocensus/
├── .github/workflows/
│   └── generate.yml           # Action: 拉取 → 分类 → 构建 → 部署
├── src/
│   ├── engine/                # 核心分类引擎（纯 TS，零依赖）
│   │   ├── types.ts           # 类型定义
│   │   ├── templates.ts       # 5 种预设分类模板
│   │   ├── categorizer.ts     # 多信号加权匹配器
│   │   ├── health.ts          # 健康评分计算器
│   │   └── profiler.ts        # 技术画像 + 沉默仓库分析
│   ├── components/            # Vue 组件
│   │   ├── RepoCard.vue       # 仓库卡片
│   │   ├── TechProfile.vue    # 技术画像
│   │   └── StarTimeline.vue   # Star 时间线
│   ├── composables/           # 组合式函数
│   │   ├── useRepos.ts        # 数据 + 筛选 + 模板切换
│   │   └── useTheme.ts        # 暗色/亮色主题
│   ├── data/
│   │   └── repos.json         # 数据文件（Action 自动更新）
│   ├── styles/
│   │   └── main.css           # 全局样式 + 主题变量
│   ├── App.vue                # 主应用
│   └── main.ts                # 入口
├── scripts/
│   └── fetch.ts               # GitHub API 数据拉取脚本
├── config/
│   └── templates.yml          # 自定义分类模板配置
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 健康评分算法

| 维度 | 权重 | 评分规则 |
|------|------|---------|
| 更新时间 | 40% | <6个月满分，>2年零分，线性递减 |
| Star 数 | 20% | ≥100 满分，对数缩放 |
| 有 README | 15% | 有=满分，无=0 |
| 有 Topics | 10% | 有=满分，无=0 |
| 有 License | 10% | 有=满分，无=0 |
| Issues 活跃度 | 5% | 有 open issues 满分 |

分数对应颜色：🟢 绿色 (>70) / 🟡 黄色 (40-70) / 🔴 红色 (<40)

## 常见问题

**需要服务器吗？**
不需要。一切都是静态的。GitHub Actions 负责拉取数据并构建站点，GitHub Pages 负责托管。

**会触发 API 速率限制吗？**
不会。数据拉取仅需 2-20 次 API 调用（取决于仓库数量），远低于 5000 次/小时的限制。推荐搜索功能（如启用）限制在 30 次/分钟内，内置节流。

**可以查看别人的仓库吗？**
可以。Fork 本仓库后，在 Actions 中设置 `GITHUB_USERNAME` 为目标用户名即可。只要对方的仓库是公开的就行。

**数据隐私如何？**
你的仓库元数据（公开仓库、Star 列表）在 GitHub 上本来就是公开的。RepoCensus 只是重新组织展示，数据始终留在你自己的 GitHub 仓库内，不经过任何第三方。

**构建会超时吗？**
不会。正常用户（几十到几百个仓库）整个流程约 1 分钟完成。Workflow 设置了 10 分钟超时熔断，异常情况会及时失败而非卡死。

## 开发路线图

| 版本 | 计划功能 | 状态 |
|------|---------|------|
| v1.0 | 核心 MVP：数据采集 + 分类引擎 + 仪表盘 + GitHub Actions | ✅ |
| v1.1 | YAML 自定义分类规则 + 交叉维度 + AI 专项分类 + Markdown 导出 | ✅ |
| v1.2 | Trending 热榜（Star 增速排行 + 月均 velocity + 分类筛选） | ✅ |
| v1.3 | 技术画像分享卡片（PNG/SVG 下载）+ README Badge | ✅ |
| v1.4 | 版本进度面板（Changelog + Roadmap）+ Trending 筛选联动修复 | ✅ |
| v1.5 | 年度仓库报告（类似 Spotify Wrapped，年度 star 统计 + 领域分析 + 活跃月份） | ✅ |
| v1.6 | 搜索 + 高级过滤（按 stars / language / date / topics 多维度组合过滤） | ✅ |
| v1.7 | 智能推荐（基于技术画像推荐可能感兴趣的仓库，topics 相似度匹配） | ✅ |
| v1.8 | 仓库笔记/标签（localStorage 自定义标签）+ 变化追踪（archive/改名/star 涨跌） | 🔲 |
| v1.9 | 数据导出（CSV / JSON，支持导入 Notion、飞书） | 🔲 |
| v2.0 | 多用户对比（输入 GitHub 用户名对比技术画像 + Star 重叠度） | 🔲 |
| v2.1 | i18n 中英双语国际化 | 🔲 |
| v2.2 | 移动端适配（响应式布局优化） | 🔲 |

## 与竞品对比

| 对比项 | GitHub 原生 | [Astral](https://astralapp.com) | **RepoCensus** |
|--------|------------|--------------------------------|----------------|
| 覆盖范围 | 分开查看 | 仅 Star 仓库 | **自建 + Fork + Star 三合一** |
| 分类方式 | 无 | 手动打标签 | **自动智能分类** |
| 数据存储 | GitHub 自有 | 第三方服务器 | **用户自己的仓库内** |
| 部署成本 | - | 需注册第三方账号 | **Fork 即用** |
| 可视化 | 列表 | 标签列表 | **分类仪表盘 + 技术画像** |
| 自动刷新 | - | 需手动操作 | **GitHub Actions 定时自动** |

## License

MIT
