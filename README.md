# Intelligent Rule-Driven Control Logic Generator

### for Petrochemical Process Automation

*(Powered by GitHub Copilot Business Model APIs)*

---

## 📌 Overview

This project applies AI-assisted code generation to **industrial process automation** in the **oil & gas / petrochemical** domain. It enables entry-level process engineers to build valid **JavaScript-based control logic** using natural-language descriptions — with no programming required.

An **Industrial Rule Engine** provides validated process-control modules and safety rules, ensuring every generated solution is:

* Safe
* Standards-compliant
* Traceably aligned with domain knowledge
* Rapidly editable through an interactive chat interface

> Transform complex process automation into **low-code / no-code** workflows, dramatically reducing onboarding and training costs.

---

## 🎯 Intent & Mission

| Objective                                               | Benefit                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| Democratize process control development                 | Lower skill barrier for new engineers         |
| Encode operational/safety knowledge into reusable rules | More reliable, consistent automation          |
| Enforce compliance and governance                       | Safer production operations                   |
| Accelerate automation delivery cycles                   | Faster productivity and iteration             |
| Enable human-AI co-design                               | Better collaboration and system understanding |

Engineers specify  **intent** .

The system guarantees  **correctness and compliance** .

---

## 🧠 Industrial Rule Engine

Rules describe:

* Valid control modules (valves, pumps, PID loops, timers)
* Equipment limits and operational constraints
* Safety trips, interlocks, and alarm reactions
* Pressure/temperature boundaries with unit enforcement
* Startup/shutdown sequencing

Normalized rule format:

<pre class="overflow-visible!" data-start="1830" data-end="1876"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>RuleID</span><span> | </span><span>Title</span><span> | </span><span>When</span><span> | Must | Example
</span></span></code></div></div></pre>

Rules are automatically selected based on the user request and integrated into generated code.

---

## 🏗 High-Level Architecture

<pre class="overflow-visible!" data-start="2010" data-end="2211"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-mermaid"><span>flowchart TD
    A[Natural-Language Process Request] --> B[Industrial Rule Engine]
    B --> C[Copilot Business Model API]
    C --> D[Streamlit Chat Frontend<br>Low/No Code Interaction]
</span></code></div></div></pre>

---

## ⚙️ System Workflow

### 1️⃣ Rule Injection & Understanding

* Load rule files from `backend/src/rules/`
* Convert into developer prompt context

### 2️⃣ Code Synthesis (Model API)

Model outputs **one** ES module with:

* Process-control logic and interlocks
* Safety logic and validation
* JSDoc annotations
* Usage examples
* ✅ Rule Coverage (commented)

### 3️⃣ Multi-Turn Refinement

Users interactively enhance logic:

> “Add pressure fallback and trip pump if > 9 bar.”

AI incrementally updates code  **without violating rules** .

---

## 🧩 Low-Code / No-Code Interaction

<pre class="overflow-visible!" data-start="2797" data-end="2838"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>Engineer ↔ Chatbot ↔ </span><span>Code</span><span> ↔ Rules
</span></span></code></div></div></pre>

Natural-language collaboration ensures:

* Higher productivity
* Better communication of intent
* Safer and auditable logic generation

---

## 🧪 Validation & Closed-Loop Simulation (Phase-2)

Generated logic can be executed in a **process control simulator** to verify:

* Dynamic response
* Alarm/trip correctness
* Shutdown sequences
* Fault handling behavior

Simulator feedback drives  **iterative improvement** :

> Forming a reinforcement-learning–style closed-loop
>
> for continuously optimizing control automation.

---

## 📁 Project Structure

<pre class="overflow-visible!" data-start="3401" data-end="3685"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>backend/
└── src/
    ├── config/
    ├── data_io/
    ├── llm/
    ├── prompts/
    ├── </span><span>query</span><span>/
    ├── rule_compiler/
    ├── rules/           </span><span># Industrial rule base</span><span>
    └── outputs/         </span><span># Generated results & history</span><span>
frontend/
└── streamlit_app/       </span><span># Conversational UI</span><span>
</span></span></code></div></div></pre>

---

## 🔒 Compliance & Traceability

Every generated file includes:

<pre class="overflow-visible!" data-start="3757" data-end="3862"><div class="contain-inline-size rounded-2xl relative bg-token-sidebar-surface-primary"><div class="sticky top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! language-js"><span><span>/* Rule Coverage:
- R-012 Pump Interlock ✅ Line 12
- R-044 High-High Pressure Trip ✅ Line 45
*/
</span></span></code></div></div></pre>

Supporting safety governance and audit requirements.

---

## 🚀 Future Enhancements

| Area                      | Plan                                           |
| ------------------------- | ---------------------------------------------- |
| Closed-loop learning      | Autonomous improvements with simulator results |
| Auto test generation      | Fault-injection test cases                     |
| SCADA/ICS integration     | OPC-UA/PLC export                              |
| Multi-language support    | Python / C# / IEC 61131-3                      |
| Secure on-prem deployment | Refinery network isolation                     |

---

## ✅ Why It Matters

This project transforms the way petrochemical control systems are developed:

> From PLC/PCS programming complexity
>
> → To **interactive, rule-aware AI-guided automation design**

Benefits:

* Faster development
* Safer operations
* Lower skill barrier
* Improved collaboration
* Higher automation reliability

---

## 📌 Status

* ✅ Phase-1: Rule-driven code synthesis
* 🚧 Phase-2: Simulator validation + closed-loop enhancement
* 🧭 Roadmap: Enterprise deployment & reinforcement-learning automation

## ▶️ How to Run

This project provides a **Streamlit-based conversational frontend** for low-code / no-code industrial control logic generation.

### 1️⃣ Environment Setup

Make sure all dependencies are installed and LLM-related environment variables (e.g. API keys) are properly configured:

```bash
pip install -r requirements.txt
```

If you are using a `.env` file, ensure it is correctly loaded by the runtime environment.

### 2️⃣ Launch the Streamlit Frontend

From the project root directory, run:

```bash
streamlit run frontend/streamlit_app/main.py
```

After launching, the browser will automatically open at:

http://localhost:8501

Users can interact with the system through the chat interface by describing control requirements in natural language. The system will automatically invoke the backend **industrial rule engine** and **LLM** to generate control logic that complies with industrial standards.
