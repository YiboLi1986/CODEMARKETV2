# 基于规则的智能控制逻辑生成系统

### 应用于石油化工流程自动化

*(由 GitHub Copilot Business Model APIs 提供 AI 能力)*

---

## 📌 项目概述

本项目将 **AI 辅助代码生成** 技术应用于  **石油化工流程/工控领域** ，

使入门级工程师能够通过自然语言描述快速生成符合工业标准的  **JavaScript 控制逻辑** ，

无需具备编程能力。

系统内置  **工业规则引擎** （Industrial Rule Engine），包含已验证的控制模块与安全规范，确保生成逻辑具备：

* 安全性 ✅
* 符合行业标准 ✅
* 可追踪、可审计 ✅
* 支持交互式快速迭代 ✅

> 将复杂的流程控制开发流程
>
> 转变为 **低代码 / 零代码** 模式，显著缩短培训周期和上手时间。

---

## 🎯 项目目标与使命

| 目标                       | 价值                         |
| -------------------------- | ---------------------------- |
| 降低自动化开发门槛         | 入门人员也能快速构建工控逻辑 |
| 融合已有工控经验与安全知识 | 降低人为错误                 |
| 强化流程与安全治理要求     | 自动保证合规性               |
| 提升开发与迭代效率         | 更快完成项目交付             |
| 支持人机共创与逻辑优化     | 持续改进与知识沉淀           |

工程师只需描述  **意图** ，

系统确保  **正确性与安全性** 。

---

## 🧠 工业规则引擎简介

规则集包含工控领域的知识：

* 阀门、泵、PID 控制模块
* 设备运行约束与负载限制
* 高高限停机、联锁、防呆机制
* 压力/温度工艺限制与单位检查
* 启停顺序与容错策略

统一的规则数据结构格式：

<pre class="overflow-visible!" data-start="862" data-end="908"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>RuleID</span><span> | </span><span>Title</span><span> | </span><span>When</span><span> | Must | Example
</span></span></code></div></div></pre>

系统会根据用户描述自动匹配并应用相关规则。

---

## 🏗 高层架构设计

<pre class="overflow-visible!" data-start="952" data-end="1091"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-mermaid"><span>flowchart TD
    A[自然语言控制需求] --> B[工业规则引擎]
    B --> C[Copilot Business Model API]
    C --> D[Streamlit 聊天式前端<br>低代码/零代码交互]
</span></code></div></div></pre>

---

## ⚙️ 系统工作流

### 1️⃣ 规则注入与理解

* 从 `backend/src/rules/` 自动加载工业规则数据
* 转为模型可理解的提示上下文

### 2️⃣ 控制逻辑生成

模型返回完整的 JS 控制模块：

* 控制逻辑与安全联锁
* 输入校验、单位检查
* JSDoc 说明文档
* 使用示例
* ✅ **规则覆盖记录（Rule Coverage）**

### 3️⃣ 多轮交互式优化

用户可发送新需求修改逻辑：

> “增加泵启动延时逻辑并添加高压联锁停机”

AI 自动增量修改并保持合规。

---

## 💬 低代码 / 零代码操作模式

<pre class="overflow-visible!" data-start="1386" data-end="1418"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>工程师 ↔ 聊天界面 ↔ 控制逻辑 ↔ 工控规则
</span></span></code></div></div></pre>

带来显著提升：

* 易用性 ✅
* 协作效率 ✅
* 控制质量与安全性 ✅

---

## 🧪 控制模拟器验证（第2阶段）

生成的逻辑可在 **流程控制模拟器** 中运行验证：

* 动态响应正确性
* 报警 / 联锁行为
* 启停序列执行
* 故障处理策略

并将反馈回 AI → 继续优化：

> 构建类似强化学习的闭环流程
>
> 持续改进生产控制性能与可靠性

---

## 📁 项目结构

<pre class="overflow-visible!" data-start="1640" data-end="1879"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>backend/
└── src/
    ├── config/
    ├── data_io/
    ├── llm/
    ├── prompts/
    ├── </span><span>query</span><span>/
    ├── rule_compiler/
    ├── rules/           </span><span># 工控规则库</span><span>
    └── outputs/         </span><span># 生成记录与会话历史</span><span>
frontend/
└── streamlit_app/       </span><span># 对话式前端</span><span>
</span></span></code></div></div></pre>

---

## 🔒 合规性与可审计性

所有生成代码都包含：

<pre class="overflow-visible!" data-start="1914" data-end="1984"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-js"><span><span>/* Rule Coverage:
- R-012 泵联锁 ✅ 第12行
- R-044 高高压停机 ✅ 第45行
*/
</span></span></code></div></div></pre>

支持：

* 安全审核
* 相关方审计
* 工艺变更管理

---

## 🚀 后续规划

| 方向         | 功能                      |
| ------------ | ------------------------- |
| 闭环学习增强 | 模拟器反馈驱动的自动优化  |
| 自动测试生成 | 故障注入测试策略          |
| 工控系统集成 | PLC/OPC-UA 输出支持       |
| 多语言支持   | Python / C# / IEC 61131-3 |
| 安全隔离部署 | 私网/现场 DCS 网络运行    |

---

## ✅ 项目意义

本项目将石油化工控制系统开发方式彻底升级：

> 从 PLC/DCS 代码的人力开发
>
> → 到 **互动式、规则驱动的 AI 自动化设计**

带来：

* 更快交付 ✅
* 更高安全性 ✅
* 更低培训成本 ✅
* 更强协作能力 ✅
* 更稳定高效的生产运行 ✅

---

## 📌 当前状态

* ✅ 第1阶段：基于规则的 AI 控制逻辑合成
* 🚧 第2阶段：模拟器验证与闭环改进
* 🧭 规划阶段：企业级部署与强化学习自动化

## ▶️ 运行方式

本项目提供基于 **Streamlit** 的对话式前端，用于低代码 / 零代码控制逻辑生成。

### 1️⃣ 环境准备

确保已安装依赖并配置好 LLM 相关环境变量（如 API Key）：

```bash
pip install -r requirements.txt
```

如使用 `.env` 文件，请确保运行环境可正确加载。

### 2️⃣ 启动 Streamlit 前端

在项目根目录下运行：

```bash
streamlit run frontend/streamlit_app/main.py
```

启动后，浏览器将自动打开：

http://localhost:8501

用户可通过聊天界面输入自然语言控制需求，系统将自动调用后端规则引擎与 LLM 生成符合工业规范的控制逻辑。
