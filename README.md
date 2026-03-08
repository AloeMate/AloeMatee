# 🌿 AloeVeraMate

An intelligent mobile application for detecting aloe vera plant diseases and providing treatment guidance through both scientific and Ayurvedic approaches.

##  Quick Start

```bash
# 1. Train Model (First Time Setup)
cd apps/training
pip install -r requirements.txt
python split.py                                    # Create train/val/test splits
python train.py --epochs 30 --batch_size 32       # Train model (~30min on GPU)
python calibrate.py                                # Calibrate probabilities
python eval.py --calibration_path ./artifacts/calibration.json  # Evaluate
python export.py                                   # Export for serving

# 2. Copy Model to Server
# Option A: Copy files (Windows)
Copy-Item apps\training\artifacts\model.pt apps\server\data\models\
Copy-Item apps\training\artifacts\model_metadata.json apps\server\data\models\

# Option B: Copy files (Linux/Mac)
cp apps/training/artifacts/model.pt apps/server/data/models/
cp apps/training/artifacts/model_metadata.json apps/server/data/models/

# 3. Start Backend (Terminal 1)
cd apps/server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4. Test API
python scripts/test_predict.py  # Automated test with sample images
# Or manually:
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/model_info

# 5. Start Mobile (Terminal 2)
cd apps/mobile
npm install
# Create .env: API_URL=http://10.0.2.2:8000 (Android) or http://localhost:8000 (iOS)
npm start
```

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Mobile App Setup (React Native Expo)](#3-mobile-app-setup-react-native-expo)
- [Running the Application](#running-the-application)
  - [Start Backend Server](#start-backend-server)
  - [Start Mobile App](#start-mobile-app)
- [Camera Capture Flow](#camera-capture-flow)
- [Confidence-Based Results](#confidence-based-results)
- [API Documentation](#api-documentation)
- [Technology Stack](#technology-stack)
- [Future Enhancements](#future-enhancements)
- [License](#license)

## ✨ Features

### Component 1: Disease Detection & Treatment Guidance

1. **📸 Multi-Photo Capture**: Capture up to 3 photos with guided instructions
   - Close-up of lesion/affected area
   - Whole plant view
   - Base/soil view
2. **🔬 AI Disease Detection**: EfficientNetV2-S with temperature calibration
   - Supports 6 diseases + healthy plant detection
   - Real PyTorch inference with calibrated confidence
   - Image quality validation (blur, brightness checks)
   - Ready for production deployment
3. **📊 Smart Results**: View top-3 disease predictions with confidence-based recommendations
   - High confidence (≥80%): Direct treatment options
   - Medium confidence (60-79%): Treatment with caution warning
   - Low confidence (<60%): Retake suggestions with improvement tips
   - Quality check failures: Specific guidance (focus, lighting)
4. **💊 Treatment Plans**: Detailed step-by-step treatment guidance with:
   - Scientific treatment (evidence-based)
   - Ayurvedic treatment (traditional herbal)
   - Actionable steps with duration and frequency
   - Safety warnings
   - When to consult expert
   - Research citations with sources

## 🏗️ Architecture

```
┌─────────────────────────────┐
│   Mobile App                │
│  (React Native + Expo)      │
│   - Multi-Photo Capture     │
│   - Expo Router Navigation  │
│   - Confidence-Based UI     │
│   - Treatment Guidance      │
└──────────┬──────────────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│   Backend API       │
│    (FastAPI)        │
│   - Disease Model   │
│   - RAG System      │
│   - Treatment DB    │
└─────────────────────┘
```

## 📁 Project Structure

```
AloeVeraMate/
├── apps/
│   ├── mobile/                     # React Native Expo app
│   │   ├── app/                    # Expo Router screens
│   │   │   ├── _layout.tsx         # Root layout
│   │   │   ├── index.tsx           # Home screen
│   │   │   ├── capture-guide.tsx   # Photo instructions
│   │   │   ├── camera-capture.tsx  # Multi-photo capture
│   │   │   ├── upload.tsx          # Upload progress
│   │   │   ├── results.tsx         # AI results
│   │   │   └── treatment.tsx       # Treatment plan
│   │   ├── components/             # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── config/                 # Configuration
│   │   │   └── index.ts            # API URLs, thresholds
│   │   ├── app.json                # Expo configuration
│   │   ├── package.json            # Dependencies
│   │   └── .env.example            # Environment template
│   │
│   └── server/                     # FastAPI backend
│       ├── app/
│       │   ├── api/                # API endpoints
│       │   │   └── prediction.py   # Multi-image prediction
│       │   ├── services/           # Business logic
│       │   │   └── disease_prediction.py
│       │   ├── config.py           # Configuration
│       │   ├── schemas.py          # Pydantic models
│       │   └── main.py             # FastAPI app
│       ├── requirements.txt        # Python dependencies
│       └── .env.example            # Environment template
│
├── shared/
│   └── types/                      # Shared TypeScript types (future)
│
└── README.md                       # This file
```

## 📦 Prerequisites

### For Mobile App:
- **Node.js** >= 18.x ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Expo Go** app on your mobile device:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### For Backend:
- **Python** >= 3.10 ([Download](https://www.python.org/downloads/))
- **pip** (comes with Python)
- **Virtual environment** (recommended)

## 🚀 Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd AloeVeraMate
```

### 2. Backend Setup (FastAPI)

#### Step 1: Navigate to server directory
```bash
cd apps/server
```

#### Step 2: Create virtual environment (recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Configure environment variables
```bash
# Copy example environment file
copy .env.example .env    # Windows
# or
cp .env.example .env      # macOS/Linux
```

Edit `.env` file if needed (defaults work for local development).

#### Step 5: Verify installation
```bash
python -c "import fastapi; print('FastAPI installed successfully')"
```

### 3. Mobile App Setup (React Native Expo)

#### Step 1: Navigate to mobile directory
```bash
cd apps/mobile
```

#### Step 2: Install dependencies
```bash
npm install
```

#### Step 3: Configure environment variables
```bash
# Copy example environment file
copy .env.example .env    # Windows
# or
cp .env.example .env      # macOS/Linux
```

#### Step 4: Update API URL in `.env`

**Important:** Update the `API_URL` based on your setup:

- **If using Android Emulator:** `API_URL=http://10.0.2.2:8000`
- **If using iOS Simulator:** `API_URL=http://localhost:8000`  
- **If using Physical Device:** Use your computer's IP (e.g., `API_URL=http://192.168.1.100:8000`)

To find your IP address:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

Example `.env` file:
```env
# For physical device - replace with your computer's IP
API_URL=http://192.168.1.100:8000
```

## 🎮 Running the Application

### Start Backend Server

1. **Open a terminal** and navigate to server directory:
```bash
cd apps/server
```

2. **Activate virtual environment** (if not already active):
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. **Start the server:**
```bash
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

4. **Verify backend is running:**
- Open browser and visit: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health check: http://localhost:8000/health

**Test the API:**
```bash
# Health check
curl http://localhost:8000/health

# Get diseases
curl http://localhost:8000/api/v1/diseases
```

### Start Mobile App

1. **Open a new terminal** and navigate to mobile directory:
```bash
cd apps/mobile
```

2. **Start Expo development server:**
```bash
npm start
```

3. **You'll see a QR code in the terminal.** Expo Dev Tools will also open in your browser.

4. **Run on your device:**

   **Option A: Using Expo Go (Recommended for testing)**
   - Install **Expo Go** app on your phone
   - Scan the QR code:
     - **iOS:** Use Camera app
     - **Android:** Use Expo Go app's QR scanner
   - The app will load on your device

   **Option B: Using Emulator**
   - **Android Emulator:** Press `a` in the terminal
   - **iOS Simulator:** Press `i` in the terminal (macOS only)

5. **Ensure both devices are on the same network** (your computer and phone)

## 📸 Camera Capture Flow

The app uses a **3-stage photo capture** workflow for optimal disease detection:

### Screen Flow
```
Home → Capture Guide → Camera (3 photos) → Upload → Results → Treatment
```

### Photo Stages
1. **Stage 1/3:** Close-up of lesion/affected area
   - Captures disease symptoms in detail
   - Focus on discolored or damaged areas
2. **Stage 2/3:** Whole plant view
   - Shows overall plant health context
   - Includes multiple leaves and growth pattern
3. **Stage 3/3:** Base/soil view
   - Captures root area and soil condition
   - Important for root-related diseases

### Features
- **Progress indicators** (1/3, 2/3, 3/3)
- **Photo preview** after each capture
- **Retake option** for each photo
- **Sample overlay** guidance in Capture Guide screen

## 🎯 Confidence-Based Results

The app provides intelligent feedback based on AI prediction confidence:

### High Confidence (≥80%)
- ✅ **Green badge** with "High Confidence"
- Direct access to treatment plans
- Shows "View Treatment Plan" button
- Displays top-3 predictions with confidence bars

### Medium Confidence (60-79%)
- ⚠️ **Orange badge** with "Medium Confidence"
- Shows treatment options with warning banner
- Displays caution message
- Recommends verifying with expert if symptoms worsen

### Low Confidence (<60%)
- ❌ **Red badge** with "Low Confidence"
- Suggests retaking photos
- Provides improvement tips:
  - Better lighting conditions
  - Clear focus on affected areas
  - Capture from multiple angles
- "Retake Photos" button to restart capture

## 📚 API Documentation

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "message": "AloeVeraMate API is running"
}
```

#### 2. Predict Disease (Multi-Image)
```http
POST /api/v1/predict
Content-Type: multipart/form-data
```

**Request:**
- `files`: 1-3 image files (JPG, JPEG, PNG)

**Response:**
```json
{
  "status": "High",
  "predictions": [
    {
      "disease_id": "root_rot",
      "disease_name": "Root Rot",
      "confidence": 0.892,
      "description": "Fungal infection causing root decay..."
    },
    // ... 2 more predictions
  ],
  "message": "Analysis complete"
}
```

#### 3. Get Treatment
```http
POST /api/v1/treatment
Content-Type: application/json
```

**Request:**
```json
{
  "disease_id": "root_rot",
  "treatment_type": "scientific"
}
```

**Response:**
```json
{
  "disease_id": "root_rot",
  "disease_name": "Root Rot",
  "treatment_type": "scientific",
  "overview": "Root rot is a serious fungal infection...",
  "steps": [
    {
      "title": "Remove from pot and inspect roots",
      "description": "Carefully remove the plant...",
      "duration": "15-20 minutes",
      "frequency": "One-time"
    }
    // ... more steps
  ],
  "safety_warnings": ["Always sterilize cutting tools..."],
  "additional_tips": ["Ensure pots have adequate drainage..."],
  "citations": [
    {
      "text": "Treatment guidelines based on research",
      "source": "Journal of Plant Pathology",
      "url": "https://example.com"
    }
  ]
}
```

### Interactive API Documentation

Visit http://localhost:8000/docs for Swagger UI with interactive API testing.

## 🛠️ Development

### Mobile App Development

```bash
# Navigate to mobile directory
cd apps/mobile

# Start development server
npm start

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

### Backend Development

```bash
# Navigate to server directory
cd apps/server

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run server with auto-reload
python run.py

# Run linting
black app/
flake8 app/

# Type checking
mypy app/
```

### Root Level Scripts

From the root directory:

```bash
# Install mobile dependencies
npm run install:mobile

# Install server dependencies
npm run install:server

# Start mobile app
npm run mobile

# Start server
npm run server

# Run mobile linting
npm run lint:mobile

# Run server linting
npm run lint:server
```

## 💻 Technology Stack

### Mobile App
- **React Native** - Cross-platform mobile framework
- **Expo SDK 51** - Development platform
- **Expo Router** - File-based navigation
- **TypeScript** - Type-safe JavaScript
- **expo-camera** - Multi-photo capture
- **Axios** - HTTP client

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server
- **Python-multipart** - Multi-file upload support
- **Pillow** - Image processing (future)

### Shared
- **TypeScript** - Shared type definitions (future)

## 🔮 Future Enhancements

### Planned Features:
1. **Real ML Model Integration:**
   - Train deep learning model on aloe vera disease dataset
   - Multi-image fusion for better predictions
   - Support for multiple plant types

2. **Enhanced UX:**
   - User authentication and profile
   - Prediction history with timestamps
   - Treatment progress tracking
   - Reminders for treatment steps
   - Photo comparison (before/after)

3. **Community Features:**
   - Expert consultation booking
   - Community forum
   - User-submitted photos
   - Treatment success stories

4. **Advanced Capabilities:**
   - Offline mode with local caching
   - Multi-language support
   - Export treatment plans as PDF
   - Disease severity timeline
   - Push notifications

5. **Scientific Integration:**
   - RAG implementation with research papers
   - Real-time treatment updates from studies
   - Integration with plant disease databases

## 📄 License

This project is licensed under the MIT License.

---

## 🐛 Troubleshooting

### Common Issues:

**1. Mobile app can't connect to backend:**
- Ensure backend is running on `http://127.0.0.1:8000`
- Check `.env` file has correct `API_URL`:
  - Android Emulator: `http://10.0.2.2:8000`
  - iOS Simulator: `http://localhost:8000`
  - Physical Device: Use your computer's IP (e.g., `http://192.168.1.100:8000`)
- Ensure phone and computer are on same WiFi network (for physical devices)
- Disable firewall or add exception for port 8000

**2. "Module not found" errors:**
- Run `npm install` in `apps/mobile` directory
- Clear cache: `npm start -- --reset-cache`

**3. Python dependency errors:**
- Ensure virtual environment is activated
- Upgrade pip: `pip install --upgrade pip`
- Reinstall dependencies: `pip install -r requirements.txt`

**4. Expo app shows "Unable to load":**
- Check that `expo` and `expo-router` packages are installed
- Try clearing cache: `npm start -- --reset-cache`
- Restart Expo Go app

**5. Camera permissions not working:**
- Ensure camera permissions are granted in device settings
- Restart the Expo Go app after granting permissions
- On iOS: Check Settings → Expo Go → Camera
- On Android: Check Settings → Apps → Expo Go → Permissions

**6. TypeScript errors:**
- Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` is configured correctly
- Restart TypeScript server in VS Code

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review API documentation at http://localhost:8000/docs

## ✅ Testing Checklist

Before deploying or submitting, verify these core features:

### Backend Tests
- [ ] **Health Endpoint**: `curl http://localhost:8000/health` returns 200 OK
- [ ] **CORS Configured**: Expo dev client can connect without CORS errors
- [ ] **File Validation**: Upload limits enforced (10MB max, jpg/jpeg/png only)
- [ ] **Logging**: Request logs appear in terminal with request_id and confidence

### Mobile App Tests
- [ ] **Camera Capture**: 
  - Can capture 3 photos (close-up, whole plant, base view)
  - Progress indicator shows 1/3, 2/3, 3/3
  - Can retake any photo
  - Photos are saved correctly

- [ ] **Image Upload**:
  - FormData sends image1, image2, image3 correctly
  - Progress bar animates during upload
  - Upload succeeds with network connection
  - Error UI shows on network failure with retry option

- [ ] **Low Confidence Flow**:
  - When confidence <60%, shows "Low Confidence" warning
  - Displays `retake_message` with specific tips
  - Shows "Retake Photos" button
  - No treatment buttons visible
  - Can navigate back to camera

- [ ] **High/Medium Confidence Flow**:
  - Shows confidence badge (GREEN for HIGH ≥80%, ORANGE for MEDIUM 60-79%)
  - Displays top-3 predictions sorted by probability
  - Shows "Scientific Treatment" and "Ayurvedic Treatment" buttons
  - Displays symptoms summary

- [ ] **Treatment Loading**:
  - **Scientific Mode**: 
    - Loads treatment with research-based steps
    - Shows citations with sources
    - Displays safety warnings
    - Shows "When to Consult Expert" section
  - **Ayurvedic Mode**:
    - Loads herbal treatment steps
    - Shows traditional remedies (neem, turmeric, etc.)
    - Includes Ayurvedic citations
    - Different content than scientific mode

- [ ] **Error Handling**:
  - Network errors show friendly message with retry
  - Invalid files rejected with clear error
  - Timeout handled gracefully (30s default, 60s for uploads)
  - Retry logic works (1 automatic retry on network errors)

### API Integration Tests
- [ ] **Deterministic Predictions**: Same images produce identical results across multiple uploads
- [ ] **Type Safety**: API responses match TypeScript interfaces
- [ ] **Timeout & Retry**: Client retries once on network errors, respects timeout

### Model & Quality Tests (Backend)
- [ ] **Model Loading**: PyTorch model loads successfully on server startup
- [ ] **Model Info Endpoint**: `GET /api/v1/model_info` returns model metadata
- [ ] **Image Quality Checks**:
  - Blurry images rejected with focus guidance
  - Dark images rejected with lighting guidance
  - Bright images rejected with exposure guidance
- [ ] **Temperature Calibration**: Confidence thresholds use calibrated values
- [ ] **Multi-Image Aggregation**: Probabilities averaged across 1-3 images

### Automated Testing
Run automated tests to verify all functionality:

```bash
# Backend unit tests
cd apps/server
python -m pytest tests/ -v
# Expected: 18/18 tests passing

# API integration test
python scripts/test_predict.py
# Expected: Health check, model info, prediction all pass

# With specific images
python scripts/test_predict.py path/to/image1.jpg path/to/image2.jpg
```

### UI/UX Tests
- [ ] **Loading States**: Spinners show during API calls
- [ ] **Global Error UI**: User-friendly error messages with retry/dismiss options
- [ ] **Navigation**: Can navigate back from any screen
- [ ] **Responsive**: Works on different screen sizes

---

## 🔄 User Feedback & Continuous Learning

AloeVeraMate includes a feedback system that helps improve the model over time by collecting user corrections and feedback.

### How It Works

1. **Automatic Logging**: Every prediction is automatically logged to a local SQLite database
2. **User Feedback**: Users can mark predictions as helpful/not helpful and provide corrections
3. **Analytics Dashboard**: View feedback statistics to identify model weaknesses
4. **Retraining Data**: Export feedback data as labeled examples for model retraining

### API Endpoints

```bash
# Submit feedback after a prediction
POST /api/v1/feedback
{
  "request_id": "abc-123",              # From prediction response
  "selected_disease_id": "aloe_rot",    # User's correction
  "was_prediction_helpful": false,      # True if correct, false otherwise
  "notes": "It was actually root rot"   # Optional explanation
}

# Get feedback statistics
GET /api/v1/feedback/stats
# Returns:
# - Total predictions and feedback count
# - Feedback rate (% of predictions with feedback)
# - Helpful rate (% marked as correct)
# - Confidence distribution (HIGH/MEDIUM/LOW)
# - Common misclassifications
```

### Database Schema

**predictions** table:
- `request_id` (unique): Links feedback to predictions
- `timestamp`: When prediction was made
- `predicted_disease_id`, `predicted_disease_name`: Top prediction
- `predicted_probability`: Confidence score
- `top3_predictions`: JSON of top 3 predictions
- `confidence_status`: HIGH (≥80%), MEDIUM (60-79%), LOW (<60%)
- `quality_issues`: JSON of image quality problems
- `recommended_next_step`, `retake_message`: User guidance

**feedback** table:
- `request_id` (foreign key): Links to prediction
- `selected_disease_id`: User's correction (or "unknown")
- `was_prediction_helpful`: Boolean rating
- `notes`: Optional user comments
- `submitted_at`: Feedback timestamp

### Using Feedback for Retraining

Export all feedback data for model retraining:

```python
from app.services.feedback import get_feedback_db

# Export to JSON
db = get_feedback_db()
db.export_training_data('feedback_export.json')
```

The export includes:
- Original predictions and confidence scores
- User corrections (labeled ground truth)
- Image quality issues
- Timestamp for temporal analysis

**Retraining Workflow:**
1. Export feedback data periodically (weekly/monthly)
2. Filter for corrections (predictions != user_correction)
3. Re-label those images with user_correction as ground truth
4. Retrain model with updated labels
5. Validate improvement on correction patterns
6. Deploy updated model

### Monitoring Model Performance

```bash
# Test feedback system
cd apps/server
python test_feedback.py

# View feedback statistics
curl http://localhost:8000/api/v1/feedback/stats
```

Example statistics output:
```json
{
  "total_predictions": 150,
  "total_feedback": 45,
  "feedback_rate": "30.0%",
  "helpful_rate": "82.2%",
  "confidence_distribution": {
    "HIGH": 120,
    "MEDIUM": 20,
    "LOW": 10
  },
  "common_corrections": [
    {
      "predicted_disease_id": "aloe_rust",
      "selected_disease_id": "aloe_rot",
      "count": 5
    }
  ]
}
```

### Privacy & Data Handling

- **Anonymous**: No user identification stored
- **Local Storage**: SQLite database at `apps/server/data/feedback.db`
- **No Image Storage**: Only metadata stored, not images
- **Purpose**: Model improvement only
- **User Control**: Optional feedback submission

---

**Built with ❤️ for plant health**