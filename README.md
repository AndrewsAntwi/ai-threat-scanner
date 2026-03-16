<<<<<<< HEAD
#scanner
=======
# ⬡ AI Threat Scanner v1.0

> AI Security Detection & Analysis Platform — Powered by OpenAI GPT-4

---

## Features

| Module | Description |
|---|---|
| 📡 Threat Intel | Live AI security news with CVE/MITRE ATLAS mapping |
| 🔍 Scanner | Deep security scans for AI agents, MCP servers, LLMs, RAG pipelines |
| ⚗ PoC Lab | Generate safe simulation code for 10+ AI attack types |
| 🔬 Research | On-demand AI security research reports with TTP mapping |
| 🎯 Sec Testing | OWASP LLM / Prompt Injection / Jailbreak test suites with pytest scripts |
| 🔧 Remediation | Auto-generate remediation plans with Python code + monitoring rules |
| 📊 Evaluation | Evaluate agents & GenAI apps via OpenAI Evals API (list evals, create runs, view results) |

---

## Requirements

- **Python** 3.10+
- **Node.js** 18+
- **OpenAI API Key** (GPT-4o recommended)

---

## Quick Start

```bash
# 1. Clone / extract the project
cd ai-threat-scanner

# 2. Make start script executable
chmod +x start.sh

# 3. Launch everything
./start.sh
```

Then open **http://localhost:3000**

**First step:** Go to `Settings` → enter your OpenAI API key.

---

## Manual Start (if start.sh fails)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## Data Persistence

All data is stored as JSON in `backend/data/`:

| File | Contents |
|---|---|
| `findings.json` | Scan results |
| `news.json` | Threat intel items |
| `pocs.json` | Generated PoC simulations |
| `remediations.json` | Remediation plans |
| `research.json` | Research reports |
| `tests.json` | Security test suites |
| `settings.json` | API key + model config |

---

## Security Frameworks Covered

- **MITRE ATLAS** — Adversarial ML TTP mapping
- **OWASP LLM Top 10** — LLM01–LLM10
- **NIST AI RMF** — AI Risk Management Framework
- **EU AI Act** — Compliance controls
- **ISO/IEC 42001** — AI management system
- **CVSS** — Vulnerability scoring

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/settings` | GET/POST | Configure OpenAI key |
| `/api/news/fetch` | POST | Fetch threat intel |
| `/api/scan` | POST | Run security scan |
| `/api/poc/generate` | POST | Generate PoC |
| `/api/remediate` | POST | Generate remediation |
| `/api/research` | POST | Conduct research |
| `/api/test` | POST | Run test suite |
| `/api/evals` | GET/POST | List or create evals (OpenAI Evals API) |
| `/api/evals/{id}/runs` | GET/POST | List or create eval runs |
| `/api/evals/{id}/runs/{run_id}` | GET | Get eval run status/results |
| `/api/stats` | GET | Dashboard metrics |

Full Swagger UI: **http://localhost:8000/docs**

---

## Scan Types

| Type | Target |
|---|---|
| `agent` | AI agents / autonomous systems |
| `mcp` | MCP (Model Context Protocol) servers |
| `llm` | LLM inference endpoints |
| `rag` | RAG pipelines |
| `api` | AI-connected APIs |

---

## Attack Types (PoC Lab)

- Prompt Injection
- Jailbreak
- Data Exfiltration
- Model Inversion
- MCP Tool Abuse
- RAG Poisoning
- Agent Hijacking
- System Prompt Extraction
- Supply Chain Attack
- Adversarial Inputs

---

*Built for AI security engineering. All PoCs are defensive simulations only.*
>>>>>>> 7f2d73e (Initial commint: AI Threat Scanner)
