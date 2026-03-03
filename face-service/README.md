# Face Recognition Service

Python Flask microservice for handling face registration and recognition for the EduSmart attendance system.

## Features

- **Face Registration**: Register student faces with multiple images for better accuracy
- **Face Recognition**: Recognize registered faces from live webcam captures
- **Threshold-based Matching**: Uses configurable threshold (0.5) for security
- **Average Encoding**: Combines multiple images for robust recognition

## Setup

1. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run Service**:
   ```bash
   python app.py
   ```

Service will run on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "healthy", "registered_faces": 5 }
```

### Register Face
```
POST /register-face
Body: {
  "studentId": "507f1f77bcf86cd799439011",
  "images": ["base64_image1", "base64_image2", ...]
}
Response: { "message": "Face registered successfully", "studentId": "..." }
```

### Recognize Face
```
POST /recognize-face
Body: {
  "image": "base64_image"
}
Response: {
  "recognized": true,
  "studentId": "507f1f77bcf86cd799439011",
  "confidence": 95.5,
  "distance": 0.045
}
```

### Delete Face
```
DELETE /delete-face/:studentId
Response: { "message": "Face data deleted for student ..." }
```

## Configuration

Edit `.env` file:
```
FLASK_PORT=5001
EMBEDDINGS_FILE=embeddings.pkl
FLASK_ENV=development
```

## Notes

- Requires at least 5 images for registration (3 valid faces minimum)
- Face distance threshold: 0.5 (lower = stricter)
- Embeddings stored in `embeddings.pkl` file
- Automatically creates file if not exists
