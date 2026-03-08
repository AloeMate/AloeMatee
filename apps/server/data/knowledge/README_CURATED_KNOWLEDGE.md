# Curated Knowledge Base System

## 🔒 Why Curated Sources Only?

AloeVeraMate uses a **strictly curated knowledge base** for all treatment guidance to ensure:

### Safety First
- **NO AI hallucination** of medical/treatment advice
- **NO free-form generation** of procedures or dosages
- **Every response includes**:
  - Safety warnings reviewed by experts
  - Clear guidance on when to consult professionals
  - Citations to peer-reviewed research or validated traditional sources

### Quality Assurance
- All treatment guidance is **expert-reviewed**
- Scientific treatments backed by **peer-reviewed research** (journals, universities)
- Ayurvedic treatments based on **validated traditional knowledge** with emerging scientific support
- Regular updates as new research emerges

### Legal & Ethical Responsibility
- Providing plant treatment advice carries responsibility
- Incorrect guidance could harm plants or potentially humans (if products misused)
- Curated approach ensures accountability and traceability

---

## 📚 Knowledge Base Structure

```
apps/server/data/knowledge/
├── scientific/
│   ├── fungal.json           # Fungal diseases (Alternaria, Cercospora, etc.)
│   ├── rot.json              # Root and stem rot (Phytophthora, Pythium, Fusarium)
│   └── general_prevention.json # Evidence-based prevention practices
│
└── ayurvedic/
    ├── fungal.json           # Traditional Ayurvedic treatment for fungal issues
    ├── rot.json              # Ayurvedic approach to rot (Kapha imbalance)
    └── general_prevention.json # Dosha-balancing preventive care
```

### Scientific vs. Ayurvedic Guidance

#### Scientific (Modern Evidence-Based)
- **Approach**: Based on plant pathology, microbiology, and horticultural science
- **Treatments**: Fungicides, bactericides, systemic treatments, environmental modifications
- **Evidence**: Peer-reviewed research from journals like Plant Disease, Phytopathology, HortScience
- **Best For**: Users seeking conventional, research-validated approaches
- **Examples**:
  - Copper-based fungicides for leaf spot (85-92% efficacy in studies)
  - Temperature scaling for calibrated disease predictions
  - Systematic root excision and fungicide treatment for rot

#### Ayurvedic (Traditional Wisdom)
- **Approach**: Based on ancient Indian plant care principles, dosha balance (Vata, Pitta, Kapha)
- **Treatments**: Herbal preparations (neem, turmeric, Tulsi), Panchagavya, mindful practices
- **Evidence**: Centuries of traditional use + emerging scientific validation studies
- **Best For**: Users seeking holistic, organic, traditional approaches
- **Examples**:
  - Neem oil + turmeric paste (antifungal properties validated in research)
  - Panchagavya soil drench (beneficial microbes, disease suppression)
  - Dosha-balancing environmental adjustments

#### Key Differences

| Aspect | Scientific | Ayurvedic |
|--------|-----------|-----------|
| **Philosophy** | Disease as pathogen invasion | Disease as dosha imbalance |
| **Diagnosis** | Pathogen identification | Energy/element assessment |
| **Treatment** | Targeted antimicrobials | Holistic balance restoration |
| **Products** | Synthetic/mineral fungicides | Herbal/natural preparations |
| **Approach** | Reductionist, targeted | Holistic, systemic |
| **Evidence** | Controlled trials, peer review | Traditional use + emerging research |
| **Time to Results** | Often faster | May take longer but builds resilience |

---

## 🛡️ Safety Validation System

### Startup Validation
Every time the server starts, it **automatically validates** all knowledge files:

```python
# apps/server/app/services/knowledge_validator.py
validator = KnowledgeValidator(knowledge_dir)
is_valid, errors = validator.validate_all()
```

### What Gets Validated?

#### Required Fields (ALL must be present)
- ✅ `disease_id` - Unique identifier
- ✅ `disease_name` - Full name
- ✅ `category` - Classification (fungal, rot, prevention)
- ✅ `treatment_steps` - Detailed procedures
- ✅ `dosage_frequency` - Clear application timing
- ✅ `safety_warnings` - **Cannot be empty** (minimum 3)
- ✅ `when_to_consult_expert` - **Cannot be empty** (minimum 3)
- ✅ `citations` - **Cannot be empty** (minimum 2)
- ✅ `evidence_level` - Quality indicator
- ✅ `last_updated` - Review date

#### Safety-Critical Validations
1. **Safety Warnings**: Must have at least 3 specific warnings
2. **Expert Consultation**: Must provide clear scenarios when professional help needed
3. **Citations**: Each must include:
   - Title
   - Source (journal/publication)
   - Year (reasonable date range)
   - Authors
   - Key findings

#### Treatment Step Validation
Each step must have:
- Step number (sequence)
- Title (clear action)
- Description (minimum 50 characters - detailed enough to be useful)
- Duration (how long it takes)
- Materials needed (what you need)

### Server Startup Behavior

**✅ If Validation Passes:**
```
🔒 Validating curated knowledge base...
✅ Knowledge base validation passed
✅ All knowledge base files validated successfully
INFO:     Started server process
```

**❌ If Validation Fails:**
```
🔒 Validating curated knowledge base...
❌ KNOWLEDGE BASE VALIDATION FAILED
❌ ERROR: fungal.json
   Missing required field: safety_warnings
❌ ERROR: rot.json
   citations must not be empty
RuntimeError: Knowledge base validation failed. Server cannot start.
```

**Server will NOT start** until all issues are fixed.

---

## 🚫 What Happens When Knowledge Is Not Available?

### No Hallucination Policy

If a user requests treatment for a disease not in our curated knowledge base:

**We DO NOT:**
- ❌ Generate treatment steps using AI
- ❌ Provide generic advice
- ❌ Make up dosages or procedures
- ❌ Guess at safety precautions

**We DO:**
- ✅ Return clear "knowledge not available" message
- ✅ Explain WHY we can't provide guidance
- ✅ Recommend expert consultation
- ✅ Provide list of appropriate resources
- ✅ Suggest interim safety measures (isolation, documentation)

### Safe Fallback Response

```json
{
  "error": "CURATED_KNOWLEDGE_NOT_AVAILABLE",
  "message": "We do not have expert-reviewed treatment guidance for 'sunburn' in SCIENTIFIC mode.",
  "safe_fallback": {
    "recommendation": "Please consult with a plant disease specialist...",
    "why_no_guidance": "To ensure your safety and the health of your plants...",
    "what_you_can_do": [
      "Take clear, well-lit photos",
      "Note recent changes in care",
      "Consult local nursery",
      "Search peer-reviewed literature",
      "Isolate affected plant"
    ],
    "emergency_resources": [
      "Local agricultural extension offices",
      "Certified plant disease specialists",
      "University horticulture departments"
    ]
  }
}
```

---

## 📝 Knowledge File Format

### Required Structure

```json
{
  "disease_id": "leaf_spot",
  "disease_name": "Fungal Leaf Spot (Alternaria, Cercospora)",
  "category": "fungal",
  
  "treatment_steps": [
    {
      "step_number": 1,
      "title": "Isolate the affected plant",
      "description": "Move plant at least 3 feet from others...",
      "duration": "Immediate",
      "materials_needed": ["Gloves", "Clean area"]
    }
  ],
  
  "dosage_frequency": "Copper spray: every 7-10 days for 3 applications...",
  
  "safety_warnings": [
    "ALWAYS wear protective eyewear and gloves",
    "DO NOT apply in temperatures above 85°F",
    "Keep away from waterways - toxic to aquatic life"
  ],
  
  "when_to_consult_expert": [
    "Spots continue spreading after 3 weeks",
    "More than 50% of plant affected",
    "Multiple plants show symptoms"
  ],
  
  "citations": [
    {
      "title": "Management of Fungal Leaf Spot Diseases...",
      "source": "Plant Disease, American Phytopathological Society",
      "year": "2022",
      "authors": ["Johnson, M.E.", "Patel, R.K."],
      "doi": "10.1094/PDIS-12-21-2645",
      "key_findings": "Copper-based fungicides showed 85-92% efficacy..."
    }
  ],
  
  "evidence_level": "High - Based on peer-reviewed research",
  "last_updated": "2024-01-15",
  "reviewed_by": "Plant Pathology Expert Panel"
}
```

---

## 🔄 Adding New Knowledge

### Process for New Diseases

1. **Research & Validation**
   - Gather peer-reviewed research papers
   - Consult with plant pathology experts
   - Validate traditional knowledge claims with experts
   - Document all sources with full citations

2. **Create JSON File**
   - Use required structure (see above)
   - Include minimum 3 safety warnings
   - Include minimum 3 expert consultation scenarios
   - Include minimum 2 citations (3-5 recommended)
   - Write detailed treatment steps (>50 chars each)

3. **Validation Check**
   ```bash
   cd apps/server
   python -m app.services.knowledge_validator
   ```

4. **Expert Review**
   - Have draft reviewed by qualified expert
   - Document reviewer credentials
   - Update `reviewed_by` field

5. **Testing**
   - Test API endpoint with new disease_id
   - Verify all fields appear correctly
   - Check safety warnings render properly
   - Verify citations are complete

6. **Update Mappings**
   - Add disease_id to `_map_disease_to_category()` in treatment_retrieval.py
   - Update API documentation
   - Add to test suite

---

## 🧪 Testing the System

### Validate Knowledge Base

```bash
cd apps/server
python -m app.services.knowledge_validator
```

### Test API Endpoints

```bash
# Test valid disease
curl -X POST http://localhost:8000/api/v1/treatment \
  -H "Content-Type: application/json" \
  -d '{"disease_id": "leaf_spot", "mode": "SCIENTIFIC"}'

# Test missing disease (should return safe fallback)
curl -X POST http://localhost:8000/api/v1/treatment \
  -H "Content-Type: application/json" \
  -d '{"disease_id": "unknown_disease", "mode": "SCIENTIFIC"}'
```

### Verify Startup Validation

```bash
# Should see validation messages in logs
cd apps/server
python run.py
```

---

## 📊 Current Knowledge Coverage

### Scientific Mode
- ✅ **Fungal diseases**: Leaf spot (Alternaria, Cercospora)
- ✅ **Rot diseases**: Root rot (Phytophthora, Pythium, Fusarium)
- ✅ **Prevention**: Evidence-based preventive practices

### Ayurvedic Mode
- ✅ **Fungal diseases**: Pitta imbalance treatment with herbal preparations
- ✅ **Rot diseases**: Kapha excess treatment with dosha balancing
- ✅ **Prevention**: Holistic care through dosha balance and Prana enhancement

### To Be Added (Future)
- 🔄 Aloe Rust (specific treatment beyond general fungal)
- 🔄 Sunburn (dedicated knowledge file)
- 🔄 Anthracnose (specific fungal subspecies)
- 🔄 Bacterial infections (Pseudomonas, Xanthomonas)
- 🔄 Viral diseases (if applicable to aloe)
- 🔄 Pest-related diseases (mealybugs, scale, etc.)

---

## 🎯 Design Principles

1. **Safety Over Convenience**
   - Better to say "we don't know" than to guess
   - Every response must include safety guidance
   - Clear escalation path to experts

2. **Evidence-Based**
   - Scientific: Peer-reviewed research only
   - Ayurvedic: Validated traditional knowledge + emerging research
   - All claims must have citations

3. **Transparency**
   - Users know when they're getting AI predictions vs. curated guidance
   - Evidence levels clearly stated
   - Limitations acknowledged

4. **Continuous Improvement**
   - Regular review and updates
   - Add new knowledge as research emerges
   - Incorporate user feedback and expert input

---

## 📞 Questions or Issues?

- **Missing knowledge for a disease?** See "Adding New Knowledge" section
- **Validation errors?** Check file structure matches required format
- **Safety concerns?** Consult with plant pathology expert before adding content
- **Technical issues?** Check server logs for detailed error messages

---

**Remember**: This system exists to protect both users and plants. Never compromise on safety validation or evidence quality.
