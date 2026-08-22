@echo off
echo ========================================
echo Starting Face Recognition Service (DeepFace)
echo ========================================

:: Check Python availability
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH. Install Python 3.9+ first.
    pause
    exit /b 1
)

:: Use virtual environment if it exists
if exist venv\Scripts\python.exe (
    set PY=venv\Scripts\python.exe
    echo Using virtual environment: venv
) else (
    set PY=python
)

:: Verify dependencies
%PY% -c "import deepface, flask, cryptography, dotenv" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Missing dependencies. Run:  pip install -r requirements.txt
    pause
    exit /b 1
)

:: Ensure encryption key exists
if not exist .env (
    echo [WARN] No .env found. Generating EMBEDDING_ENCRYPTION_KEY...
    %PY% generate_key.py
)

:: Start the Python service (DeepFace engine)
echo Starting Python Face Service on port 5001...
%PY% app_deepface.py

pause