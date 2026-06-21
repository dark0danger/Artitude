import os
import shutil
import traceback
import json
import uuid
import base64
import hmac
import hashlib
import time
from datetime import datetime
from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
import queue
import threading
from openai import OpenAI
from src.config import config, resolve_ai_client

from src.agents.graph import graph
from src.ingestion.build_index import build_index
from src.ingestion.manifest import load_manifest

app = FastAPI(title="Carja Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catch unhandled errors so uvicorn doesn't return bare HTML."""
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "review_id": None,
            "synthesis": "",
            "design_review": {},
            "evidence": [],
            "validation_passed": False,
            "errors": [f"Unhandled server error: {str(exc)}"]
        }
    )

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Authentication configuration & utilities
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-artitude-change-me-in-prod")

def encode_jwt(payload: dict, secret: str = JWT_SECRET_KEY, algorithm: str = "HS256") -> str:
    header = {"alg": algorithm, "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature_input = f"{header_b64}.{payload_b64}".encode()
    if algorithm == "HS256":
        signature = hmac.new(secret.encode(), signature_input, hashlib.sha256).digest()
    else:
        raise ValueError("Unsupported algorithm")
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str, secret: str = JWT_SECRET_KEY) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token structure")
        header_b64, payload_b64, signature_b64 = parts
        signature_input = f"{header_b64}.{payload_b64}".encode()
        def pad(s):
            return s + "=" * (4 - len(s) % 4)
        expected_sig = hmac.new(secret.encode(), signature_input, hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        if not hmac.compare_digest(signature_b64.encode(), expected_sig_b64.encode()):
            raise ValueError("Signature mismatch")
        payload = json.loads(base64.urlsafe_b64decode(pad(payload_b64)).decode())
        if "exp" in payload and payload["exp"] < time.time():
            raise ValueError("Token expired")
        return payload
    except Exception:
        raise ValueError("Invalid token")

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(stored_password: str, provided_password: str) -> bool:
    try:
        salt_hex, key_hex = stored_password.split(":")
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False

TEMP_DIR = "data/temp"
PROJECTS_DIR = "data/projects"
PROJECTS_DB = "data/projects.json"
USERS_DB = "data/users.json"

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(PROJECTS_DIR, exist_ok=True)

class ProjectCreate(BaseModel):
    name: str

class UserAuth(BaseModel):
    username: str
    password: str

class BrandKit(BaseModel):
    primary_colors: List[str]
    secondary_colors: List[str]
    typography: List[str]
    clearance_rules: str

class CompetitorKit(BaseModel):
    name: str
    primary_colors: List[str]
    secondary_colors: List[str]
    typography: List[str]

def get_projects_db():
    if not os.path.exists(PROJECTS_DB):
        return []
    with open(PROJECTS_DB, "r") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_projects_db(projects):
    with open(PROJECTS_DB, "w") as f:
        json.dump(projects, f, indent=2)

def get_users_db():
    if not os.path.exists(USERS_DB):
        return []
    with open(USERS_DB, "r") as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_users_db(users):
    with open(USERS_DB, "w") as f:
        json.dump(users, f, indent=2)

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        users = get_users_db()
        if not any(u["id"] == user_id for u in users):
            raise HTTPException(status_code=401, detail="User not found")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def verify_project_ownership(project_id: str, user_id: str):
    projects = get_projects_db()
    for p in projects:
        if p["id"] == project_id:
            if "user_id" not in p:
                p["user_id"] = user_id
                save_projects_db(projects)
            if p["user_id"] == user_id:
                return p
            else:
                raise HTTPException(status_code=403, detail="Not authorized to access this project")
    raise HTTPException(status_code=404, detail="Project not found")

def get_project_paths(project_id: str):
    base_dir = os.path.join(PROJECTS_DIR, project_id)
    guidelines_dir = os.path.join(base_dir, "guidelines")
    stats_file = os.path.join(base_dir, "stats.json")
    reviews_dir = os.path.join(base_dir, "reviews")
    os.makedirs(guidelines_dir, exist_ok=True)
    os.makedirs(reviews_dir, exist_ok=True)
    return base_dir, guidelines_dir, stats_file, reviews_dir

def get_stats(stats_file: str):
    if not os.path.exists(stats_file):
        return {
            "designs_reviewed": 0,
            "enhancements_suggested": 0,
            "total_health_score": 0
        }
    with open(stats_file, "r") as f:
        return json.load(f)

# Auth Endpoints
@app.post("/api/auth/register")
async def register_user(data: UserAuth):
    username_clean = data.username.strip()
    if len(username_clean) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    users = get_users_db()
    if any(u["username"].lower() == username_clean.lower() for u in users):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "username": username_clean,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now().isoformat()
    }
    users.append(new_user)
    save_users_db(users)
    
    token = encode_jwt({"sub": user_id, "exp": time.time() + 7 * 24 * 3600})
    return {"access_token": token, "token_type": "bearer", "username": username_clean}

@app.post("/api/auth/login")
async def login_user(data: UserAuth):
    username_clean = data.username.strip()
    users = get_users_db()
    for u in users:
        if u["username"].lower() == username_clean.lower():
            if verify_password(u["password_hash"], data.password):
                token = encode_jwt({"sub": u["id"], "exp": time.time() + 7 * 24 * 3600})
                return {"access_token": token, "token_type": "bearer", "username": u["username"]}
            break
            
    raise HTTPException(status_code=400, detail="Invalid username or password")

@app.get("/api/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    users = get_users_db()
    for u in users:
        if u["id"] == user_id:
            return {"id": u["id"], "username": u["username"]}
    raise HTTPException(status_code=404, detail="User not found")

# Projects Endpoints
@app.post("/api/projects")
async def create_project(data: ProjectCreate, user_id: str = Depends(get_current_user)):
    projects = get_projects_db()
    project_id = str(uuid.uuid4())
    new_project = {
        "id": project_id,
        "name": data.name,
        "user_id": user_id,
        "created_at": datetime.now().isoformat()
    }
    projects.append(new_project)
    save_projects_db(projects)
    
    # set up the project dirs
    get_project_paths(project_id)
    
    return new_project

@app.get("/api/projects")
async def list_projects(user_id: str = Depends(get_current_user)):
    projects = get_projects_db()
    modified = False
    user_projects = []
    for p in projects:
        if "user_id" not in p:
            p["user_id"] = user_id
            modified = True
        if p["user_id"] == user_id:
            user_projects.append(p)
    if modified:
        save_projects_db(projects)
    return {"projects": user_projects}

class ProjectUpdate(BaseModel):
    name: str

@app.put("/api/projects/{project_id}")
async def rename_project(project_id: str, data: ProjectUpdate, user_id: str = Depends(get_current_user)):
    projects = get_projects_db()
    for p in projects:
        if p["id"] == project_id:
            if "user_id" not in p:
                p["user_id"] = user_id
            if p["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this project")
            p["name"] = data.name
            save_projects_db(projects)
            return p
    raise HTTPException(status_code=404, detail="Project not found")

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_current_user)):
    projects = get_projects_db()
    target_project = None
    for p in projects:
        if p["id"] == project_id:
            target_project = p
            break
    if not target_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if "user_id" not in target_project:
        target_project["user_id"] = user_id
    if target_project["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    updated_projects = [p for p in projects if p["id"] != project_id]
    save_projects_db(updated_projects)
    
    base_dir = os.path.join(PROJECTS_DIR, project_id)
    if os.path.exists(base_dir):
        try:
            shutil.rmtree(base_dir)
            
            # also nuke the chroma collection
            from src.retrieval.chroma_store import ChromaStore
            try:
                client = ChromaStore.get_client()
                client.delete_collection(name=project_id)
            except Exception:
                pass
                
        except Exception as e:
            print(f"Failed to delete project directory: {e}")
            
    return {"status": "success"}

@app.post("/api/projects/{project_id}/analyze")
async def review_design(
    project_id: str, 
    query: str = Form(""), 
    image: Optional[UploadFile] = File(None),
    thread_id: Optional[str] = Form(None),
    ai_provider: Optional[str] = Form(None),
    ai_api_key: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    verify_project_ownership(project_id, user_id)
    _, _, stats_file, reviews_dir = get_project_paths(project_id)
    
    # grab the project name so the AI knows which brand it's looking at
    project_name = project_id  # fallback
    projects = get_projects_db()
    for p in projects:
        if p["id"] == project_id:
            project_name = p["name"]
            break
    
    image_path = None
    if image and image.filename:
        image_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{image.filename}")
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
    q = queue.Queue()
    
    def background_task():
        try:
            state = {
                "query": query,
                "image_path": image_path,
                "project_id": project_id,
                "project_name": project_name,
                "recursion_count": 0,
                "errors": []
            }
            
            # thread id for conversation memory
            actual_thread_id = thread_id if thread_id else str(uuid.uuid4())
            config = {
                "configurable": {
                    "thread_id": actual_thread_id,
                    "queue": q,
                    "ai_provider": ai_provider,
                    "ai_api_key": ai_api_key,
                }
            }
            
            final_state = graph.invoke(state, config=config)
            
            design_review = final_state.get("design_review", {})
            
            review_id = str(uuid.uuid4())
            try:
                stats = get_stats(stats_file)
                stats["designs_reviewed"] += 1
                stats["enhancements_suggested"] += len(design_review.get("enhancements", {}).get("suggestions", []))
                score = design_review.get("brand_consistency", {}).get("consistency_score", 0)
                stats["total_health_score"] += score
                
                if "recent_scores" not in stats:
                    stats["recent_scores"] = []
                stats["recent_scores"].append(score)
                if len(stats["recent_scores"]) > 10:
                    stats["recent_scores"] = stats["recent_scores"][-10:]
                
                top_issue = "No major issues"
                suggestions = design_review.get("enhancements", {}).get("suggestions", [])
                if suggestions:
                    top_issue = suggestions[0].get("title", top_issue)
                    
                import time
                stats["last_review"] = {
                    "filename": image.filename if (image and hasattr(image, 'filename')) else "Pasted Image",
                    "top_issue": top_issue,
                    "timestamp": int(time.time()),
                    "review_id": review_id
                }
                
                with open(stats_file, "w") as f:
                    json.dump(stats, f)
            except Exception as e:
                print(f"Failed to update stats: {e}")
            response_data = {
                "review_id": review_id,
                "thread_id": actual_thread_id,
                "synthesis": final_state.get("raw_synthesis", ""),
                "design_review": design_review,
                "evidence": final_state.get("retrieved_context", []),
                "validation_passed": final_state.get("validation_passed", False),
                "errors": final_state.get("errors", [])
            }
            
            # save to review history
            with open(os.path.join(reviews_dir, f"{review_id}.json"), "w") as f:
                json.dump(response_data, f, indent=2)
            
            q.put({"type": "final", "data": response_data})
            
        except Exception as e:
            traceback.print_exc()
            q.put({"type": "error", "data": str(e)})
        finally:
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
            q.put(None)

    threading.Thread(target=background_task).start()

    def event_generator():
        while True:
            item = q.get()
            if item is None:
                break
            if item["type"] == "token":
                yield f"data: {json.dumps({'type': 'token', 'content': item['data']})}\n\n"
            elif item["type"] == "final":
                yield f"data: {json.dumps({'type': 'final', 'data': item['data']})}\n\n"
            elif item["type"] == "error":
                yield f"data: {json.dumps({'type': 'error', 'error': item['data']})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/projects/{project_id}/ingest")
async def ingest_guideline(project_id: str, file: UploadFile = File(...), ai_provider: Optional[str] = Form(None), ai_api_key: Optional[str] = Form(None), user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    if not file.filename:
        return JSONResponse(status_code=400, content={"error": "No file provided."})
    
    allowed_extensions = ('.pdf', '.md', '.txt')
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return JSONResponse(
            status_code=400,
            content={"error": f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed_extensions)}"}
        )
    
    base_dir, guidelines_dir, _, _ = get_project_paths(project_id)
    file_path = os.path.join(guidelines_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # pull text out of the doc for brand kit extraction
        text = ""
        if ext == '.pdf':
            import pypdf
            reader = pypdf.PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
                
        # ask openai to pull out brand kit info
        try:
            ingest_client, ingest_model = resolve_ai_client(ai_provider, ai_api_key)
            response = ingest_client.beta.chat.completions.parse(
                model=ingest_model,
                messages=[
                    {"role": "system", "content": "Extract the brand kit information (primary colors, secondary colors, typography fonts, and clearance/logo spacing rules) from the following text. Colors must be hex codes."},
                    {"role": "user", "content": text[:30000]}
                ],
                response_format=BrandKit
            )
            brand_kit_data = response.choices[0].message.parsed.model_dump()
            with open(os.path.join(base_dir, "brand_kit.json"), "w") as f:
                json.dump(brand_kit_data, f, indent=2)
        except Exception as extract_err:
            print(f"Failed to extract brand kit: {extract_err}")
        
        build_index(guidelines_dir, project_id)
        
        return {
            "status": "success",
            "message": f"Successfully ingested '{file.filename}' into project.",
            "filename": file.filename
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Ingestion failed: {str(e)}"}
        )

@app.get("/api/projects/{project_id}/guidelines")
async def list_guidelines(project_id: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    try:
        base_dir, guidelines_dir, _, _ = get_project_paths(project_id)
        files = []
        if os.path.exists(guidelines_dir):
            for filename in os.listdir(guidelines_dir):
                filepath = os.path.join(guidelines_dir, filename)
                if os.path.isfile(filepath):
                    stat = os.stat(filepath)
                    files.append({
                        "filename": filename,
                        "size_bytes": stat.st_size,
                        "modified_at": stat.st_mtime,
                    })
        
        return {"guidelines": files}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to list guidelines: {str(e)}"}
        )

@app.get("/api/projects/{project_id}/brand_kit")
async def get_brand_kit(project_id: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    try:
        base_dir, _, _, _ = get_project_paths(project_id)
        brand_kit_path = os.path.join(base_dir, "brand_kit.json")
        if os.path.exists(brand_kit_path):
            with open(brand_kit_path, "r") as f:
                return json.load(f)
        return JSONResponse(status_code=404, content={"error": "Brand kit not found."})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get brand kit: {str(e)}"}
        )

@app.get("/api/projects/{project_id}/stats")
async def get_dashboard_stats(project_id: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    try:
        base_dir, guidelines_dir, stats_file, _ = get_project_paths(project_id)
        stats = get_stats(stats_file)
        
        active_guidelines = 0
        if os.path.exists(guidelines_dir):
            active_guidelines = len([name for name in os.listdir(guidelines_dir) if os.path.isfile(os.path.join(guidelines_dir, name))])
        
        avg_health = 0
        if stats["designs_reviewed"] > 0:
            avg_health = int(stats["total_health_score"] / stats["designs_reviewed"])
            
        return {
            "active_guidelines": active_guidelines,
            "designs_reviewed": stats["designs_reviewed"],
            "enhancements_suggested": stats["enhancements_suggested"],
            "brand_health_score": avg_health,
            "recent_scores": stats.get("recent_scores", []),
            "last_review": stats.get("last_review", None)
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get stats: {str(e)}"}
        )
class ScrapeRequest(BaseModel):
    url: str
    ai_provider: Optional[str] = None
    ai_api_key: Optional[str] = None

@app.post("/api/projects/{project_id}/scrape")
async def scrape_website(project_id: str, payload: ScrapeRequest, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    import requests as http_requests
    import re
    from urllib.parse import urljoin, urlparse
    from bs4 import BeautifulSoup
    from src.ingestion.build_index import build_index
    from src.ingestion.manifest import load_manifest
    
    base_dir, guidelines_dir, _, _ = get_project_paths(project_id)
    
    # Derive brand name from domain as fallback
    parsed_url = urlparse(payload.url)
    domain = parsed_url.netloc.replace('www.', '')
    domain_brand = domain.split('.')[0].capitalize()
    
    req_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = http_requests.get(payload.url, headers=req_headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
        
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # collect raw CSS from inline styles, <style> blocks, and external sheets
    all_css = ""
    
    # inline <style> blocks
    for style_tag in soup.find_all('style'):
        css_text = style_tag.get_text()
        if css_text.strip():
            all_css += css_text + "\n"
    
    # external stylesheets (cap at 3 to keep it fast)
    for link in soup.find_all('link', rel='stylesheet')[:3]:
        href = link.get('href')
        if not href:
            continue
        css_url = urljoin(payload.url, href)
        try:
            css_resp = http_requests.get(css_url, headers=req_headers, timeout=5)
            if css_resp.status_code == 200:
                all_css += css_resp.text[:20000] + "\n"
        except Exception:
            pass
    
    # inline style attributes on elements
    for tag in soup.find_all(style=True)[:100]:
        all_css += tag.get('style', '') + "\n"
    
    # pull structured signals out of the raw CSS instead of passing it all
    
    # grab all hex colors
    hex_colors = list(set(re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', all_css)))
    # filter out boring grays/blacks/whites
    brand_hex = [c for c in hex_colors if c.lower() not in ('#000', '#000000', '#fff', '#ffffff', '#333', '#333333', '#666', '#666666', '#999', '#999999', '#ccc', '#cccccc', '#eee', '#eeeeee', '#f5f5f5', '#fafafa', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#aaa', '#aaaaaa', '#bbb', '#bbbbbb', '#ddd', '#dddddd')]
    
    # rgb/rgba colors
    rgb_colors = re.findall(r'rgba?\([^)]+\)', all_css)[:20]
    
    # font-family declarations
    font_families = list(set(re.findall(r'font-family\s*:\s*([^;}{]+)', all_css)))
    
    # @font-face names
    font_face_names = list(set(re.findall(r"font-family\s*:\s*['\"]([^'\"]+)['\"]", all_css)))
    
    # google fonts / typekit / fontshare links
    font_links = []
    for link in soup.find_all('link'):
        href = link.get('href', '')
        if any(d in href for d in ['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net', 'fontshare.com']):
            font_links.append(href)
            # also parse font names from the google fonts url params
            font_matches = re.findall(r'family=([^&:]+)', href)
            for fm in font_matches:
                font_face_names.append(fm.replace('+', ' '))
    
    # theme-color meta tags
    meta_colors = []
    for meta in soup.find_all('meta'):
        name = (meta.get('name') or '').lower()
        content = meta.get('content', '')
        if name in ('theme-color', 'msapplication-tilecolor') and content:
            meta_colors.append(content)
    
    # CSS custom properties that look brand-related
    css_vars = re.findall(r'(--[\w-]+)\s*:\s*([^;]+)', all_css)
    brand_vars = [(name, val.strip()) for name, val in css_vars 
                  if any(kw in name.lower() for kw in ['color', 'brand', 'primary', 'secondary', 'accent', 'font'])]
    
    # page title
    page_title = soup.title.get_text().strip() if soup.title else domain_brand
    
    # strip scripts and nav, get the text content
    for script in soup(["script", "style", "nav", "footer", "noscript", "svg"]):
        script.extract()
    text = soup.get_text(separator="\n", strip=True)
    # clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # save the scraped text for RAG indexing
    safe_url = payload.url.replace("https://", "").replace("http://", "").replace("/", "_")[:50]
    file_path = os.path.join(guidelines_dir, f"competitor_{safe_url}.txt")
    
    # include some extra data even if the page had little visible text
    file_content = f"Source URL: {payload.url}\nBrand: {page_title}\n\n"
    if text.strip():
        file_content += text[:10000]
    else:
        file_content += f"(JavaScript-rendered site — limited text extracted)\nDomain: {domain}\n"
    if brand_hex:
        file_content += f"\n\nExtracted Colors: {', '.join(brand_hex[:20])}"
    if font_face_names:
        file_content += f"\nExtracted Fonts: {', '.join(list(set(font_face_names))[:10])}"
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(file_content)
        
    build_index(guidelines_dir, project_id)
    
    manifest_path = os.path.join(base_dir, "manifest.json")
    manifest = load_manifest(manifest_path)
    
    # build a compact prompt with the extracted signals for the AI
    signal_parts = []
    signal_parts.append(f"WEBSITE: {payload.url}")
    signal_parts.append(f"PAGE TITLE: {page_title}")
    signal_parts.append(f"DOMAIN BRAND NAME: {domain_brand}")
    
    if meta_colors:
        signal_parts.append(f"META THEME COLORS: {', '.join(meta_colors)}")
    
    if brand_hex:
        signal_parts.append(f"HEX COLORS FOUND IN CSS ({len(brand_hex)} unique): {', '.join(brand_hex[:30])}")
    
    if rgb_colors:
        signal_parts.append(f"RGB COLORS IN CSS: {', '.join(rgb_colors[:10])}")
    
    if brand_vars:
        signal_parts.append(f"CSS CUSTOM PROPERTIES: {'; '.join(f'{n}: {v}' for n, v in brand_vars[:20])}")
    
    if font_face_names:
        signal_parts.append(f"FONT NAMES FOUND: {', '.join(list(set(font_face_names))[:10])}")
    
    if font_families:
        signal_parts.append(f"FONT-FAMILY DECLARATIONS: {'; '.join(font_families[:10])}")
    
    if font_links:
        signal_parts.append(f"FONT SERVICE URLS: {'; '.join(font_links[:5])}")
    
    if text.strip():
        signal_parts.append(f"PAGE TEXT EXCERPT: {text[:3000]}")
    else:
        signal_parts.append("PAGE TEXT: (empty — site is JavaScript-rendered, no server-side content)")
    
    signals_prompt = "\n".join(signal_parts)
    
    print(f"[SCRAPE] Signals for {payload.url}:")
    print(f"  - Hex colors found: {len(brand_hex)}")
    print(f"  - Fonts found: {len(set(font_face_names))}")
    print(f"  - Font links: {len(font_links)}")
    print(f"  - CSS vars: {len(brand_vars)}")
    print(f"  - Text length: {len(text)} chars")
    print(f"  - Prompt size: {len(signals_prompt)} chars")
    
    # send it off to the AI for brand kit extraction
    extract_error = None
    try:
        from openai import OpenAI
        scrape_client, scrape_model = resolve_ai_client(payload.ai_provider, payload.ai_api_key)
        
        system_instruction = (
            "You are a brand identity expert. Extract the brand kit from the provided website analysis signals.\n\n"
            "RULES:\n"
            "1. **name**: The brand/company name.\n"
            "2. **primary_colors**: 2-5 PRIMARY brand colors as hex codes. Use the CSS signals provided. "
            "For well-known brands, you KNOW their official colors — USE that knowledge.\n"
            "3. **secondary_colors**: 1-4 secondary/accent colors as hex codes.\n"
            "4. **typography**: The font families used by this brand. Check the FONT NAMES, font-family declarations, "
            "and Google Fonts URLs. For well-known brands, you KNOW their fonts — USE that knowledge.\n\n"
            "CRITICAL: You MUST return non-empty arrays. For ANY recognizable brand, "
            "use your built-in knowledge of their brand identity. "
            "Example: Samsung uses #1428A0 (Samsung Blue), font 'SamsungOne'. "
            "Example: Apple uses #000000, #555555, font 'SF Pro'. "
            "NEVER return empty arrays."
        )
        
        completion = scrape_client.beta.chat.completions.parse(
            model=scrape_model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": signals_prompt}
            ],
            response_format=CompetitorKit
        )
        competitor_kit = completion.choices[0].message.parsed.model_dump()
        competitor_kit["url"] = payload.url
        
        print(f"[SCRAPE] AI extracted: {competitor_kit['name']}, {len(competitor_kit['primary_colors'])} primary, {len(competitor_kit['typography'])} fonts")
        
        competitors_file = os.path.join(base_dir, "competitors.json")
        competitors = []
        if os.path.exists(competitors_file):
            with open(competitors_file, "r") as f:
                competitors = json.load(f)
        competitors.append(competitor_kit)
        with open(competitors_file, "w") as f:
            json.dump(competitors, f, indent=2)
    except Exception as extract_err:
        extract_error = str(extract_err)
        print(f"[SCRAPE ERROR] Failed to extract competitor brand kit: {extract_err}")
        traceback.print_exc()
    
    result = {"status": "success", "url": payload.url, "manifest": manifest}
    if extract_error:
        result["warning"] = f"Brand kit extraction failed: {extract_error}"
    return result

@app.get("/api/projects/{project_id}/competitors")
async def get_competitors(project_id: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    try:
        base_dir, _, _, _ = get_project_paths(project_id)
        competitors_path = os.path.join(base_dir, "competitors.json")
        if os.path.exists(competitors_path):
            with open(competitors_path, "r") as f:
                return {"competitors": json.load(f)}
        return {"competitors": []}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get competitors: {str(e)}"}
        )

@app.post("/api/projects/{project_id}/reset-db")
async def reset_database(project_id: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    import shutil
    from src.retrieval.chroma_store import ChromaStore
    
    base_dir, guidelines_dir, _, _ = get_project_paths(project_id)
    
    # nuke the chroma collection
    client = ChromaStore.get_client()
    try:
        client.delete_collection(project_id)
    except Exception:
        pass
        
    # wipe guideline files
    if os.path.exists(guidelines_dir):
        shutil.rmtree(guidelines_dir)
        os.makedirs(guidelines_dir, exist_ok=True)
        
    # remove manifest and brand_kit json
    manifest_path = os.path.join(base_dir, "manifest.json")
    if os.path.exists(manifest_path):
        os.remove(manifest_path)
        
    brand_kit_path = os.path.join(base_dir, "brand_kit.json")
    if os.path.exists(brand_kit_path):
        os.remove(brand_kit_path)
        
    competitors_path = os.path.join(base_dir, "competitors.json")
    if os.path.exists(competitors_path):
        os.remove(competitors_path)
        
    return {"status": "success", "message": "Database and guidelines reset successfully."}

@app.delete("/api/projects/{project_id}/guidelines/{filename}")
async def delete_guideline(project_id: str, filename: str, user_id: str = Depends(get_current_user)):
    verify_project_ownership(project_id, user_id)
    try:
        base_dir, guidelines_dir, _, _ = get_project_paths(project_id)
        file_path = os.path.join(guidelines_dir, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Guideline not found")
            
        is_competitor = filename.startswith("competitor_")
        target_url = None
        if is_competitor:
            with open(file_path, "r", encoding="utf-8") as f:
                first_line = f.readline()
                if first_line.startswith("Source URL: "):
                    target_url = first_line.replace("Source URL: ", "").strip()

        os.remove(file_path)
        
        if is_competitor:
            competitors_path = os.path.join(base_dir, "competitors.json")
            if os.path.exists(competitors_path) and target_url:
                with open(competitors_path, "r", encoding="utf-8") as f:
                    comps = json.load(f)
                comps = [c for c in comps if c.get("url") != target_url]
                with open(competitors_path, "w", encoding="utf-8") as f:
                    json.dump(comps, f)
        else:
            brand_kit_path = os.path.join(base_dir, "brand_kit.json")
            if os.path.exists(brand_kit_path):
                with open(brand_kit_path, "r", encoding="utf-8") as f:
                    kit = json.load(f)
                kit["is_stale"] = True
                with open(brand_kit_path, "w", encoding="utf-8") as f:
                    json.dump(kit, f)
            
        manifest_path = os.path.join(base_dir, "manifest.json")
        if os.path.exists(manifest_path):
            os.remove(manifest_path)
            
        return {"status": "success", "message": f"Deleted {filename}"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Failed to delete guideline: {str(e)}"})
