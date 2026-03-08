"""
Knowledge base validator for curated treatment guidance

This module ensures that all knowledge base files meet strict quality and safety standards.
It validates structure, required fields, and content quality to prevent AI hallucination
and ensure safe, evidence-based guidance.
"""
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ValidationError:
    """Represents a validation error"""
    file_path: str
    severity: str  # "ERROR" or "WARNING"
    message: str


class KnowledgeValidator:
    """
    Validates curated knowledge base files for safety and completeness
    
    Enforces strict requirements:
    - All required fields must be present
    - Safety warnings must not be empty
    - Citations must not be empty and must include year
    - When to consult expert must not be empty
    - Treatment steps must be detailed and structured
    """
    
    REQUIRED_FIELDS = [
        "disease_id",
        "disease_name", 
        "category",
        "treatment_steps",
        "dosage_frequency",
        "safety_warnings",
        "when_to_consult_expert",
        "citations",
        "evidence_level",
        "last_updated"
    ]
    
    REQUIRED_CITATION_FIELDS = [
        "title",
        "source",
        "year",
        "authors",
        "key_findings"
    ]
    
    REQUIRED_STEP_FIELDS = [
        "step_number",
        "title",
        "description",
        "duration",
        "materials_needed"
    ]
    
    MIN_SAFETY_WARNINGS = 3
    MIN_EXPERT_CONSULTATION_ITEMS = 3
    MIN_CITATIONS = 2
    MIN_TREATMENT_STEPS = 3
    
    def __init__(self, knowledge_base_dir: Path):
        """
        Initialize validator
        
        Args:
            knowledge_base_dir: Path to knowledge/scientific and knowledge/ayurvedic directories
        """
        self.knowledge_base_dir = Path(knowledge_base_dir)
        self.errors: List[ValidationError] = []
        
    def validate_all(self) -> Tuple[bool, List[ValidationError]]:
        """
        Validate all knowledge base files
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        self.errors = []
        
        # Check if directories exist
        scientific_dir = self.knowledge_base_dir / "scientific"
        ayurvedic_dir = self.knowledge_base_dir / "ayurvedic"
        
        if not scientific_dir.exists():
            self.errors.append(ValidationError(
                file_path=str(scientific_dir),
                severity="ERROR",
                message="Scientific knowledge directory does not exist"
            ))
            
        if not ayurvedic_dir.exists():
            self.errors.append(ValidationError(
                file_path=str(ayurvedic_dir),
                severity="ERROR",
                message="Ayurvedic knowledge directory does not exist"
            ))
            
        if self.errors:
            return False, self.errors
            
        # Validate all JSON files in both directories
        for json_file in scientific_dir.glob("*.json"):
            self._validate_file(json_file, "scientific")
            
        for json_file in ayurvedic_dir.glob("*.json"):
            self._validate_file(json_file, "ayurvedic")
            
        # Check for errors
        has_errors = any(err.severity == "ERROR" for err in self.errors)
        
        return not has_errors, self.errors
        
    def _validate_file(self, file_path: Path, category: str):
        """Validate a single knowledge file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message=f"Invalid JSON format: {str(e)}"
            ))
            return
        except Exception as e:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message=f"Failed to read file: {str(e)}"
            ))
            return
            
        # Validate required fields
        for field in self.REQUIRED_FIELDS:
            if field not in data:
                self.errors.append(ValidationError(
                    file_path=str(file_path),
                    severity="ERROR",
                    message=f"Missing required field: {field}"
                ))
                
        # Validate safety warnings
        safety_warnings = data.get("safety_warnings", [])
        if not safety_warnings or len(safety_warnings) == 0:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message="safety_warnings must not be empty - patient safety is critical"
            ))
        elif len(safety_warnings) < self.MIN_SAFETY_WARNINGS:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="WARNING",
                message=f"Only {len(safety_warnings)} safety warnings provided. Minimum {self.MIN_SAFETY_WARNINGS} recommended."
            ))
            
        # Validate when_to_consult_expert
        consult_expert = data.get("when_to_consult_expert", [])
        if not consult_expert or len(consult_expert) == 0:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message="when_to_consult_expert must not be empty - users need clear escalation guidance"
            ))
        elif len(consult_expert) < self.MIN_EXPERT_CONSULTATION_ITEMS:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="WARNING",
                message=f"Only {len(consult_expert)} expert consultation scenarios provided. Minimum {self.MIN_EXPERT_CONSULTATION_ITEMS} recommended."
            ))
            
        # Validate citations
        citations = data.get("citations", [])
        if not citations or len(citations) == 0:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message="citations must not be empty - evidence-based guidance requires sources"
            ))
        elif len(citations) < self.MIN_CITATIONS:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="WARNING",
                message=f"Only {len(citations)} citations provided. Minimum {self.MIN_CITATIONS} recommended for credibility."
            ))
        else:
            # Validate each citation
            for i, citation in enumerate(citations):
                for field in self.REQUIRED_CITATION_FIELDS:
                    if field not in citation or not citation[field]:
                        self.errors.append(ValidationError(
                            file_path=str(file_path),
                            severity="ERROR",
                            message=f"Citation {i+1} missing required field: {field}"
                        ))
                        
                # Validate year is reasonable
                year = citation.get("year")
                if year:
                    try:
                        year_int = int(str(year))
                        if year_int < 1900 or year_int > 2030:
                            self.errors.append(ValidationError(
                                file_path=str(file_path),
                                severity="WARNING",
                                message=f"Citation {i+1} has unusual year: {year}"
                            ))
                    except ValueError:
                        self.errors.append(ValidationError(
                            file_path=str(file_path),
                            severity="ERROR",
                            message=f"Citation {i+1} has invalid year format: {year}"
                        ))
                        
        # Validate treatment steps
        treatment_steps = data.get("treatment_steps", [])
        if not treatment_steps or len(treatment_steps) < self.MIN_TREATMENT_STEPS:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message=f"At least {self.MIN_TREATMENT_STEPS} treatment steps required. Found: {len(treatment_steps)}"
            ))
        else:
            for i, step in enumerate(treatment_steps):
                for field in self.REQUIRED_STEP_FIELDS:
                    if field not in step:
                        self.errors.append(ValidationError(
                            file_path=str(file_path),
                            severity="ERROR",
                            message=f"Treatment step {i+1} missing required field: {field}"
                        ))
                        
                # Validate step description is detailed
                description = step.get("description", "")
                if len(description) < 50:
                    self.errors.append(ValidationError(
                        file_path=str(file_path),
                        severity="WARNING",
                        message=f"Treatment step {i+1} description is too brief (< 50 chars)"
                    ))
                    
        # Validate dosage_frequency is present and non-empty
        dosage_freq = data.get("dosage_frequency", "")
        if not dosage_freq or len(dosage_freq.strip()) == 0:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="ERROR",
                message="dosage_frequency must not be empty - clear frequency guidance is critical"
            ))
            
        # Validate evidence_level is present
        evidence_level = data.get("evidence_level", "")
        if not evidence_level:
            self.errors.append(ValidationError(
                file_path=str(file_path),
                severity="WARNING",
                message="evidence_level should indicate quality of supporting research"
            ))
            
    def get_summary(self) -> str:
        """Get human-readable summary of validation results"""
        if not self.errors:
            return "✅ All knowledge base files validated successfully"
            
        error_count = sum(1 for e in self.errors if e.severity == "ERROR")
        warning_count = sum(1 for e in self.errors if e.severity == "WARNING")
        
        summary = f"Validation completed with {error_count} errors and {warning_count} warnings:\n\n"
        
        for error in self.errors:
            icon = "❌" if error.severity == "ERROR" else "⚠️"
            file_name = Path(error.file_path).name
            summary += f"{icon} {error.severity}: {file_name}\n"
            summary += f"   {error.message}\n\n"
            
        return summary


def validate_knowledge_base(knowledge_dir: Path) -> Tuple[bool, str]:
    """
    Convenience function to validate knowledge base and return results
    
    Args:
        knowledge_dir: Path to knowledge directory (contains scientific/ and ayurvedic/)
        
    Returns:
        Tuple of (is_valid, summary_message)
    """
    validator = KnowledgeValidator(knowledge_dir)
    is_valid, errors = validator.validate_all()
    summary = validator.get_summary()
    
    return is_valid, summary


if __name__ == "__main__":
    # Test validation
    from pathlib import Path
    
    knowledge_dir = Path(__file__).parent.parent.parent / "data" / "knowledge"
    is_valid, summary = validate_knowledge_base(knowledge_dir)
    
    print(summary)
    
    if not is_valid:
        exit(1)
