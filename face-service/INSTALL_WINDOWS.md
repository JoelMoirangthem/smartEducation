# Installation Guide for Windows

## Issue: dlib build failed

The `face-recognition` library requires `dlib`, which needs C++ build tools on Windows.

## Solutions:

### Option 1: Install Pre-built dlib (EASIEST)

```bash
pip install dlib-binary
pip install face-recognition opencv-python flask flask-cors numpy pillow python-dotenv
```

### Option 2: Install Visual Studio Build Tools (if dlib-binary doesn't work)

1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Install "Desktop development with C++"
3. Then run:
```bash
pip install dlib
pip install face-recognition opencv-python flask flask-cors numpy pillow python-dotenv
```

### Option 3: Use Alternative - DeepFace (Simpler alternative)

If dlib continues to fail, we can switch to DeepFace which is easier to install:

```bash
pip install deepface flask flask-cors opencv-python numpy pillow python-dotenv
```

Then I'll update the Python service code to use DeepFace instead.

## Recommended: Try Option 1 First

Run this command:
```bash
cd d:\Attendance\face-service
pip install dlib-binary
pip install face-recognition opencv-python flask flask-cors numpy pillow python-dotenv
python app.py
```
