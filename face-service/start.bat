@echo off
echo ========================================
echo Starting Face Recognition Service
echo ========================================

:: Kill any existing Python processes (face-service related)
taskkill /F /IM python.exe 2>nul

:: Wait a moment
timeout /t 2 /nobreak >nul

:: Start the Python service
echo Starting Python Face Service on port 5001...
python app_deepface.py

pause
