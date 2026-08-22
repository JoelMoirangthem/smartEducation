from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
import os
from dotenv import load_dotenv
import base64
import json
import threading
from PIL import Image
import io
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
EMBEDDINGS_FILE = os.getenv('EMBEDDINGS_FILE', 'embeddings.pkl')
PORT = int(os.getenv('FLASK_PORT', 5001))
THRESHOLD = float(os.getenv('FACE_THRESHOLD', '0.68'))
MIN_CONFIDENCE = float(os.getenv('MIN_CONFIDENCE', '35'))
MAX_IMAGES = int(os.getenv('MAX_REGISTER_IMAGES', '15'))
MIN_IMAGES = int(os.getenv('MIN_REGISTER_IMAGES', '5'))
DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes')

# Encryption setup
ENCRYPTION_KEY = os.getenv('EMBEDDING_ENCRYPTION_KEY')
if ENCRYPTION_KEY:
    cipher_suite = Fernet(ENCRYPTION_KEY.encode())
    print("🔐 Embedding encryption ENABLED")
else:
    cipher_suite = None
    print("⚠️  WARNING: No encryption key found (EMBEDDING_ENCRYPTION_KEY unset). Embeddings stored in plaintext.")

# Thread safety for persistence
embeddings_lock = threading.Lock()

# In-memory storage (now stores encrypted embeddings)
face_embeddings = {}

STUDENT_ID_CHARS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')


def encrypt_embedding(embedding):
    """Encrypt embedding using Fernet (AES-128-CBC + HMAC-SHA256)."""
    if cipher_suite is None:
        return json.dumps(embedding)

    try:
        embedding_bytes = json.dumps(embedding).encode('utf-8')
        encrypted = cipher_suite.encrypt(embedding_bytes)
        return encrypted.hex()
    except Exception as e:
        print(f"❌ Encryption error: {e}")
        return json.dumps(embedding)


def decrypt_embedding(encrypted_hex):
    """Decrypt embedding with backward compatibility for old pickle/plaintext data."""
    try:
        encrypted_bytes = bytes.fromhex(encrypted_hex)

        if cipher_suite is None:
            return json.loads(encrypted_bytes.decode('utf-8'))

        try:
            decrypted = cipher_suite.decrypt(encrypted_bytes)
            return json.loads(decrypted.decode('utf-8'))
        except Exception:
            # Backward compatibility: try pickle for legacy data
            try:
                import pickle
                return pickle.loads(encrypted_bytes)
            except Exception:
                # Try plain JSON
                return json.loads(encrypted_bytes.decode('utf-8'))
    except Exception as e:
        print(f"❌ Decryption error: {e}")
        return None


def load_embeddings():
    global face_embeddings
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            # Try JSON first (safe)
            with open(EMBEDDINGS_FILE, 'r') as f:
                face_embeddings = json.load(f)
            print(f"✅ Loaded {len(face_embeddings)} face embeddings (JSON)")
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Backward compat: try pickle for old plaintext files
            try:
                import pickle
                with open(EMBEDDINGS_FILE, 'rb') as f:
                    face_embeddings = pickle.load(f)
                print(f"✅ Loaded {len(face_embeddings)} face embeddings (legacy pickle)")
                # Re-save as JSON for safety
                save_embeddings()
            except Exception as e:
                print(f"⚠️ Error loading embeddings: {e}")
                face_embeddings = {}
        except Exception as e:
            print(f"⚠️ Error loading embeddings: {e}")
            face_embeddings = {}
    else:
        print("📝 No existing embeddings file found")
        face_embeddings = {}


def save_embeddings():
    try:
        with embeddings_lock:
            with open(EMBEDDINGS_FILE, 'w') as f:
                json.dump(face_embeddings, f)
        print(f"💾 Saved {len(face_embeddings)} embeddings")
        return True
    except Exception as e:
        print(f"❌ Error saving: {e}")
        return False


def decode_image(base64_string):
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


def extract_embedding(image, temp_prefix):
    """Extract a Facenet embedding from an image via a temp file. Returns (embedding, error)."""
    temp_path = None
    try:
        temp_path = f'temp_{temp_prefix}.jpg'
        cv2.imwrite(temp_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))

        result = DeepFace.represent(
            img_path=temp_path,
            model_name='Facenet',
            enforce_detection=False,
            align=True
        )
        if result and len(result) > 0:
            return result[0]['embedding'], None
        return None, 'No face detected in image'
    except Exception as e:
        return None, str(e)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Face Recognition Service (DeepFace)',
        'registered_faces': len(face_embeddings),
        'encryption_enabled': cipher_suite is not None,
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
            return jsonify({'error': f'Need at least {MIN_IMAGES} images'}), 400
        if len(images) > MAX_IMAGES:
            images = images[:MAX_IMAGES]

        print(f"📸 Registering {student_id} with {len(images)} images (threshold={THRESHOLD})")

        all_embeddings = []
        skipped = 0

        for idx, img_base64 in enumerate(images):
            if not isinstance(img_base64, str) or not img_base64:
                skipped += 1
                continue

            image = decode_image(img_base64)
            if image is None:
                skipped += 1
                continue

            try:
                embedding, err = extract_embedding(image, f'{student_id}_{idx}')
                if embedding is not None:
                    all_embeddings.append(embedding)
                else:
                    skipped += 1
                    print(f"  ⚠️ Image {idx}: {err}")
            except Exception as e:
                skipped += 1
                print(f"  ⚠️ Image {idx} error: {e}")

        if len(all_embeddings) < MIN_IMAGES:
            return jsonify({
                'error': f'Only {len(all_embeddings)} valid faces detected out of {len(images)}. Need at least {MIN_IMAGES} clear, detectable faces.'
            }), 400

        # Average the embeddings (robust centroid representation)
        avg_embedding = np.mean(all_embeddings, axis=0).tolist()

        # 🔐 ENCRYPT before storing
        encrypted_embedding = encrypt_embedding(avg_embedding)

        with embeddings_lock:
            face_embeddings[student_id] = encrypted_embedding

        if save_embeddings():
            return jsonify({
                'message': 'Face registered successfully',
                'studentId': student_id,
                'images_processed': len(all_embeddings),
                'images_skipped': skipped,
                'total_registered_faces': len(face_embeddings),
                'encrypted': cipher_suite is not None
            }), 200
        else:
            return jsonify({'error': 'Failed to save embeddings to disk'}), 500

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json(silent=True) or {}
        image_base64 = data.get('image')

        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400

        if not face_embeddings:
            return jsonify({'recognized': False, 'message': 'No registered faces', 'reason': 'no_registered_faces'}), 200

        image = decode_image(image_base64)
        if image is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        print("🔍 Recognizing face...")

        try:
            unknown_embedding, err = extract_embedding(image, 'recognize')
            if unknown_embedding is None:
                print(f"⚠️ {err}")
                return jsonify({'recognized': False, 'message': 'No face detected', 'reason': 'no_face'}), 200

            unknown_embedding = np.array(unknown_embedding)

            # Compare with all stored (decrypt each)
            best_match_id = None
            best_distance = float('inf')

            print(f"📊 Comparing against {len(face_embeddings)} registered faces (threshold={THRESHOLD})")

            for student_id, encrypted_embedding in list(face_embeddings.items()):
                known_embedding = decrypt_embedding(encrypted_embedding)

                if known_embedding is None:
                    print(f"⚠️ Failed to decrypt embedding for {student_id}")
                    continue

                distance = np.linalg.norm(unknown_embedding - np.array(known_embedding))
                print(f"  👤 {student_id}: distance = {distance:.4f}")

                if distance < best_distance:
                    best_distance = distance
                    best_match_id = student_id

            # Check if best match meets criteria
            if best_match_id is not None and best_distance < THRESHOLD:
                confidence = max(0, (1 - best_distance / THRESHOLD) * 100)

                if confidence < MIN_CONFIDENCE:
                    print(f"⚠️ Match but low confidence: {best_match_id} ({confidence:.1f}%)")
                    return jsonify({
                        'recognized': False,
                        'message': 'Face detected but confidence too low',
                        'best_match': best_match_id,
                        'confidence': round(confidence, 2),
                        'reason': 'low_confidence'
                    }), 200

                print(f"✅ Match found: {best_match_id} (confidence: {confidence:.1f}%, distance: {best_distance:.4f})")
                return jsonify({
                    'recognized': True,
                    'studentId': best_match_id,
                    'confidence': round(confidence, 2),
                    'distance': round(float(best_distance), 4)
                }), 200
            else:
                print(f"❌ No match found. Best distance: {best_distance:.4f}")
                return jsonify({
                    'recognized': False,
                    'message': 'Face not recognized',
                    'best_distance': round(float(best_distance), 4),
                    'threshold': THRESHOLD,
                    'reason': 'no_match'
                }), 200

        except Exception as e:
            print(f"❌ Recognition error: {str(e)}")
            return jsonify({'error': str(e)}), 500

    except Exception as e:
        print(f"❌ Error: {str(e)}")
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
                    return jsonify({'error': 'Failed to save'}), 500
                return jsonify({'message': f'Deleted {student_id}'}), 200
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting Face Recognition Service (DeepFace)...")
    print(f"🌐 Threshold: {THRESHOLD}, Min confidence: {MIN_CONFIDENCE}%")
    # Force DeepFace model download eagerly at startup so the first request is fast
    print("⏳ Pre-loading model weights...")
    try:
        DeepFace.build_model('Facenet')
        print("✅ Model ready")
    except Exception as e:
        print(f"⚠️ Model preload failed (will load on demand): {e}")
    load_embeddings()
    print(f"🌐 Running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG, threaded=True)