from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import cv2
import numpy as np
import os
from dotenv import load_dotenv
import base64
import pickle
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

# Encryption setup
ENCRYPTION_KEY = os.getenv('EMBEDDING_ENCRYPTION_KEY')
if ENCRYPTION_KEY:
    cipher_suite = Fernet(ENCRYPTION_KEY.encode())
    print("🔐 Embedding encryption ENABLED")
else:
    cipher_suite = None
    print("⚠️  WARNING: No encryption key found. Run generate_key.py for production!")

# In-memory storage (now stores encrypted embeddings)
face_embeddings = {}

def encrypt_embedding(embedding):
    """Encrypt embedding using AES-256"""
    if cipher_suite is None:
        # No encryption - return plain pickle hex (backward compatible)
        return pickle.dumps(embedding).hex()
    
    try:
        embedding_bytes = pickle.dumps(embedding)
        encrypted = cipher_suite.encrypt(embedding_bytes)
        return encrypted.hex()
    except Exception as e:
        print(f"❌ Encryption error: {e}")
        return pickle.dumps(embedding).hex()


def decrypt_embedding(encrypted_hex):
    """Decrypt embedding"""
    try:
        encrypted_bytes = bytes.fromhex(encrypted_hex)
        
        if cipher_suite is None:
            # Plain format
            return pickle.loads(encrypted_bytes)
        
        try:
            # Attempt decryption
            decrypted = cipher_suite.decrypt(encrypted_bytes)
            return pickle.loads(decrypted)
        except:
            # Backward compatibility: might be plain format
            return pickle.loads(encrypted_bytes)
    except Exception as e:
        print(f"❌ Decryption error: {e}")
        return None

def load_embeddings():
    global face_embeddings
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            with open(EMBEDDINGS_FILE, 'rb') as f:
                face_embeddings = pickle.load(f)
            print(f"✅ Loaded {len(face_embeddings)} face embeddings")
        except Exception as e:
            print(f"⚠️ Error loading embeddings: {e}")
            face_embeddings = {}
    else:
        print(f"📝 No existing embeddings file found")
        face_embeddings = {}

def save_embeddings():
    try:
        with open(EMBEDDINGS_FILE, 'wb') as f:
            pickle.dump(face_embeddings, f)
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Face Recognition Service (DeepFace)',
        'registered_faces': len(face_embeddings),
        'encryption_enabled': cipher_suite is not None
    }), 200

@app.route('/register-face', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        student_id = data.get('studentId')
        images = data.get('images', [])
        
        if not student_id or not images or len(images) < 5:
            return jsonify({'error': 'Need at least 5 images'}), 400
        
        print(f"📸 Registering {student_id} with {len(images)} images")
        
        all_embeddings = []
        successful = 0
        
        for idx, img_base64 in enumerate(images):
            image = decode_image(img_base64)
            if image is None:
                continue
            
            try:
                # Save temp image
                temp_path = f'temp_{student_id}_{idx}.jpg'
                cv2.imwrite(temp_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
                
                # Extract embedding using DeepFace
                embedding = DeepFace.represent(img_path=temp_path, model_name='Facenet', enforce_detection=True)
                
                if embedding and len(embedding) > 0:
                    all_embeddings.append(embedding[0]['embedding'])
                    successful += 1
                
                # Clean up
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
            except Exception as e:
                print(f"Error processing image {idx}: {e}")
                continue
        
        if successful < 5:
            return jsonify({'error': f'Only {successful} valid faces detected. Need at least 5 images with clear, detectable faces.'}), 400
        
        # Average the embeddings
        avg_embedding = np.mean(all_embeddings, axis=0).tolist()
        
        # 🔐 ENCRYPT before storing
        encrypted_embedding = encrypt_embedding(avg_embedding)
        face_embeddings[student_id] = encrypted_embedding
        
        if save_embeddings():
            return jsonify({
                'message': 'Face registered successfully',
                'studentId': student_id,
                'images_processed': successful,
                'total_registered_faces': len(face_embeddings),
                'encrypted': cipher_suite is not None
            }), 200
        else:
            return jsonify({'error': 'Failed to save'}), 500
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'No image provided'}), 400
        
        if not face_embeddings:
            return jsonify({'recognized': False, 'message': 'No registered faces'}), 200
        
        print(f"🔍 Recognizing face...")
        
        image = decode_image(image_base64)
        if image is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        # Save temp image
        temp_path = 'temp_recognize.jpg'
        cv2.imwrite(temp_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        
        try:
            # Extract embedding
            embedding_result = DeepFace.represent(img_path=temp_path, model_name='Facenet', enforce_detection=False)
            
            if not embedding_result or len(embedding_result) == 0:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return jsonify({'recognized': False, 'message': 'No face detected'}), 200
            
            unknown_embedding = np.array(embedding_result[0]['embedding'])
            
            # Compare with all stored (decrypt each)
            best_match_id = None
            best_distance = float('inf')
            
            # Recognition thresholds
            THRESHOLD = 1.5  # Very lenient for troubleshooting
            MIN_CONFIDENCE = 0.0
            
            print(f"📊 Comparing against {len(face_embeddings)} registered faces")
            
            for student_id, encrypted_embedding in face_embeddings.items():
                # 🔓 DECRYPT before comparing
                known_embedding = decrypt_embedding(encrypted_embedding)
                
                if known_embedding is None:
                    print(f"⚠️  Failed to decrypt embedding for {student_id}")
                    continue
                
                # Ensure it's a numpy array
                known_embedding = np.array(known_embedding)
                
                distance = np.linalg.norm(unknown_embedding - known_embedding)
                print(f"  👤 {student_id}: distance = {distance:.4f}")
                
                if distance < best_distance:
                    best_distance = distance
                    best_match_id = student_id
            
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            # Check if best match meets criteria
            if best_distance < THRESHOLD:
                confidence = max(0, (1 - best_distance / THRESHOLD) * 100)
                
                if confidence < MIN_CONFIDENCE:
                    return jsonify({
                        'recognized': False,
                        'message': 'Face detected but confidence too low',
                        'best_match': best_match_id,
                        'confidence': round(confidence, 2),
                        'reason': 'low_confidence'
                    }), 200
                
                print(f"✅ Match found: {best_match_id} (confidence: {confidence:.1f}%, distance: {best_distance:.4f})\")")
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
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/delete-face/<student_id>', methods=['DELETE'])
def delete_face(student_id):
    try:
        if student_id in face_embeddings:
            del face_embeddings[student_id]
            save_embeddings()
            return jsonify({'message': f'Deleted {student_id}'}), 200
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Face Recognition Service (DeepFace)...")
    load_embeddings()
    print(f"🌐 Running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
