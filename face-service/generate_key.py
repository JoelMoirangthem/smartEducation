"""
Generate encryption key for face embeddings
Run this ONCE: it writes EMBEDDING_ENCRYPTION_KEY into .env
"""

import os
from cryptography.fernet import Fernet

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')

key = Fernet.generate_key().decode()

lines = []
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        lines = f.read().splitlines()

replaced = False
for i, line in enumerate(lines):
    if line.startswith('EMBEDDING_ENCRYPTION_KEY='):
        lines[i] = f'EMBEDDING_ENCRYPTION_KEY={key}'
        replaced = True
        break

if not replaced:
    lines.append(f'EMBEDDING_ENCRYPTION_KEY={key}')

with open(env_path, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print("=" * 60)
print("FACE EMBEDDING ENCRYPTION KEY")
print("=" * 60)
print()
print(f"✅ Key written to {env_path}")
print(f"EMBEDDING_ENCRYPTION_KEY={key}")
print()
print("⚠️  IMPORTANT: Keep this key SECRET and SECURE!")
print("⚠️  If you lose this key, you cannot decrypt existing embeddings!")
print("⚠️  Existing plaintext embeddings remain readable (backward compatible).")
print("=" * 60)