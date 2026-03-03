# AI Face-Based Attendance System - Setup & Testing Guide

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd face-service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## 🎯 Running the Application

You need to run **3 services simultaneously**:

### Terminal 1: Python Face Service
```bash
cd face-service
venv\Scripts\activate  # Windows
python app.py
```
✅ Service runs on `http://localhost:5001`

### Terminal 2: Node.js Backend
```bash
cd backend
npm start
```
✅ Service runs on `http://localhost:5000`

### Terminal 3: React Frontend
```bash
cd frontend
npm run dev
```
✅ Service runs on `http://localhost:5173`

## 📝 Testing Workflow

### Phase 1: Student Face Registration

1. **Login as Student**
   - Navigate to `http://localhost:5173`
   - Login with student credentials

2. **Register Face**
   - Navigate to `/face-register` page
   - Click "Start Camera"
   - Capture 10-15 photos from different angles
   - Click "Submit Registration"
   - Wait for success message

3. **Verify in Database**
   ```bash
   cd backend
   node list-models.js
   ```
   - Should see `FaceData` document for student

### Phase 2: Teacher Face Attendance

1. **Login as Teacher**
   - Navigate to `http://localhost:5173`
   - Login with teacher credentials

2. **Start Attendance Session**
   - Navigate to `/face-attendance` page
   - Click "▶️ Start Session"
   - Camera should activate

3. **Scan Students**
   - Position student in front of camera
   - Click "📸 Scan Face"
   - Wait for recognition
   - Student should appear in attendance list (real-time via Socket.io)

4. **Export Attendance**
   - Click "📥 Export CSV"
   - Download should start automatically

## 🧪 Testing Anti-Proxy Measures

1. Mark attendance for a student
2. Try scanning the same student again
3. Expected result: "Already marked present" error

## 🔍 Troubleshooting

### Python Service Not Starting
- Ensure Python 3.8+ is installed
- Check if virtual environment is activated
- Verify all dependencies installed: `pip list`

### Webcam Not Working
- Check browser permissions (Chrome: Settings → Privacy → Camera)
- Ensure no other application is using the webcam
- Try different browser (Chrome recommended)

### Face Not Recognized
- Check Python service logs for errors
- Ensure proper lighting
- Verify face was registered correctly
- Check confidence threshold (default 0.5)

### Socket.io Not Updating
- Check browser console for socket connection errors
- Verify backend Socket.io is running
- Check if user joined correct room (class ID)

## 📊 Health Checks

### Backend Health
```bash
curl http://localhost:5000/api/v1/health
```

### Python Service Health
```bash
curl http://localhost:5001/health
```

### Face Service Integration
```bash
curl http://localhost:5000/api/v1/face-attendance/health
```

## 🎨 Navigation Links

Add these to your sidebar/dashboard:

**For Students:**
- "Register Face" → `/face-register`

**For Teachers:**
- "Face Attendance" → `/face-attendance`

## ✨ Features Implemented

✅ AI face recognition using face_recognition library
✅ Multi-image registration (10-15 photos)
✅ Real-time attendance updates via Socket.io
✅ Anti-proxy measures (one attendance per session)
✅ Confidence scoring for recognition
✅ CSV export for attendance reports
✅ Role-based access control
✅ Glassmorphism UI design
✅ Webcam capture with native browser API
✅ Loading states and error handling

## 🔐 Security Features

1. **Threshold-based Matching**: Face distance < 0.5 required
2. **One Attendance Per Session**: Prevents duplicate marking
3. **JWT Authentication**: All API endpoints protected
4. **Role-based Routes**: Students can't access teacher pages and vice versa
5. **Average Encoding**: Multiple images combined for robust recognition
