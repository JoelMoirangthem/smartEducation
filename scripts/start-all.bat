@echo off
REM SmartEducation - start all services (Windows)
REM Usage: scripts\start-all.bat

echo ============================================
echo  SmartEducation - Starting all services
echo ============================================

REM --- Face service ---
echo.
echo [1/3] Starting Python Face Service on :5001 ...
cd face-service
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    venv\Scripts\pip install -r requirements.txt
)
if not exist .env (
    venv\Scripts\python generate_key.py
)
start "Face Service" cmd /c "venv\Scripts\python app_deepface.py"
cd ..

REM --- Backend ---
echo.
echo [2/3] Starting Backend on :5000 ...
cd backend
if not exist node_modules (
    npm install
)
start "Backend" cmd /c "npm start"
cd ..

REM --- Frontend ---
echo.
echo [3/3] Starting Frontend on :5173 ...
cd frontend
if not exist node_modules (
    npm install
)
start "Frontend" cmd /c "npm run dev"
cd ..

echo.
echo ============================================
echo  All services launched:
echo   Frontend  http://localhost:5173
echo   Backend   http://localhost:5000/api/v1/health
echo   Face      http://localhost:5001/health
echo  MongoDB must be running locally first.
echo ============================================
pause