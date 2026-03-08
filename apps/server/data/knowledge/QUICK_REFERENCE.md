# Quick Reference - Curated Knowledge Base

## 🚀 Quick Start

### Run Validation
```bash
cd apps/server
python -m app.services.knowledge_validator
```

### Start Server (with automatic validation)
```bash
cd apps/server
python run.py
# Server automatically validates knowledge base on startup
# Blocks if validation fails
```

---

## 📂 File Locations

```
apps/server/data/knowledge/
├── README_CURATED_KNOWLEDGE.md     ← Full documentation
├── IMPLEMENTATION_SUMMARY.md       ← This implementation summary
├── scientific/                     ← Evidence-based treatments
│   ├── fungal.json
│   ├── rot.json
│   └── general_prevention.json
└── ayurvedic/                     ← Traditional treatments
    ├── fungal.json
    ├── rot.json
    └── general_prevention.json

apps/server/app/services/
├── knowledge_validator.py          ← Validation service
└── treatment_retrieval.py          ← Curated-only retrieval

apps/server/app/
├── main.py                         ← Startup validation
└── api/prediction.py               ← /treatment endpoint with safe fallback
```

---

## 🔍 Disease ID Mappings

| Disease ID | Category | Has Scientific? | Has Ayurvedic? |
|-----------|----------|-----------------|----------------|
| `leaf_spot` | fungal | ✅ | ✅ |
| `aloe_rust` | fungal | ✅ | ✅ |
| `anthracnose` | fungal | ✅ | ✅ |
| `root_rot` | rot | ✅ | ✅ |
| `aloe_rot` | rot | ✅ | ✅ |
| `sunburn` | general_prevention | ✅ | ✅ |
| `healthy` | general_prevention | ✅ | ✅ |
| `prevention` | general_prevention | ✅ | ✅ |

---

## 🧪 Quick Tests

### Test 1: Validate All Knowledge
```python
from app.services.knowledge_validator import validate_knowledge_base
from pathlib import Path

knowledge_dir = Path("apps/server/data/knowledge")
is_valid, errors = validate_knowledge_base(knowledge_dir)
print(f"Valid: {is_valid}, Errors: {len(errors)}")
```

### Test 2: Get Scientific Treatment
```python
from app.services.treatment_retrieval import treatment_retriever

result = treatment_retriever.get_treatment('leaf_spot', 'SCIENTIFIC')
print(f"Steps: {len(result.steps)}")
print(f"Safety warnings: {len(result.safety_warnings)}")
print(f"Citations: {len(result.citations)}")
```

### Test 3: Get Ayurvedic Treatment
```python
result = treatment_retriever.get_treatment('root_rot', 'AYURVEDIC')
print(f"Steps: {len(result.steps)}")
print(f"Traditional note: {result.traditional_note if hasattr(result, 'traditional_note') else 'N/A'}")
```

### Test 4: Test Safe Fallback
```python
result = treatment_retriever.get_treatment('unknown_disease', 'SCIENTIFIC')
print(f"Result is None: {result is None}")  # Should print True
```

### Test 5: List Available Treatments
```python
available = treatment_retriever.list_available_treatments()
print(f"Scientific: {available['scientific']}")
print(f"Ayurvedic: {available['ayurvedic']}")
```

---

## 🛡️ Validation Rules Summary

### Required Fields (10)
1. `disease_id`
2. `disease_name`
3. `category`
4. `treatment_steps`
5. `dosage_frequency`
6. `safety_warnings`
7. `when_to_consult_expert`
8. `citations`
9. `evidence_level`
10. `last_updated`

### Minimum Thresholds
- Safety warnings: ≥ 3
- Expert consultation scenarios: ≥ 3
- Citations: ≥ 2
- Treatment steps: ≥ 3

### Citation Requirements
Each citation must have:
- `title`
- `source`
- `year` (1900-2030)
- `authors`
- `key_findings`

### Step Requirements
Each step must have:
- `step_number`
- `title`
- `description` (≥50 characters)
- `duration`
- `materials_needed`

---

## 🔧 Adding New Knowledge

### 1. Create JSON File
```bash
# For scientific treatment
touch apps/server/data/knowledge/scientific/your_disease.json

# For ayurvedic treatment
touch apps/server/data/knowledge/ayurvedic/your_disease.json
```

### 2. Follow Template
See existing files (e.g., `scientific/fungal.json`) for structure.

### 3. Validate
```bash
python -m app.services.knowledge_validator
```

### 4. Update Mapping
Edit `treatment_retrieval.py`:
```python
def _map_disease_to_category(self, disease_id: str) -> Optional[str]:
    mapping = {
        # ... existing mappings ...
        "your_disease_id": "your_category",  # Add this line
    }
```

### 5. Test
```python
result = treatment_retriever.get_treatment('your_disease_id', 'SCIENTIFIC')
assert result is not None
```

---

## 🚨 Common Issues

### Issue: Server won't start
**Cause**: Validation failing
**Fix**:
```bash
python -m app.services.knowledge_validator
# Fix errors shown, then restart server
```

### Issue: Treatment returns None
**Cause**: Disease ID not mapped
**Fix**: Add mapping in `treatment_retrieval.py` → `_map_disease_to_category()`

### Issue: "Missing required field" error
**Cause**: JSON missing required field
**Fix**: Check validation rules above, add missing field

### Issue: "citations must not be empty"
**Cause**: Citations list is empty
**Fix**: Add minimum 2 citations with all required fields

---

## 📊 Knowledge File Stats

| File | Lines | Steps | Warnings | Consultations | Citations | Evidence |
|------|-------|-------|----------|---------------|-----------|----------|
| scientific/fungal.json | 187 | 5 | 7 | 7 | 3 | High |
| scientific/rot.json | 223 | 7 | 8 | 7 | 4 | High |
| scientific/general_prevention.json | 189 | 7 | 7 | 6 | 4 | High |
| ayurvedic/fungal.json | 258 | 6 | 9 | 7 | 4 | Moderate |
| ayurvedic/rot.json | 287 | 8 | 8 | 7 | 4 | Moderate |
| ayurvedic/general_prevention.json | 336 | 9 | 8 | 7 | 5 | Moderate |

**Total**: 1,480 lines, 42 steps, 47 warnings, 41 consultation scenarios, 24 citations

---

## 🎯 API Endpoints

### GET /health
Health check (no authentication required)

### POST /api/v1/treatment
Get curated treatment for a disease

**Request:**
```json
{
  "disease_id": "leaf_spot",
  "mode": "SCIENTIFIC"  // or "AYURVEDIC"
}
```

**Response (200 OK):**
```json
{
  "disease_id": "leaf_spot",
  "mode": "SCIENTIFIC",
  "steps": [...],
  "dosage_frequency": "...",
  "safety_warnings": [...],
  "when_to_consult_expert": [...],
  "citations": [...]
}
```

**Response (404 Not Found - Safe Fallback):**
```json
{
  "error": "CURATED_KNOWLEDGE_NOT_AVAILABLE",
  "message": "We do not have expert-reviewed treatment guidance...",
  "safe_fallback": {
    "recommendation": "Please consult with a plant disease specialist...",
    "why_no_guidance": "To ensure your safety...",
    "what_you_can_do": [...],
    "emergency_resources": [...]
  }
}
```

---

## 📚 Documentation

- **Full Guide**: [README_CURATED_KNOWLEDGE.md](README_CURATED_KNOWLEDGE.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **This File**: Quick reference for developers

---

## ✅ Checklist for Production

- [x] All 6 knowledge files created
- [x] All files pass validation
- [x] Startup validation integrated
- [x] Safe fallback implemented
- [x] Documentation complete
- [x] Tests passing
- [ ] Expert review obtained (recommended)
- [ ] Peer review completed (recommended)
- [ ] Legal review if providing medical advice (recommended)

---

**Last Updated**: 2024-01-15  
**Status**: Production-ready  
**Safety Level**: Maximum (no AI hallucination)
