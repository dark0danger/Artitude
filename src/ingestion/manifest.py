import hashlib
import json
import os

DEFAULT_MANIFEST_FILE = os.path.join(os.getcwd(), "data", "manifest.json")

def calculate_md5(file_path: str) -> str:
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def load_manifest(manifest_path: str = None) -> dict:
    path = manifest_path or DEFAULT_MANIFEST_FILE
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {}

def save_manifest(manifest: dict, manifest_path: str = None):
    path = manifest_path or DEFAULT_MANIFEST_FILE
    with open(path, 'w') as f:
        json.dump(manifest, f, indent=2)

def is_file_modified(file_path: str, manifest: dict) -> bool:
    if not os.path.exists(file_path):
        return False
    
    current_md5 = calculate_md5(file_path)
    if file_path in manifest:
        return manifest[file_path] != current_md5
    return True

def update_manifest(file_path: str, manifest: dict):
    current_md5 = calculate_md5(file_path)
    manifest[file_path] = current_md5
