"""AI tools: content generation via the Sarvam/NVIDIA OpenAI-compatible endpoints.

These never touch the DB — they stream-free generate text for the agent to
relay (quizzes, explanations, analyses). Domain is "helper" so the helper
subagent owns them.
"""

from openai import AsyncOpenAI

import config
from registry import agent_tool
from tools.common import fail, ok


def _client() -> AsyncOpenAI | None:
    if config.SARVAM_API_KEY:
        return AsyncOpenAI(base_url=config.SARVAM_BASE_URL, api_key=config.SARVAM_API_KEY,
                           timeout=config.MODEL_TIMEOUT)
    if config.NVIDIA_API_KEY:
        return AsyncOpenAI(base_url=config.NVIDIA_BASE_URL, api_key=config.NVIDIA_API_KEY,
                           timeout=config.MODEL_TIMEOUT)
    return None


async def _generate(system: str, user_prompt: str, max_tokens: int = 2000) -> str:
    client = _client()
    if not client:
        raise RuntimeError("No AI provider configured")
    resp = await client.chat.completions.create(
        model=config.AGENT_MODEL,
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user_prompt}],
        max_tokens=max_tokens,
        temperature=0.4,
    )
    return resp.choices[0].message.content or ""


@agent_tool(name="ai_quiz", label="Generate quiz", domain="helper",
            description="Generate a quiz with an answer key on a topic. Args: topic, numQuestions?, difficulty?(easy|medium|hard), gradeLevel?.")
async def ai_quiz(topic: str, num_questions: int = 5, difficulty: str = "medium",
                  grade_level: str = "") -> dict:
    if not topic:
        return fail("topic is required")
    n = max(1, min(int(num_questions or 5), 20))
    try:
        text = await _generate(
            "You are a quiz generator for school students. Output ONLY valid JSON: "
            '{"questions":[{"question":str,"options":[4 strings],"answerIndex":0-3}]} '
            "followed by no commentary.",
            f"Create {n} {difficulty} multiple-choice questions about '{topic}'"
            + (f" for {grade_level}" if grade_level else "") + ".",
        )
        return ok(f"Generated {n}-question quiz on '{topic}'", {"quiz_text": text[:8000]})
    except Exception as e:
        return fail(f"Quiz generation failed: {e}")


@agent_tool(name="ai_explain", label="Explain concept", domain="helper",
            description="Explain a concept at the right level. Args: concept, level?(simple|standard|advanced), context?.")
async def ai_explain(concept: str, level: str = "simple", context: str = "") -> dict:
    if not concept:
        return fail("concept is required")
    try:
        text = await _generate(
            f"You are a patient teacher. Explain concepts at a {level} level using short "
            "paragraphs and one concrete example. No markdown headers.",
            f"Explain: {concept}" + (f"\nContext: {context}" if context else ""),
        )
        return ok("Explanation ready", {"explanation": text[:8000]})
    except Exception as e:
        return fail(f"Explanation failed: {e}")


@agent_tool(name="ai_analyze", label="Analyze data/text", domain="helper",
            description="Analyze pasted text or numbers and summarize insights. Args: content, question?.")
async def ai_analyze(content: str, question: str = "") -> dict:
    if not content:
        return fail("content is required")
    try:
        text = await _generate(
            "You are an analyst. Be concise: bullet-point insights first, then a one-"
            "paragraph takeaway.",
            f"Analyze this:\n\n{content[:12000]}\n\n" + (f"Focus question: {question}" if question else "Summarize the key points."),
        )
        return ok("Analysis complete", {"analysis": text[:8000]})
    except Exception as e:
        return fail(f"Analysis failed: {e}")
