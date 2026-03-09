"""
RAG Treatment Service
======================
Retrieval-Augmented Generation for aloe vera treatment guidance.

Pipeline:
  1. Build a natural-language query from disease_id + mode
  2. Embed the query with Gemini text-embedding-004
  3. Retrieve top-K most similar chunks from ChromaDB
  4. Send retrieved context + disease info to Gemini for generation
  5. Parse the structured JSON response into TreatmentResponse
  6. Return None on any failure so the caller falls back to curated JSON

Requires:
  - ChromaDB collection pre-populated by scripts/ingest_knowledge.py
  - GEMINI_API_KEY set in .env
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from app.config import settings
from app.schemas import Citation, TreatmentResponse, TreatmentStep

logger = logging.getLogger(__name__)

# Human-readable names and context for each disease
_DISEASE_META: dict[str, dict] = {
    "aloe_rot": {
        "name": "Aloe Rot (basal/root rot, Phytophthora)",
        "hint": "focus on isolation, fungicide drench, repotting in sterile fast-draining soil",
    },
    "aloe_rust": {
        "name": "Aloe Rust (Phakopsora rust fungus)",
        "hint": "focus on fungicide spray, removing pustules, preventing re-infection",
    },
    "anthracnose": {
        "name": "Anthracnose (Colletotrichum gloeosporioides)",
        "hint": "focus on removing sunken lesions, systemic fungicide, sanitation",
    },
    "leaf_spot": {
        "name": "Leaf Spot (Alternaria / Cercospora)",
        "hint": "focus on removing spotted leaves, contact fungicide, improving air circulation",
    },
    "sunburn": {
        "name": "Sunburn (abiotic photo-oxidative stress)",
        "hint": "focus on relocating plant, shade acclimatisation, recovery watering",
    },
    "healthy": {
        "name": "Healthy Aloe vera plant",
        "hint": "focus on preventive care, optimal conditions, routine inspection",
    },
}

_GENERATION_PROMPT_TEMPLATE = """\
You are an expert plant pathologist and horticulturist specialising in Aloe vera.

TASK
----
Provide {mode_label} treatment guidance for "{disease_name}" based ONLY on the
knowledge retrieved below. Do not invent information that is not in the context.

DISEASE CONTEXT HINT
--------------------
{hint}

TREATMENT MODE
--------------
{mode_label} — {approach} approach.

RETRIEVED KNOWLEDGE (use this as your source of truth)
-------------------------------------------------------
{context}

OUTPUT FORMAT
-------------
Return a single JSON object — no markdown, no explanation, ONLY valid JSON.
Schema:
{{
  "steps": [
    {{"title": "<short step label>", "details": "<detailed, actionable description>"}}
  ],
  "dosage_frequency": "<dosage and application frequency as a single string>",
  "safety_warnings": ["<warning>", ...],
  "when_to_consult_expert": ["<situation requiring expert help>", ...],
  "citations": [
    {{"title": "<paper/source title>", "source": "<journal or publication (year)>", "snippet": "<key finding>"}}
  ]
}}

REQUIREMENTS
------------
- Include at least 4 treatment steps
- Include at least 2 safety warnings
- Include at least 2 expert-consultation situations
- Include at least 2 citations from the retrieved knowledge
- Always recommend consulting a plant disease specialist if unsure
"""


class RAGTreatmentService:
    """
    Lazy-initialised RAG service.  Initialisation is deferred to first use so
    the FastAPI process starts even when ChromaDB / Gemini are not yet ready.
    """

    def __init__(self):
        self._ready: bool = False
        self._collection = None
        self._init_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def _ensure_ready(self) -> bool:
        """Initialise on first call.  Returns True when the service is usable."""
        if self._ready:
            return True
        if self._init_error:
            return False  # already failed — do not retry

        if not settings.RAG_ENABLED:
            self._init_error = "RAG_ENABLED is False"
            return False

        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
            self._init_error = "GEMINI_API_KEY not configured"
            logger.warning("RAGTreatmentService: %s", self._init_error)
            return False

        try:
            import chromadb
            import google.generativeai as genai

            genai.configure(api_key=api_key)

            server_root = Path(__file__).resolve().parent.parent.parent
            chroma_path = server_root / settings.RAG_CHROMA_PATH

            if not chroma_path.exists():
                self._init_error = (
                    f"ChromaDB path does not exist: {chroma_path}. "
                    "Run: python scripts/ingest_knowledge.py"
                )
                logger.warning("RAGTreatmentService: %s", self._init_error)
                return False

            client = chromadb.PersistentClient(path=str(chroma_path))
            collection = client.get_collection(name=settings.RAG_COLLECTION)

            if collection.count() == 0:
                self._init_error = "ChromaDB collection is empty. Run ingest_knowledge.py first."
                logger.warning("RAGTreatmentService: %s", self._init_error)
                return False

            self._collection = collection
            self._ready = True
            logger.info(
                "RAGTreatmentService ready — %d chunks in collection '%s'",
                collection.count(),
                settings.RAG_COLLECTION,
            )
            return True

        except Exception as exc:
            self._init_error = str(exc)
            logger.warning("RAGTreatmentService init failed: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def is_ready(self) -> bool:
        return self._ensure_ready()

    def get_treatment(
        self,
        disease_id: str,
        mode: str,
    ) -> Optional[TreatmentResponse]:
        """
        Generate RAG-augmented treatment guidance.

        Returns TreatmentResponse on success, or None so the caller can fall
        back to the curated-JSON retriever.
        """
        if not self._ensure_ready():
            return None

        try:
            import google.generativeai as genai

            meta = _DISEASE_META.get(
                disease_id,
                {"name": disease_id.replace("_", " ").title(), "hint": "general aloe vera care"},
            )
            disease_name = meta["name"]
            hint = meta["hint"]
            mode_label = "Scientific" if mode.upper() == "SCIENTIFIC" else "Ayurvedic / Natural"
            approach = (
                "evidence-based, peer-reviewed, pharmacological"
                if mode.upper() == "SCIENTIFIC"
                else "traditional Ayurvedic, herbal, and natural"
            )

            # 1. Embed query
            query = (
                f"{mode_label} treatment for {disease_name} in Aloe vera — "
                f"symptoms, steps, dosage, safety, prevention"
            )
            embed_result = genai.embed_content(
                model=settings.GEMINI_EMBED_MODEL,
                content=query,
                task_type="retrieval_query",
            )
            query_embedding: list[float] = embed_result["embedding"]

            # 2. Retrieve from ChromaDB
            n = min(settings.RAG_TOP_K, self._collection.count())
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=n,
            )

            docs: list[str] = results.get("documents", [[]])[0]
            if not docs:
                logger.warning("RAG: no documents retrieved for %s", disease_id)
                return None

            context = "\n\n---\n\n".join(docs)

            # 3. Build generation prompt
            prompt = _GENERATION_PROMPT_TEMPLATE.format(
                mode_label=mode_label,
                approach=approach,
                disease_name=disease_name,
                hint=hint,
                context=context,
            )

            # 4. Generate
            model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={
                    "temperature": 0.2,       # low temperature = factual, consistent
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json",
                },
            )
            response = model.generate_content(prompt)
            raw_text = response.text.strip()

            # 5. Parse JSON (strip accidental markdown fences)
            if raw_text.startswith("```"):
                parts = raw_text.split("```")
                raw_text = parts[1].lstrip("json").strip() if len(parts) >= 2 else raw_text

            data: dict = json.loads(raw_text)

            # 6. Map to schema
            steps = [
                TreatmentStep(
                    title=s.get("title", ""),
                    details=s.get("details", ""),
                )
                for s in data.get("steps", [])
            ]
            citations = [
                Citation(
                    title=c.get("title", ""),
                    source=c.get("source", ""),
                    snippet=c.get("snippet", ""),
                )
                for c in data.get("citations", [])
            ]

            return TreatmentResponse(
                disease_id=disease_id,
                mode=mode,
                steps=steps,
                dosage_frequency=data.get("dosage_frequency", "Follow product label instructions."),
                safety_warnings=data.get("safety_warnings", []),
                when_to_consult_expert=data.get("when_to_consult_expert", []),
                citations=citations,
            )

        except Exception as exc:
            logger.error("RAG generation failed for %s (%s): %s", disease_id, mode, exc)
            return None


# Module-level singleton — instantiated once when the module is imported.
rag_treatment_service = RAGTreatmentService()
