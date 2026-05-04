"""
Treatment retrieval service with STRICT curated knowledge base

SAFETY-CRITICAL: This module ONLY retrieves from pre-validated, expert-reviewed knowledge files.
NO free-form generation. NO hallucination. Every response MUST include safety warnings,
expert consultation guidance, and citations.
"""
import json
from pathlib import Path
from typing import Optional, Dict, List
import re

from app.schemas import TreatmentResponse, TreatmentStep, Citation
from app.config import settings


class TreatmentRetriever:
    def __init__(self):
        # Use curated knowledge base ONLY - no free-form generation
        self.knowledge_dir = Path(__file__).parent.parent.parent / "data" / "knowledge"
        self.scientific_dir = self.knowledge_dir / "scientific"
        self.ayurvedic_dir = self.knowledge_dir / "ayurvedic"
        self.knowledge_cache = {}
        self.rag_index: Dict[str, List[Dict]] = {"scientific": [], "ayurvedic": []}
        self.rag_index_built = False

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenizer for lightweight in-memory retrieval."""
        if not text:
            return []
        return [token for token in re.findall(r"[a-z0-9_]+", text.lower()) if len(token) > 1]

    def _compose_document_text(self, knowledge: Dict) -> str:
        """Create searchable text from curated treatment fields."""
        parts: List[str] = [
            knowledge.get("disease_id", ""),
            knowledge.get("disease_name", ""),
            knowledge.get("category", ""),
            knowledge.get("dosage_frequency", ""),
            knowledge.get("evidence_level", ""),
        ]

        for step in knowledge.get("treatment_steps", []):
            parts.append(step.get("title", ""))
            parts.append(step.get("description", ""))

        parts.extend(knowledge.get("safety_warnings", []))
        parts.extend(knowledge.get("when_to_consult_expert", []))

        for citation in knowledge.get("citations", []):
            parts.append(citation.get("title", ""))
            parts.append(citation.get("key_findings", ""))

        return " ".join(parts)

    def _build_rag_index(self):
        """Build in-memory retrieval index from curated JSON files."""
        if self.rag_index_built:
            return

        for mode in ["scientific", "ayurvedic"]:
            mode_dir = self.scientific_dir if mode == "scientific" else self.ayurvedic_dir
            documents: List[Dict] = []

            if not mode_dir.exists():
                self.rag_index[mode] = documents
                continue

            for knowledge_file in mode_dir.glob("*.json"):
                try:
                    with open(knowledge_file, "r", encoding="utf-8") as f:
                        knowledge = json.load(f)

                    if not self._validate_safety_fields(knowledge):
                        continue

                    doc_text = self._compose_document_text(knowledge)
                    documents.append(
                        {
                            "mode": mode,
                            "file": str(knowledge_file),
                            "knowledge": knowledge,
                            "tokens": set(self._tokenize(doc_text)),
                            "category": knowledge.get("category", ""),
                            "disease_id": knowledge.get("disease_id", ""),
                            "disease_name": knowledge.get("disease_name", ""),
                        }
                    )
                except Exception:
                    # Skip malformed files; API will fail safely if nothing is retrievable
                    continue

            self.rag_index[mode] = documents

        self.rag_index_built = True

    def _retrieve_knowledge_with_rag(
        self,
        disease_id: str,
        mode: str,
        query: Optional[str] = None,
    ) -> Optional[Dict]:
        """Retrieve best matching curated knowledge using lightweight RAG scoring."""
        self._build_rag_index()

        mode_key = mode.lower()
        candidates = self.rag_index.get(mode_key, [])
        if not candidates:
            return None

        mapped_category = self._map_disease_to_category(disease_id)
        query_text = f"{disease_id} {query or ''}".strip()
        query_tokens = set(self._tokenize(query_text))

        if not query_tokens:
            query_tokens = {disease_id.lower()}

        scored: List[tuple[float, Dict]] = []
        for doc in candidates:
            score = 0.0

            # Strong exact-id signal
            if doc["disease_id"] == disease_id:
                score += 8.0

            # Category routing prior (preserves domain logic)
            if mapped_category and doc["category"] == mapped_category:
                score += 4.0

            # Token overlap signal
            overlap = len(query_tokens & doc["tokens"])
            if overlap:
                score += overlap * 1.25

            # Weak lexical name match
            disease_id_lex = disease_id.replace("_", " ").lower()
            if disease_id_lex and disease_id_lex in str(doc["disease_name"]).lower():
                score += 1.0

            scored.append((score, doc))

        scored.sort(key=lambda item: item[0], reverse=True)
        best_score, best_doc = scored[0]

        # Require at least one meaningful retrieval signal.
        if best_score <= 0:
            return None

        return best_doc["knowledge"]

    def _build_treatment_response(self, disease_id: str, mode: str, knowledge: Dict) -> TreatmentResponse:
        """Build TreatmentResponse from a validated curated knowledge document."""
        steps = []
        for step_data in knowledge.get("treatment_steps", []):
            steps.append(
                TreatmentStep(
                    title=f"{step_data.get('step_number', '')}. {step_data.get('title', '')}",
                    details=step_data.get('description', ''),
                    duration=step_data.get('duration'),
                    frequency=None  # Not used in new structure
                )
            )

        citations = []
        for cite_data in knowledge.get("citations", []):
            authors_str = ", ".join(cite_data.get("authors", []))
            snippet = f"{cite_data.get('key_findings', '')} (Authors: {authors_str})"

            citations.append(
                Citation(
                    title=cite_data.get("title", ""),
                    source=f"{cite_data.get('source', '')} ({cite_data.get('year', 'N/A')})",
                    snippet=snippet
                )
            )

        return TreatmentResponse(
            disease_id=knowledge.get("disease_id", disease_id),
            mode=mode,
            steps=steps,
            dosage_frequency=knowledge.get("dosage_frequency", ""),
            safety_warnings=knowledge.get("safety_warnings", []),
            when_to_consult_expert=knowledge.get("when_to_consult_expert", []),
            citations=citations
        )
    
    def _load_curated_knowledge(self, category: str, mode: str) -> Optional[Dict]:
        """
        Load ONLY curated, validated knowledge
        
        Args:
            category: Disease category (fungal, rot, general_prevention)
            mode: Treatment mode (scientific or ayurvedic)
            
        Returns:
            Curated knowledge dict or None if not found
        """
        cache_key = f"{mode}:{category}"
        
        if cache_key in self.knowledge_cache:
            return self.knowledge_cache[cache_key]
        
        # Select correct directory based on mode
        if mode.lower() == "scientific":
            knowledge_file = self.scientific_dir / f"{category}.json"
        elif mode.lower() == "ayurvedic":
            knowledge_file = self.ayurvedic_dir / f"{category}.json"
        else:
            return None
            
        if not knowledge_file.exists():
            return None
        
        try:
            with open(knowledge_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Validate critical safety fields exist
                if not self._validate_safety_fields(data):
                    raise ValueError(f"Knowledge file missing critical safety fields: {knowledge_file}")
                self.knowledge_cache[cache_key] = data
                return data
        except Exception as e:
            print(f"ERROR loading curated knowledge: {e}")
            return None
            
    def _validate_safety_fields(self, data: Dict) -> bool:
        """
        Validate that critical safety fields are present and non-empty
        
        This is a runtime safety check to ensure no knowledge file
        can be used without proper safety guidance.
        """
        required_fields = ["safety_warnings", "when_to_consult_expert", "citations"]
        
        for field in required_fields:
            if field not in data:
                return False
            if not data[field]:  # Empty list/string
                return False
            if isinstance(data[field], list) and len(data[field]) == 0:
                return False
                
        # Validate citations have required fields
        for citation in data.get("citations", []):
            if not citation.get("title") or not citation.get("source") or not citation.get("year"):
                return False
                
        return True
    
    def _map_disease_to_category(self, disease_id: str) -> Optional[str]:
        """
        Map disease ID to knowledge base category
        
        This mapping ensures we retrieve the correct curated knowledge file.
        If no mapping exists, we MUST NOT hallucinate - return None instead.
        """
        # Map disease IDs to knowledge categories
        disease_mapping = {
            # Fungal diseases
            "leaf_spot": "fungal",
            "aloe_rust": "fungal",
            "anthracnose": "fungal",
            
            # Rot diseases  
            "root_rot": "rot",
            "aloe_rot": "rot",
            
            # Sunburn (future: needs dedicated knowledge file)
            "sunburn": "general_prevention",  # Fallback to prevention
            
            # Prevention
            "healthy": "general_prevention",
            "prevention": "general_prevention"
        }
        
        return disease_mapping.get(disease_id)
        
    def get_treatment(
        self, 
        disease_id: str, 
        mode: str,
        query: Optional[str] = None
    ) -> Optional[TreatmentResponse]:
        """
        Retrieve CURATED treatment information - NO HALLUCINATION
        
        Args:
            disease_id: The disease identifier
            mode: Treatment mode ("SCIENTIFIC" or "AYURVEDIC")
            query: Ignored - we don't do keyword matching, only retrieval
            
        Returns:
            TreatmentResponse from curated knowledge, or None if not available
            
        SAFETY: This function will NEVER generate treatment steps.
        It ONLY retrieves from pre-validated, expert-reviewed sources.
        """
        # RAG path (enabled by default via config) retrieves best curated context.
        if settings.RAG_ENABLED:
            rag_knowledge = self._retrieve_knowledge_with_rag(
                disease_id=disease_id,
                mode=mode,
                query=query,
            )
            if rag_knowledge:
                return self._build_treatment_response(disease_id, mode, rag_knowledge)

        # Deterministic fallback: map disease to category and read exact curated file.
        category = self._map_disease_to_category(disease_id)
        if not category:
            return None

        knowledge = self._load_curated_knowledge(category, mode)
        if not knowledge:
            return None

        return self._build_treatment_response(disease_id, mode, knowledge)
    
    def list_available_treatments(self) -> Dict[str, List[str]]:
        """
        List all available curated treatments
        
        Returns:
            Dict with 'scientific' and 'ayurvedic' keys, each containing list of categories
        """
        available = {
            "scientific": [],
            "ayurvedic": []
        }
        
        if self.scientific_dir.exists():
            available["scientific"] = [f.stem for f in self.scientific_dir.glob("*.json")]
            
        if self.ayurvedic_dir.exists():
            available["ayurvedic"] = [f.stem for f in self.ayurvedic_dir.glob("*.json")]
            
        return available


# Global instance
treatment_retriever = TreatmentRetriever()
