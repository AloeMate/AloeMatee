@echo off
REM Train Stage B: Disease Classifier (5 diseases only)

echo ==========================================
echo Training Stage B: Disease Classifier
echo ==========================================

cd /d "%~dp0\.."

REM Step 1: Train
echo.
echo Step 1/4: Training model...
python train_stage_b.py --epochs 20 --batch_size 32 --lr 0.001
if errorlevel 1 (
    echo ERROR: Training failed
    exit /b 1
)

REM Step 2: Evaluate
echo.
echo Step 2/4: Evaluating model...
python eval_stage_b.py
if errorlevel 1 (
    echo ERROR: Evaluation failed
    exit /b 1
)

REM Step 3: Calibrate
echo.
echo Step 3/4: Calibrating probabilities...
python calibrate_stage_b.py
if errorlevel 1 (
    echo ERROR: Calibration failed
    exit /b 1
)

REM Step 4: Export
echo.
echo Step 4/4: Exporting artifacts...
python export_stage_b.py
if errorlevel 1 (
    echo ERROR: Export failed
    exit /b 1
)

echo.
echo ==========================================
echo ✅ Stage B Training Complete!
echo ==========================================
echo Artifacts saved to: artifacts\stage_b\
echo   - model.pt
echo   - model_metadata.json
echo   - training_history.json
echo   - calibration.json
echo   - confusion_matrix.png
echo   - eval_summary.txt
echo.
