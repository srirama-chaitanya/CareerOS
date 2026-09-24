"""
LLM Key Rotation Pool
---------------------
Manages multiple Google API keys to work around Gemini free-tier rate limits.
Each key has its own 15 RPM quota. Rotating between N keys gives you N × 15 RPM
effective throughput with zero cost.

Usage:
  from tools.llm_pool import get_llm, get_creative_llm

  llm = get_llm()          # temperature=0, rotates to next key
  llm_creative = get_creative_llm()  # temperature=0.2

On a 429 (ResourceExhausted), the caller should catch it and call get_llm()
again — it will automatically advance to the next key.
"""

import os
import itertools
import asyncio
import logging
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from google.api_core.exceptions import ResourceExhausted

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-1.5-flash"

# ── Lazy key pool — loaded on first use (after dotenv is read by main.py) ─────
_api_keys: list[str] = []
_key_cycle = None
_key_index = 0


def _ensure_keys_loaded():
    """Load API keys from environment on first call. Safe to call multiple times."""
    global _api_keys, _key_cycle
    if _api_keys:
        return  # already loaded
    keys = []
    primary = os.environ.get("GOOGLE_API_KEY")
    if primary:
        keys.append(primary)
    for i in range(2, 10):
        k = os.environ.get(f"GOOGLE_API_KEY_{i}")
        if k:
            keys.append(k)
    if not keys:
        raise RuntimeError("No GOOGLE_API_KEY found in environment. Set at least one.")
    _api_keys = keys
    _key_cycle = itertools.cycle(range(len(_api_keys)))
    logger.info(f"LLMPool: Loaded {len(keys)} API key(s).")


def _get_next_key() -> str:
    """Round-robin to the next API key."""
    global _key_index, _key_cycle
    _ensure_keys_loaded()
    _key_index = next(_key_cycle)
    return _api_keys[_key_index]


def _build_llm(key: str, temperature: float = 0) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=temperature,
        google_api_key=key,
        max_retries=0,  # We handle retries ourselves for better key rotation
    )


# ── Public helpers ────────────────────────────────────────────────────────────

def get_llm(temperature: float = 0) -> ChatGoogleGenerativeAI:
    """Get an LLM instance with the next key in rotation."""
    return _build_llm(_get_next_key(), temperature)


def get_creative_llm() -> ChatGoogleGenerativeAI:
    """Get a creative LLM (temperature=0.2) with the next key."""
    return _build_llm(_get_next_key(), temperature=0.2)


def invoke_with_retry_sync(messages, max_retries: int = 3, base_delay: float = 2.0):
    """
    Synchronous version of invoke_with_retry for use inside non-async LangGraph nodes.
    On a 429 (ResourceExhausted), rotates to the next API key and retries with backoff.
    """
    import time
    last_exception = None
    llm_instance = get_llm()
    for attempt in range(max_retries + 1):
        try:
            return llm_instance.invoke(messages)
        except ResourceExhausted as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    f"Gemini 429 (sync, attempt {attempt + 1}/{max_retries + 1}). "
                    f"Rotating key and retrying in {delay:.1f}s..."
                )
                time.sleep(delay)
                llm_instance = get_llm()
            else:
                logger.error("Sync: All retry attempts exhausted.")
                raise
        except Exception as e:
            raise e
    raise last_exception


async def invoke_with_retry(llm_instance, messages, max_retries: int = 3, base_delay: float = 2.0):
    """
    Invoke the LLM with exponential backoff.
    On a 429 (ResourceExhausted), it rotates to the next key and retries.
    
    Args:
        llm_instance: A ChatGoogleGenerativeAI instance
        messages: List of LangChain messages
        max_retries: Total retry attempts before giving up
        base_delay: Base seconds for exponential backoff (doubles each retry)
    
    Returns:
        LLM response
    """
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            return llm_instance.invoke(messages)
        except ResourceExhausted as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    f"Gemini 429 on key index {_key_index} (attempt {attempt + 1}/{max_retries + 1}). "
                    f"Rotating key and retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
                llm_instance = get_llm()  # rotate to next key
            else:
                logger.error("All retry attempts exhausted on rate limit.")
                raise
        except Exception as e:
            # Non-rate-limit errors: don't retry, raise immediately
            raise e
    raise last_exception


async def astream_with_retry(llm_instance, messages, max_retries: int = 3, base_delay: float = 2.0):
    """
    Async-stream the LLM with exponential backoff on 429.
    Yields chunks; rotates key and restarts on rate limit errors.
    """
    for attempt in range(max_retries + 1):
        try:
            async for chunk in llm_instance.astream(messages):
                yield chunk
            return  # stream completed successfully
        except ResourceExhausted as e:
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    f"Gemini 429 during stream (attempt {attempt + 1}/{max_retries + 1}). "
                    f"Rotating key and retrying in {delay:.1f}s..."
                )
                await asyncio.sleep(delay)
                llm_instance = get_llm()  # rotate to next key
                # Stream will restart from beginning — warn caller
            else:
                logger.error("Streaming: All retry attempts exhausted on rate limit.")
                raise
        except Exception:
            raise
