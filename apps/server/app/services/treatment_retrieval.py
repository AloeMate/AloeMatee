"""
Treatment retrieval service with STRICT curated knowledge base

SAFETY-CRITICAL: This module ONLY retrieves from pre-validated, expert-reviewed knowledge files.
NO free-form generation. NO hallucination. Every response MUST include safety warnings,
expert consultation guidance, and citations.
"""
import json
from pathlib import Path
from typing import Optional, Dict, List

from app.schemas import TreatmentResponse, TreatmentStep, Citation


class TreatmentRetriever:
    def __init__(self):
        # Use curated knowledge base ONLY - no free-form generation
        self.knowledge_dir = Path(__file__).parent.parent.parent / "data" / "knowledge"
        self.scientific_dir = self.knowledge_dir / "scientific"
        self.ayurvedic_dir = self.knowledge_dir / "ayurvedic"
        self.knowledge_cache = {}
    
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
        # Map disease to knowledge category
        category = self._map_disease_to_category(disease_id)
        if not category:
            # NO MAPPING = NO HALLUCINATION
            # Return None to trigger safe fallback in API
            return None
        
        # Load curated knowledge
        knowledge = self._load_curated_knowledge(category, mode)
        if not knowledge:
            # Knowledge file not found or validation failed
            return None
        
        # Build treatment steps from curated data
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
        
        # Build citations - REQUIRED for credibility
        citations = []
        for cite_data in knowledge.get("citations", []):
            # Build citation snippet from key findings
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
