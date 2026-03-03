"""
Generate encryption key for face embeddings
Run this ONCE and save the key to .env file
"""

from cryptography.fernet import Fernet

# Generate a new encryption key
key = Fernet.generate_key()

print("=" * 60)
print("FACE EMBEDDING ENCRYPTION KEY")
print("=" * 60)
print()
print("Add this line to your .env file:")
print()
print(f"EMBEDDING_ENCRYPTION_KEY={key.decode()}")
print()
print("=" * 60)
print("⚠️  IMPORTANT: Keep this key SECRET and SECURE!")
print("⚠️  If you lose this key, you cannot decrypt existing embeddings!")
print("=" * 60)
