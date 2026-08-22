"""
LLM provider for the agentic AI platform.

Priority: Sarvam (fast) first, NVIDIA GPT-OSS-120B as fallback.
"""

import logging
import time

import httpx
from langchain_openai import ChatOpenAI

import config

log = logging.getLogger("agent.llm")


def _build_llm(base_url: str, api_key: str, model: str, streaming: bool, temperature: float,
               default_headers: dict | None = None) -> ChatOpenAI:
    return ChatOpenAI(
        api_key=api_key,
        base_url=base_url,
        model=model,
        temperature=temperature,
        max_tokens=config.MAX_TOKENS,
        max_retries=3,
        streaming=streaming,
        timeout=config.MODEL_TIMEOUT,
        **({"default_headers": default_headers} if default_headers else {}),
    )


def get_agent_llm(streaming: bool = True, temperature: float = 0.2) -> ChatOpenAI:
    """Default priority: AgentRouter → Sarvam → NVIDIA."""
    if config.AGENTROUTER_API_KEY:
        return _build_llm(
            config.AGENTROUTER_BASE_URL, config.AGENTROUTER_API_KEY,
            config.AGENTROUTER_MODEL, streaming, temperature,
            default_headers={"User-Agent": config.AGENTROUTER_UA},
        )
    if config.SARVAM_API_KEY:
        return _build_llm(
            config.SARVAM_BASE_URL, config.SARVAM_API_KEY,
            config.AGENT_MODEL, streaming, temperature
        )
    if config.NVIDIA_API_KEY:
        return _build_llm(
            config.NVIDIA_BASE_URL, config.NVIDIA_API_KEY,
            config.NVIDIA_MODEL, streaming, temperature
        )
    raise ValueError("No AI API key configured (AGENTROUTER_API_KEY / SARVAM_API_KEY / NVIDIA_API_KEY)")


def primary_provider() -> str | None:
    if config.AGENTROUTER_API_KEY:
        return "agentrouter"
    if config.SARVAM_API_KEY:
        return "sarvam"
    if config.NVIDIA_API_KEY:
        return "nvidia"
    return None


def get_provider_llm(provider: str, streaming: bool = True, temperature: float = 0.2) -> ChatOpenAI | None:
    """Model for a SPECIFIC provider; None if that provider isn't configured."""
    if provider == "agentrouter" and config.AGENTROUTER_API_KEY:
        return _build_llm(config.AGENTROUTER_BASE_URL, config.AGENTROUTER_API_KEY,
                          config.AGENTROUTER_MODEL, streaming, temperature,
                          default_headers={"User-Agent": config.AGENTROUTER_UA})
    if provider == "sarvam" and config.SARVAM_API_KEY:
        return _build_llm(config.SARVAM_BASE_URL, config.SARVAM_API_KEY,
                          config.AGENT_MODEL, streaming, temperature)
    if provider == "nvidia" and config.NVIDIA_API_KEY:
        return _build_llm(config.NVIDIA_BASE_URL, config.NVIDIA_API_KEY,
                          config.NVIDIA_MODEL, streaming, temperature)
    return None


def other_provider(provider: str) -> str | None:
    order = {"agentrouter": ["sarvam", "nvidia"],
             "sarvam": ["agentrouter", "nvidia"],
             "nvidia": ["agentrouter", "sarvam"]}
    for candidate in order.get(provider, []):
        has_key = ((candidate == "agentrouter" and config.AGENTROUTER_API_KEY) or
                   (candidate == "sarvam" and config.SARVAM_API_KEY) or
                   (candidate == "nvidia" and config.NVIDIA_API_KEY))
        if has_key:
            return candidate
    return None


_PROVIDER_DEAD = ("402", "insufficient_quota", "no credits", "quota exceeded",
                  "401", "invalid api key", "unauthorized", "provider stalled")


def provider_dead(error: Exception) -> bool:
    """True when the error means this provider is unusable right now (billing/auth/stall)."""
    s = str(error).lower()
    return any(p in s for p in _PROVIDER_DEAD)


def _probe_provider(name: str, base_url: str, api_key: str, headers: dict | None = None) -> bool:
    """Quick liveness probe (5s budget)."""
    if not api_key:
        return False
    try:
        start = time.time()
        with httpx.Client(base_url=base_url, timeout=5.0) as client:
            resp = client.get("/models", headers={"Authorization": f"Bearer {api_key}", **(headers or {})})
        if resp.status_code == 200:
            log.info("%s liveness probe: ok (%dms)", name, int((time.time() - start) * 1000))
            return True
        log.warning("%s liveness probe returned HTTP %d", name, resp.status_code)
        return False
    except Exception as e:
        log.warning("%s liveness probe failed: %s", name, e)
        return False


def check_liveness() -> bool:
    """Quick liveness probe — AgentRouter first, then Sarvam, then NVIDIA."""
    if _probe_provider("AgentRouter", config.AGENTROUTER_BASE_URL, config.AGENTROUTER_API_KEY,
                       headers={"User-Agent": config.AGENTROUTER_UA}):
        return True
    if _probe_provider("Sarvam", config.SARVAM_BASE_URL, config.SARVAM_API_KEY):
        return True
    if _probe_provider("NVIDIA", config.NVIDIA_BASE_URL, config.NVIDIA_API_KEY):
        return True
    return False


def get_health() -> dict:
    try:
        reachable = check_liveness()
    except Exception:
        reachable = False
    active_provider = ("agentrouter" if config.AGENTROUTER_API_KEY else
                       "sarvam" if config.SARVAM_API_KEY else
                       "nvidia" if config.NVIDIA_API_KEY else "none")
    models = {"agentrouter": config.AGENTROUTER_MODEL, "sarvam": config.AGENT_MODEL,
              "nvidia": config.NVIDIA_MODEL}
    base_urls = {"agentrouter": config.AGENTROUTER_BASE_URL,
                 "sarvam": config.SARVAM_BASE_URL, "nvidia": config.NVIDIA_BASE_URL}
    return {
        "ok": True,
        "provider": active_provider,
        "model": models.get(active_provider, ""),
        "assistantModel": config.ASSISTANT_MODEL,
        "baseUrl": base_urls.get(active_provider, ""),
        "reachable": reachable,
        "configured": bool(config.NVIDIA_API_KEY or config.SARVAM_API_KEY or config.AGENTROUTER_API_KEY),
    }