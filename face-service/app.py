from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import json
import os
import threading
from dotenv import load_dotenv
import base64
from PIL import Image
import io

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
EMBEDDINGS_FILE = os.getenv('EMBEDDINGS_FILE', 'embeddings.pkl')
PORT = int(os.getenv('FLASK_PORT', 5001))
THRESHOLD = float(os.getenv('FACE_THRESHOLD', '0.5'))  # Lower = stricter matching
MIN_CONFIDENCE = float(os.getenv('MIN_CONFIDENCE', '35'))
MIN_IMAGES = int(os.getenv('MIN_REGISTER_IMAGES', '5'))
MAX_IMAGES = int(os.getenv('MAX_REGISTER_IMAGES', '15'))
DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes')

# Thread safety for persistence
embeddings_lock = threading.Lock()

# In-memory storage (will be loaded from pickle file)
face_embeddings = {}

STUDENT_ID_CHARS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')


# Load existing embeddings if file exists
def load_embeddings():
    global face_embeddings
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            # Try JSON first (safe)
            with open(EMBEDDINGS_FILE, 'r') as f:
                face_embeddings = json.load(f)
            print(f"✅ Loaded {len(face_embeddings)} face embeddings from {EMBEDDINGS_FILE} (JSON)")
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Backward compat: try pickle for old files
            try:
                import pickle
                with open(EMBEDDINGS_FILE, 'rb') as f:
                    face_embeddings = pickle.load(f)
                print(f"✅ Loaded {len(face_embeddings)} face embeddings (legacy pickle)")
                save_embeddings()  # Re-save as JSON
            except Exception as e:
                print(f"⚠️ Error loading embeddings: {e}")
                face_embeddings = {}
        except Exception as e:
            print(f"⚠️ Error loading embeddings: {e}")
            face_embeddings = {}
    else:
        print(f"📝 No existing embeddings file found. Starting fresh.")
        face_embeddings = {}


# Save embeddings to pickle file
def save_embeddings():
    try:
        with embeddings_lock:
            with open(EMBEDDINGS_FILE, 'w') as f:
                json.dump(face_embeddings, f)
        print(f"💾 Saved {len(face_embeddings)} face embeddings to {EMBEDDINGS_FILE}")
        return True
    except Exception as e:
        print(f"❌ Error saving embeddings: {e}")
        return False


# Decode base64 image
def decode_image(base64_string):
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Face Recognition Service (face_recognition)',
        'registered_faces': len(face_embeddings),
        'threshold': THRESHOLD,
        'min_confidence': MIN_CONFIDENCE
    }), 200


@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.get_json(silent=True) or {}

        student_id = str(data.get('studentId', '')).strip()
        images = data.get('images', [])

        if not student_id:
            return jsonify({'error': 'studentId is required'}), 400
        if not all(c in STUDENT_ID_CHARS for c in student_id):
            return jsonify({'error': 'studentId contains invalid characters'}), 400
        if not isinstance(images, list) or len(images) < MIN_IMAGES:
            return jsonify({'error': f'At least {MIN_IMAGES} images are required for registration'}), 400
        if len(images) > MAX_IMAGES:
            images = images[:MAX_IMAGES]

        print(f"📸 Processing registration for student: {student_id} with {len(images)} images")

        # Extract face encodings from all images
        all_encodings = []
        successful_images = 0

        for idx, img_base64 in enumerate(images):
            if not isinstance(img_base64, str) or not img_base64:
                continue

            image = decode_image(img_base64)

            if image is None:
                print(f"⚠️ Failed to decode image {idx + 1}")
                continue

            # Find face locations and encodings
            try:
                face_locations = face_recognition.face_locations(image)
                face_encodings = face_recognition.face_encodings(image, face_locations)
            except Exception as e:
                print(f"⚠️ Error processing image {idx + 1}: {e}")
                continue

            if len(face_encodings) == 0:
                print(f"⚠️ No face detected in image {idx + 1}")
                continue

            if len(face_encodings) > 1:
                print(f"⚠️ Multiple faces detected in image {idx + 1}, using first face")

            # Use the first face encoding
            all_encodings.append(face_encodings[0])
            successful_images += 1

        if successful_images < MIN_IMAGES:
            return jsonify({
                'error': f'Only {successful_images} valid faces detected out of {len(images)}. Need at least {MIN_IMAGES} valid images.',
                'successful_images': successful_images
            }), 400

        # Calculate average embedding (more robust than using single image)
        average_encoding = np.mean(all_encodings, axis=0)

        # Store in memory and save to file
        with embeddings_lock:
            face_embeddings[student_id] = average_encoding.tolist()

        if save_embeddings():
            print(f"✅ Successfully registered face for student: {student_id}")
            return jsonify({
                'message': 'Face registered successfully',
                'studentId': student_id,
                'images_processed': successful_images,
                'total_registered_faces': len(face_embeddings)
            }), 200
        else:
            return jsonify({'error': 'Failed to save face data'}), 500

    except Exception as e:
        print(f"❌ Error in register_face: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json(silent=True) or {}

        image_base64 = data.get('image')

        if not image_base64:
            return jsonify({'error': 'image is required'}), 400

        # Check if we have any registered faces
        if not face_embeddings:
            return jsonify({
                'recognized': False,
                'message': 'No registered faces in database',
                'reason': 'no_registered_faces'
            }), 200

        print(f"🔍 Processing face recognition request...")

        # Decode image
        image = decode_image(image_base64)

        if image is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        # Find face locations and encodings
        try:
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
        except Exception as e:
            print(f"❌ Face detection error: {e}")
            return jsonify({'error': str(e)}), 500

        if len(face_encodings) == 0:
            return jsonify({
                'recognized': False,
                'message': 'No face detected in image',
                'reason': 'no_face'
            }), 200

        if len(face_encodings) > 1:
            print(f"⚠️ Multiple faces detected ({len(face_encodings)}), using first face")

        # Use the first detected face
        unknown_encoding = face_encodings[0]

        # Compare with all registered faces
        best_match_id = None
        best_match_distance = float('inf')

        for student_id, known_encoding in face_embeddings.items():
            # Calculate face distance
            distance = face_recognition.face_distance([np.array(known_encoding)], unknown_encoding)[0]

            print(f"  Student {student_id}: distance = {distance:.3f}")

            if distance < best_match_distance:
                best_match_distance = distance
                best_match_id = student_id

        # Check if best match is within threshold
        if best_match_id is not None and best_match_distance < THRESHOLD:
            confidence = (1 - best_match_distance) * 100  # Convert to percentage

            if confidence < MIN_CONFIDENCE:
                return jsonify({
                    'recognized': False,
                    'message': 'Face detected but confidence too low',
                    'best_match': best_match_id,
                    'confidence': round(confidence, 2),
                    'reason': 'low_confidence'
                }), 200

            print(f"✅ Match found: {best_match_id} (confidence: {confidence:.1f}%)")
            return jsonify({
                'recognized': True,
                'studentId': best_match_id,
                'confidence': round(confidence, 2),
                'distance': round(float(best_match_distance), 3)
            }), 200
        else:
            print(f"❌ No match found. Best distance: {best_match_distance:.3f} (threshold: {THRESHOLD})")
            return jsonify({
                'recognized': False,
                'message': 'Face not recognized',
                'best_distance': round(float(best_match_distance), 3),
                'threshold': THRESHOLD,
                'reason': 'no_match'
            }), 200

    except Exception as e:
        print(f"❌ Error in recognize_face: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/delete-face/<student_id>', methods=['DELETE'])
def delete_face(student_id):
    try:
        with embeddings_lock:
            if student_id in face_embeddings:
                old_value = face_embeddings.pop(student_id)
                saved = save_embeddings()
                if not saved:
                    face_embeddings[student_id] = old_value
                    return jsonify({'error': 'Failed to save face data'}), 500
                return jsonify({
                    'message': f'Face data deleted for student {student_id}',
                    'total_registered_faces': len(face_embeddings)
                }), 200
        return jsonify({'error': 'Student not found'}), 404
    except Exception as e:
        print(f"❌ Error in delete_face: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting Face Recognition Service (face_recognition)...")
    load_embeddings()
    print(f"🌐 Running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG, threaded=True)