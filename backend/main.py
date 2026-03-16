"""
AI Threat Detection & News Scanner - Backend Server
Powered by OpenAI GPT-4 with persistent storage
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────
DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
DATA_DIR.mkdir(exist_ok=True)
FINDINGS_FILE     = DATA_DIR / "findings.json"
NEWS_FILE         = DATA_DIR / "news.json"
POCS_FILE         = DATA_DIR / "pocs.json"
REMEDIATIONS_FILE = DATA_DIR / "remediations.json"
RESEARCH_FILE     = DATA_DIR / "research.json"
SETTINGS_FILE     = DATA_DIR / "settings.json"
AUDIT_FILE        = DATA_DIR / "audit.json"

app = FastAPI(title="AI Threat Scanner", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return default

def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, default=str))

def get_client() -> OpenAI:
    settings = load_json(SETTINGS_FILE, {})
    key = settings.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    return OpenAI(api_key=key)

def get_model() -> str:
    settings = load_json(SETTINGS_FILE, {})
    return settings.get("model", "gpt-4o")

def get_openai_api_key() -> str:
    settings = load_json(SETTINGS_FILE, {})
    key = settings.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    return key

OPENAI_EVALS_BASE = "https://api.openai.com/v1/evals"

def ts() -> str:
    return datetime.utcnow().isoformat() + "Z"

def chat(client: OpenAI, model: str, prompt: str, max_tokens: int = 4000, temperature: float = 0.5) -> str:
    """Unified chat call — handles both standard and o1 reasoning models."""
    kwargs = dict(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    # o1 models don't support temperature
    if not model.startswith("o1"):
        kwargs["temperature"] = temperature
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content.strip()


# ── Pydantic Models ───────────────────────────────────────────────────────────

class ApiKeyPayload(BaseModel):
    openai_api_key: str
    model: str = "gpt-4o"

class ScanRequest(BaseModel):
    target: str
    scan_type: str  # "agent" | "mcp" | "llm" | "rag" | "api"
    depth: str = "standard"  # "quick" | "standard" | "deep"

class PocRequest(BaseModel):
    finding_id: Optional[str] = None
    attack_type: str  # e.g. "prompt_injection", "jailbreak", "data_exfil"
    target_description: str

class RemediationRequest(BaseModel):
    finding_id: str

class ResearchRequest(BaseModel):
    topic: str
    focus: str = "general"  # "agent" | "mcp" | "llm" | "supply_chain"

class NewsRequest(BaseModel):
    query: str = "AI security threats 2025"
    limit: int = 10


# ── Persistence helpers ───────────────────────────────────────────────────────

def append_record(path: Path, record: dict):
    data = load_json(path, [])
    data.insert(0, record)
    save_json(path, data[:200])  # keep last 200

def audit_log(module: str, action: str, detail: str = "", outcome: str = "success", meta: dict = None):
    """Write a structured audit event to audit.json."""
    record = {
        "id":        str(uuid.uuid4())[:8],
        "timestamp": ts(),
        "module":    module,
        "action":    action,
        "detail":    detail,
        "outcome":   outcome,
        "meta":      meta or {},
    }
    append_record(AUDIT_FILE, record)


# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── Settings ──────────────────────────────────────────────────────────────────

@app.post("/api/settings")
def save_settings(payload: ApiKeyPayload):
    settings = load_json(SETTINGS_FILE, {})
    settings["openai_api_key"] = payload.openai_api_key
    settings["model"] = payload.model
    save_json(SETTINGS_FILE, settings)
    audit_log("settings", "api_key_saved", f"model={payload.model}")
    return {"status": "saved"}

@app.get("/api/settings")
def get_settings():
    settings = load_json(SETTINGS_FILE, {})
    key = settings.get("openai_api_key", "")
    return {
        "configured": bool(key),
        "key_preview": f"sk-...{key[-4:]}" if len(key) > 8 else "",
        "model": settings.get("model", "gpt-4o"),
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": ts()}


# ── Threat Intelligence News ──────────────────────────────────────────────────

@app.post("/api/news/fetch")
def fetch_threat_news(req: NewsRequest):
    client = get_client()
    model  = get_model()

    prompt = f"""You are a world-class AI security threat intelligence analyst.
Generate {req.limit} realistic, current AI security threat intelligence news items for: "{req.query}"

Focus on: prompt injection, jailbreaks, model theft, supply chain attacks on AI libraries,
MCP server vulnerabilities, agentic AI misuse, adversarial ML, LLM data poisoning,
AI governance failures, and RAG exploits.

Return ONLY valid JSON array, no markdown:
[
  {{
    "id": "unique_8char_id",
    "title": "news headline",
    "summary": "2-3 sentence summary",
    "source": "e.g. NIST / MITRE / ArXiv / CVE DB / Wiz Research",
    "severity": "critical|high|medium|low",
    "category": "e.g. Prompt Injection / Model Theft / Supply Chain",
    "cve": "CVE-YYYY-NNNNN or null",
    "mitre_atlas": "e.g. AML.T0051 or null",
    "published_at": "ISO date within last 30 days",
    "url": "https://plausible-source-url.com/article"
  }}
]"""

    raw = chat(client, model, prompt, max_tokens=3000, temperature=0.7)
    raw = raw.replace("```json", "").replace("```", "").strip()
    items = json.loads(raw)

    # persist
    existing = load_json(NEWS_FILE, [])
    ids = {n["id"] for n in existing}
    new_items = [n for n in items if n["id"] not in ids]
    save_json(NEWS_FILE, (new_items + existing)[:200])
    audit_log("threat_intel", "news_fetched", f"query='{req.query}'", meta={"count": len(items)})
    return {"items": items, "total_stored": len(new_items) + len(existing)}

@app.get("/api/news")
def list_news(limit: int = 50):
    return {"items": load_json(NEWS_FILE, [])[:limit]}


# ── Security Scanning ─────────────────────────────────────────────────────────

@app.post("/api/scan")
def run_scan(req: ScanRequest):
    client = get_client()
    model  = get_model()

    type_context = {
        "agent": "AI agent / autonomous LLM system",
        "mcp":   "MCP (Model Context Protocol) server and tool integrations",
        "llm":   "LLM model endpoint / inference API",
        "rag":   "RAG pipeline (retrieval-augmented generation)",
        "api":   "AI-connected REST/GraphQL API",
    }.get(req.scan_type, req.scan_type)

    depth_context = {
        "quick":    "surface-level, top 3 critical findings only",
        "standard": "balanced assessment, 5-8 findings",
        "deep":     "exhaustive red-team analysis, 10+ findings with attack chains",
    }.get(req.depth, "balanced")

    prompt = f"""You are an elite AI red team security architect.
Perform a {depth_context} security scan of a {type_context}.

Target: {req.target}

Apply MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, and EU AI Act lenses.

Return ONLY valid JSON, no markdown:
{{
  "scan_id": "unique_8char",
  "target": "{req.target}",
  "scan_type": "{req.scan_type}",
  "risk_score": 0-100,
  "risk_level": "critical|high|medium|low",
  "findings": [
    {{
      "id": "unique_8char",
      "title": "finding title",
      "description": "detailed technical description",
      "severity": "critical|high|medium|low",
      "cvss_score": 0.0-10.0,
      "attack_vector": "e.g. Prompt Injection via user input",
      "mitre_atlas": "AML.TXXXX",
      "owasp_llm": "LLM01-LLM10 or null",
      "affected_component": "component name",
      "evidence": "what was observed / inferred",
      "exploitability": "easy|moderate|hard",
      "poc_available": true/false
    }}
  ],
  "attack_surface_summary": "paragraph summary",
  "recommendations_preview": ["top 3 immediate actions"]
}}"""

    raw = chat(client, model, prompt, max_tokens=4000, temperature=0.5)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)
    result["timestamp"] = ts()

    # persist findings
    findings = load_json(FINDINGS_FILE, [])
    findings.insert(0, result)
    save_json(FINDINGS_FILE, findings[:100])
    audit_log("scanner", "scan_completed", f"target='{req.target}' type={req.scan_type} depth={req.depth}",
              meta={"scan_id": result.get("scan_id"), "risk_score": result.get("risk_score"),
                    "risk_level": result.get("risk_level"), "findings": len(result.get("findings", []))})
    return result

@app.get("/api/findings")
def list_findings(limit: int = 50):
    return {"items": load_json(FINDINGS_FILE, [])[:limit]}

@app.delete("/api/findings/{scan_id}")
def delete_finding(scan_id: str):
    findings = load_json(FINDINGS_FILE, [])
    findings = [f for f in findings if f.get("scan_id") != scan_id]
    save_json(FINDINGS_FILE, findings)
    audit_log("scanner", "scan_deleted", f"scan_id={scan_id}")
    return {"status": "deleted"}


# ── PoC Generator ─────────────────────────────────────────────────────────────

@app.post("/api/poc/generate")
def generate_poc(req: PocRequest):
    client = get_client()
    model  = get_model()

    prompt = f"""You are an expert AI security researcher writing defensive PoC simulations.
Create a safe, educational proof-of-concept simulation for: {req.attack_type}
Target context: {req.target_description}

The PoC must be:
- Safe and non-destructive (simulation only)
- Educational with inline comments
- Include detection evasion techniques attackers use
- Show what defenders should look for

Return ONLY valid JSON, no markdown:
{{
  "poc_id": "unique_8char",
  "attack_type": "{req.attack_type}",
  "title": "descriptive title",
  "description": "what this demonstrates",
  "severity": "critical|high|medium|low",
  "mitre_atlas": "AML.TXXXX",
  "prerequisites": ["list of prerequisites"],
  "python_code": "full python simulation code as string with \\n newlines",
  "bash_commands": ["optional bash commands for setup"],
  "expected_output": "what a successful attack looks like",
  "detection_indicators": ["IOCs / log patterns to detect this"],
  "defensive_notes": "how to defend against this",
  "references": ["links to research / CVEs"]
}}"""

    raw = chat(client, model, prompt, max_tokens=4000, temperature=0.4)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)
    result["timestamp"] = ts()
    result["finding_id"] = req.finding_id

    append_record(POCS_FILE, result)
    audit_log("poc_lab", "poc_generated", f"type={req.attack_type}", meta={"poc_id": result.get("poc_id"), "severity": result.get("severity")})
    return result

@app.get("/api/pocs")
def list_pocs(limit: int = 50):
    return {"items": load_json(POCS_FILE, [])[:limit]}


# ── Automated Remediation ─────────────────────────────────────────────────────

@app.post("/api/remediate")
def generate_remediation(req: RemediationRequest):
    client = get_client()
    model  = get_model()

    # find the scan
    findings = load_json(FINDINGS_FILE, [])
    scan = next((f for f in findings if f.get("scan_id") == req.finding_id), None)

    if not scan:
        raise HTTPException(404, "Scan not found")

    prompt = f"""You are an AI security remediation architect.
Generate automated remediation strategies for this scan result:

{json.dumps(scan, indent=2)}

Produce actionable, copy-paste-ready remediation for each finding.

Return ONLY valid JSON, no markdown:
{{
  "remediation_id": "unique_8char",
  "scan_id": "{req.finding_id}",
  "target": "{scan.get('target', '')}",
  "remediations": [
    {{
      "finding_id": "finding id this addresses",
      "finding_title": "title",
      "priority": 1-10,
      "effort": "low|medium|high",
      "impact": "low|medium|high",
      "strategy": "description of fix",
      "python_implementation": "ready-to-use Python code snippet",
      "config_changes": {{"key": "value"}},
      "infrastructure_changes": ["list of infra changes"],
      "monitoring_rules": ["detection rules / SIEM queries"],
      "validation_steps": ["how to verify the fix worked"],
      "frameworks_addressed": ["NIST/OWASP/EU-AI-Act controls satisfied"]
    }}
  ],
  "quick_wins": ["top 3 things to do in next 24h"],
  "roadmap": {{"30_day": "...", "60_day": "...", "90_day": "..."}}
}}"""

    raw = chat(client, model, prompt, max_tokens=5000, temperature=0.3)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)
    result["timestamp"] = ts()

    append_record(REMEDIATIONS_FILE, result)
    audit_log("remediation", "remediation_generated", f"scan_id={req.finding_id} target='{scan.get('target','')}'",
              meta={"remediation_id": result.get("remediation_id"), "count": len(result.get("remediations", []))})
    return result

@app.get("/api/remediations")
def list_remediations(limit: int = 50):
    return {"items": load_json(REMEDIATIONS_FILE, [])[:limit]}


# ── Security Research ─────────────────────────────────────────────────────────

@app.post("/api/research")
def conduct_research(req: ResearchRequest):
    client = get_client()
    model  = get_model()

    prompt = f"""You are a senior AI security researcher at a leading threat research lab.
Conduct in-depth security research on: "{req.topic}"
Focus area: {req.focus}

Produce a comprehensive research report covering:
- Threat landscape and evolution
- Novel attack vectors specific to AI systems
- Real-world case studies (named incidents where known)
- Technical deep-dive with code/pseudocode examples
- MITRE ATLAS mapping
- Defensive countermeasures
- Future threat predictions

Return ONLY valid JSON, no markdown:
{{
  "research_id": "unique_8char",
  "title": "research title",
  "topic": "{req.topic}",
  "abstract": "2-3 sentence abstract",
  "threat_level": "critical|high|medium|low",
  "sections": [
    {{
      "heading": "section heading",
      "content": "detailed content",
      "code_example": "optional code snippet or null",
      "references": ["citations"]
    }}
  ],
  "mitre_atlas_ttps": [
    {{
      "id": "AML.TXXXX",
      "name": "technique name",
      "relevance": "how it applies"
    }}
  ],
  "iocs": ["indicators of compromise"],
  "countermeasures": [
    {{
      "control": "control name",
      "description": "how it helps",
      "implementation": "code or config"
    }}
  ],
  "key_findings": ["bullet findings"],
  "risk_rating": 0-100,
  "published_at": "ISO timestamp"
}}"""

    raw = chat(client, model, prompt, max_tokens=6000, temperature=0.5)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)
    result["timestamp"] = ts()

    append_record(RESEARCH_FILE, result)
    audit_log("research", "research_conducted", f"topic='{req.topic}' focus={req.focus}",
              meta={"research_id": result.get("research_id"), "risk_rating": result.get("risk_rating")})
    return result

@app.get("/api/research")
def list_research(limit: int = 50):
    return {"items": load_json(RESEARCH_FILE, [])[:limit]}


# ── Security Testing ─────────────────────────────────────────────────────────

class TestRequest(BaseModel):
    endpoint: str          # target URL or description
    test_suite: str        # "owasp_llm" | "prompt_injection" | "jailbreak" | "dos" | "full"
    model_type: str = "gpt"  # "gpt" | "claude" | "gemini" | "llama" | "custom"

@app.post("/api/test")
def run_security_test(req: TestRequest):
    client = get_client()
    model  = get_model()

    prompt = f"""You are an AI penetration tester running a {req.test_suite} test suite.
Target endpoint/system: {req.endpoint}
Model type: {req.model_type}

Generate a complete security test report with actual test payloads.

Return ONLY valid JSON, no markdown:
{{
  "test_id": "unique_8char",
  "suite": "{req.test_suite}",
  "target": "{req.endpoint}",
  "test_cases": [
    {{
      "id": "TC-001",
      "name": "test name",
      "category": "OWASP LLM category or attack class",
      "payload": "actual test payload / prompt",
      "expected_vulnerable_response": "what a vulnerable system returns",
      "expected_secure_response": "what a secure system returns",
      "severity": "critical|high|medium|low",
      "pass_criteria": "how to determine pass/fail",
      "curl_command": "ready-to-run curl command or null",
      "python_test": "python requests code to run this test"
    }}
  ],
  "automated_test_script": "full Python pytest script that runs all tests",
  "test_summary": "what this suite covers",
  "estimated_duration_minutes": 0,
  "prerequisites": ["what you need to run these tests"]
}}"""

    raw = chat(client, model, prompt, max_tokens=6000, temperature=0.4)
    raw = raw.replace("```json", "").replace("```", "").strip()
    result = json.loads(raw)
    result["timestamp"] = ts()

    append_record(DATA_DIR / "tests.json", result)
    audit_log("sec_testing", "test_suite_run", f"suite={req.test_suite} target='{req.endpoint}'",
              meta={"test_id": result.get("test_id"), "cases": len(result.get("test_cases", []))})
    return result

@app.get("/api/tests")
def list_tests(limit: int = 50):
    return {"items": load_json(DATA_DIR / "tests.json", [])[:limit]}


# ── Evals (OpenAI Evals API proxy) ─────────────────────────────────────────────
# https://platform.openai.com/docs/api-reference/evals

def _evals_request(method: str, path: str, json_body: Optional[dict] = None) -> dict:
    """Proxy request to OpenAI Evals API. path is e.g. '' or '/eval_xxx' or '/eval_xxx/runs'."""
    key = get_openai_api_key()
    url = OPENAI_EVALS_BASE + path
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=60.0) as client:
        if method == "GET":
            r = client.get(url, headers=headers)
        elif method == "POST":
            r = client.post(url, headers=headers, json=json_body or {})
        elif method == "DELETE":
            r = client.delete(url, headers=headers)
        else:
            raise HTTPException(400, "Unsupported method")
        if r.status_code >= 400:
            try:
                err = r.json()
                msg = err.get("error") if isinstance(err.get("error"), str) else (err.get("error") or {}).get("message", r.text)
            except Exception:
                msg = r.text
            detail = msg if isinstance(msg, str) else json.dumps(msg)
            raise HTTPException(r.status_code, detail=detail or "Evals API error")
        return r.json() if r.content else {}


@app.get("/api/evals")
def list_evals():
    """List all evals (agents / GenAI app evaluations)."""
    data = _evals_request("GET", "")
    audit_log("evals", "list_evals", "", meta={"count": len(data.get("data", []))})
    return data


@app.post("/api/evals")
def create_eval(body: dict):
    """Create a new eval. Body: name, description, config (data_source_config, grading_config), etc."""
    result = _evals_request("POST", "", json_body=body)
    audit_log("evals", "create_eval", result.get("id", ""), meta={"name": body.get("name", "")})
    return result


@app.get("/api/evals/{eval_id}")
def get_eval(eval_id: str):
    """Get a single eval by ID."""
    return _evals_request("GET", f"/{eval_id}")


@app.post("/api/evals/{eval_id}")
def update_eval(eval_id: str, body: dict):
    """Update an eval (e.g. name, config)."""
    return _evals_request("POST", f"/{eval_id}", json_body=body)


@app.delete("/api/evals/{eval_id}")
def delete_eval(eval_id: str):
    """Delete an eval."""
    _evals_request("DELETE", f"/{eval_id}")
    audit_log("evals", "delete_eval", eval_id)
    return {"status": "deleted"}


@app.get("/api/evals/{eval_id}/runs")
def list_eval_runs(eval_id: str):
    """List runs for an eval."""
    return _evals_request("GET", f"/{eval_id}/runs")


@app.post("/api/evals/{eval_id}/runs")
def create_eval_run(eval_id: str, body: dict):
    """Create and start an eval run (data_source, model, sampling_params, etc.)."""
    result = _evals_request("POST", f"/{eval_id}/runs", json_body=body)
    audit_log("evals", "create_run", result.get("id", ""), meta={"eval_id": eval_id})
    return result


@app.get("/api/evals/{eval_id}/runs/{run_id}")
def get_eval_run(eval_id: str, run_id: str):
    """Get status and result of an eval run."""
    return _evals_request("GET", f"/{eval_id}/runs/{run_id}")


@app.post("/api/evals/{eval_id}/runs/{run_id}/cancel")
def cancel_eval_run(eval_id: str, run_id: str):
    """Cancel a running eval."""
    return _evals_request("POST", f"/{eval_id}/runs/{run_id}")


@app.delete("/api/evals/{eval_id}/runs/{run_id}")
def delete_eval_run(eval_id: str, run_id: str):
    """Delete an eval run."""
    _evals_request("DELETE", f"/{eval_id}/runs/{run_id}")
    return {"status": "deleted"}


@app.get("/api/evals/{eval_id}/runs/{run_id}/output_items")
def get_eval_run_output_items(eval_id: str, run_id: str):
    """Get output items (per-case results) for a run."""
    return _evals_request("GET", f"/{eval_id}/runs/{run_id}/output_items")


# ── Dashboard Stats ───────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats():
    findings     = load_json(FINDINGS_FILE, [])
    news         = load_json(NEWS_FILE, [])
    pocs         = load_json(POCS_FILE, [])
    remediations = load_json(REMEDIATIONS_FILE, [])
    research     = load_json(RESEARCH_FILE, [])
    tests        = load_json(DATA_DIR / "tests.json", [])

    all_scan_findings = []
    for scan in findings:
        all_scan_findings.extend(scan.get("findings", []))

    critical = sum(1 for f in all_scan_findings if f.get("severity") == "critical")
    high     = sum(1 for f in all_scan_findings if f.get("severity") == "high")
    medium   = sum(1 for f in all_scan_findings if f.get("severity") == "medium")
    low      = sum(1 for f in all_scan_findings if f.get("severity") == "low")

    return {
        "scans": len(findings),
        "total_findings": len(all_scan_findings),
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "news_items": len(news),
        "pocs": len(pocs),
        "remediations": len(remediations),
        "research_reports": len(research),
        "test_suites": len(tests),
    }


# ── Time-Series Stats ─────────────────────────────────────────────────────────

@app.get("/api/stats/timeseries")
def get_timeseries(days: int = 14):
    """
    Returns per-day buckets for scans and findings over the last `days` days.
    Also returns scan-type breakdown and severity trend for charting.
    """
    from datetime import timedelta

    findings = load_json(FINDINGS_FILE, [])
    news     = load_json(NEWS_FILE, [])
    pocs     = load_json(POCS_FILE, [])
    audit    = load_json(AUDIT_FILE, [])

    now   = datetime.utcnow()
    dates = [(now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days - 1, -1, -1)]

    def day_of(record, key="timestamp"):
        raw = record.get(key) or record.get("published_at") or ""
        return raw[:10] if raw else ""

    # Scans per day
    scans_by_day   = {d: 0 for d in dates}
    findings_by_day = {d: {"critical": 0, "high": 0, "medium": 0, "low": 0} for d in dates}
    for scan in findings:
        d = day_of(scan)
        if d in scans_by_day:
            scans_by_day[d] += 1
            for f in scan.get("findings", []):
                sev = f.get("severity", "low")
                if sev in findings_by_day[d]:
                    findings_by_day[d][sev] += 1

    # News per day
    news_by_day = {d: 0 for d in dates}
    for item in news:
        d = day_of(item, "published_at")
        if d in news_by_day:
            news_by_day[d] += 1

    # PoCs per day
    pocs_by_day = {d: 0 for d in dates}
    for p in pocs:
        d = day_of(p)
        if d in pocs_by_day:
            pocs_by_day[d] += 1

    # Audit events per day
    audit_by_day = {d: 0 for d in dates}
    for a in audit:
        d = day_of(a)
        if d in audit_by_day:
            audit_by_day[d] += 1

    # Scan type breakdown
    type_counts: dict = {}
    for scan in findings:
        t = scan.get("scan_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    # Risk score trend (last 20 scans)
    risk_trend = [
        {"date": day_of(s), "score": s.get("risk_score", 0), "target": s.get("target", "")[:24]}
        for s in findings[:20]
        if day_of(s)
    ]

    series = []
    for d in dates:
        series.append({
            "date":     d,
            "scans":    scans_by_day[d],
            "critical": findings_by_day[d]["critical"],
            "high":     findings_by_day[d]["high"],
            "medium":   findings_by_day[d]["medium"],
            "low":      findings_by_day[d]["low"],
            "news":     news_by_day[d],
            "pocs":     pocs_by_day[d],
            "audit":    audit_by_day[d],
        })

    return {
        "series":      series,
        "type_counts": type_counts,
        "risk_trend":  risk_trend,
    }


# ── Global Search ─────────────────────────────────────────────────────────────

@app.get("/api/search")
def global_search(q: str, limit: int = 40):
    """
    Full-text search across all persisted data stores.
    Returns ranked results with module, type, id, title, snippet, and timestamp.
    """
    if not q or len(q) < 2:
        raise HTTPException(400, "Query must be at least 2 characters")

    q_lower = q.lower()
    results = []

    def snippet(text: str, width: int = 120) -> str:
        text = str(text)
        idx = text.lower().find(q_lower)
        if idx == -1:
            return text[:width]
        start = max(0, idx - 40)
        end   = min(len(text), idx + 80)
        return ("…" if start > 0 else "") + text[start:end] + ("…" if end < len(text) else "")

    def score(record: dict) -> int:
        """Simple relevance score — title/key-field hits score higher."""
        txt = json.dumps(record).lower()
        count = txt.count(q_lower)
        title_fields = ["title", "target", "topic", "name", "attack_type"]
        bonus = sum(4 for f in title_fields if q_lower in str(record.get(f, "")).lower())
        return count + bonus

    def search_list(path: Path, module: str, rec_type: str,
                    title_key: str, id_key: str, ts_key: str = "timestamp"):
        for rec in load_json(path, []):
            blob = json.dumps(rec).lower()
            if q_lower in blob:
                results.append({
                    "module":    module,
                    "type":      rec_type,
                    "id":        rec.get(id_key, ""),
                    "title":     str(rec.get(title_key, ""))[:80],
                    "snippet":   snippet(json.dumps(rec)),
                    "severity":  rec.get("severity") or rec.get("risk_level") or rec.get("threat_level", ""),
                    "timestamp": rec.get(ts_key) or rec.get("published_at", ""),
                    "score":     score(rec),
                })

    # findings (scan-level)
    for scan in load_json(FINDINGS_FILE, []):
        blob = json.dumps(scan).lower()
        if q_lower in blob:
            results.append({
                "module":    "scanner",
                "type":      "scan",
                "id":        scan.get("scan_id", ""),
                "title":     f"Scan: {scan.get('target', '')}",
                "snippet":   snippet(json.dumps(scan)),
                "severity":  scan.get("risk_level", ""),
                "timestamp": scan.get("timestamp", ""),
                "score":     score(scan),
            })
        # individual findings within each scan
        for f in scan.get("findings", []):
            if q_lower in json.dumps(f).lower():
                results.append({
                    "module":    "scanner",
                    "type":      "finding",
                    "id":        f.get("id", ""),
                    "title":     f.get("title", ""),
                    "snippet":   snippet(f.get("description", "")),
                    "severity":  f.get("severity", ""),
                    "timestamp": scan.get("timestamp", ""),
                    "score":     score(f) + 1,
                })

    search_list(NEWS_FILE,         "threat_intel", "news",        "title",    "id",            "published_at")
    search_list(POCS_FILE,         "poc_lab",       "poc",         "title",    "poc_id")
    search_list(REMEDIATIONS_FILE, "remediation",   "remediation", "target",   "remediation_id")
    search_list(RESEARCH_FILE,     "research",      "research",    "title",    "research_id")
    search_list(DATA_DIR / "tests.json", "sec_testing", "test",   "target",   "test_id")

    results.sort(key=lambda r: r["score"], reverse=True)
    return {"query": q, "total": len(results), "results": results[:limit]}


# ── Scan Comparison ───────────────────────────────────────────────────────────

@app.get("/api/scans/compare")
def compare_scans(scan_a: str, scan_b: str):
    """
    Compare two scans by their scan_id.
    Returns: shared findings, new findings in B, resolved findings in A→B,
    risk score delta, severity breakdown delta.
    """
    findings = load_json(FINDINGS_FILE, [])
    a = next((s for s in findings if s.get("scan_id") == scan_a), None)
    b = next((s for s in findings if s.get("scan_id") == scan_b), None)
    if not a:
        raise HTTPException(404, f"Scan {scan_a} not found")
    if not b:
        raise HTTPException(404, f"Scan {scan_b} not found")

    # Use finding titles as the matching key (IDs will differ across scans)
    a_titles = {f["title"].strip().lower(): f for f in a.get("findings", [])}
    b_titles = {f["title"].strip().lower(): f for f in b.get("findings", [])}

    new_in_b      = [f for t, f in b_titles.items() if t not in a_titles]
    resolved_in_b = [f for t, f in a_titles.items() if t not in b_titles]
    persisted     = [f for t, f in b_titles.items() if t in a_titles]

    def sev_counts(scan):
        return {
            "critical": sum(1 for f in scan.get("findings", []) if f.get("severity") == "critical"),
            "high":     sum(1 for f in scan.get("findings", []) if f.get("severity") == "high"),
            "medium":   sum(1 for f in scan.get("findings", []) if f.get("severity") == "medium"),
            "low":      sum(1 for f in scan.get("findings", []) if f.get("severity") == "low"),
        }

    sev_a = sev_counts(a)
    sev_b = sev_counts(b)

    risk_delta = (b.get("risk_score", 0) or 0) - (a.get("risk_score", 0) or 0)

    improved = risk_delta < 0
    return {
        "scan_a": {
            "scan_id":    a.get("scan_id"), "target": a.get("target"),
            "timestamp":  a.get("timestamp"), "risk_score": a.get("risk_score"),
            "risk_level": a.get("risk_level"), "total_findings": len(a.get("findings", [])),
            "severity":   sev_a,
        },
        "scan_b": {
            "scan_id":    b.get("scan_id"), "target": b.get("target"),
            "timestamp":  b.get("timestamp"), "risk_score": b.get("risk_score"),
            "risk_level": b.get("risk_level"), "total_findings": len(b.get("findings", [])),
            "severity":   sev_b,
        },
        "delta": {
            "risk_score":      risk_delta,
            "improved":        improved,
            "new_findings":    len(new_in_b),
            "resolved":        len(resolved_in_b),
            "persisted":       len(persisted),
            "severity_delta": {k: sev_b[k] - sev_a[k] for k in sev_a},
        },
        "new_findings":    new_in_b,
        "resolved":        resolved_in_b,
        "persisted":       persisted,
    }


# ── Audit Log ─────────────────────────────────────────────────────────────────

@app.get("/api/audit")
def list_audit(limit: int = 100, module: str = ""):
    items = load_json(AUDIT_FILE, [])
    if module:
        items = [i for i in items if i.get("module") == module]
    return {"items": items[:limit], "total": len(items)}

@app.delete("/api/audit")
def clear_audit():
    save_json(AUDIT_FILE, [])
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
