from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import json
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'cartola-lab-studio-secret-change-in-prod')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_DAYS = 30

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# BroStorm System Prompt
BROSTORM_SYSTEM_PROMPT = """You are BroStorm, the Product Strategist at Cartola Laboratory Co. — an AI-powered software factory.

Your role in the Studio:
1. LISTEN to the user's app idea
2. ASK clarifying questions before generating any code (who is the target user? what problem does it solve? what's the core feature?)
3. CHALLENGE assumptions — push back on scope creep, suggest MVP approach
4. GENERATE a visual preview (HTML/CSS/JS) once the concept is clear
5. ITERATE based on user feedback
6. PRODUCE a structured briefing when the user approves

When generating previews:
- Always wrap HTML in a ```html code block
- Always wrap CSS in a ```css code block
- Always wrap JS in a ```javascript code block
- Use modern, clean design with Tailwind-like utility classes inline
- Make previews interactive when possible (buttons, forms, navigation)
- Mobile-first responsive design

When producing the final briefing, use this EXACT format:

## Task Briefing
**Title:** [Clear, concise title in English]

**Description:** [2-3 paragraph description of what the app does, who it's for, and the core user flow]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

**Pipeline:**
1. BroDesign → UI/UX design, visual assets, CSS theme
2. BroBuilder → Full stack implementation
3. BroDeploy → Build, test, deploy to production

You speak Portuguese (Brazil) with the user but write all technical content and briefings in English.
You are casual, direct, and pragmatic. MVP first, complexity later."""


# ============== Auth Helpers ==============

def create_jwt(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Returns user if authenticated, None otherwise."""
    if not credentials:
        return None
    payload = decode_jwt(credentials.credentials)
    if not payload:
        return None
    return await db.users.find_one({"id": payload['sub']}, {"_id": 0})


# ============== Models ==============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: str
    provider: Optional[str] = 'claude'  # 'claude' | 'openai' | 'gemini'
    model: Optional[str] = None
    user_api_key: Optional[str] = None  # User's own API key — never stored


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    acceptance_criteria: List[str]
    preview_html: str
    preview_css: str
    preview_js: str


class CreateTaskResponse(BaseModel):
    issue_id: str
    identifier: str
    url: str


class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    messages: List[dict] = []


# GitHub OAuth Models
class GitHubExchangeRequest(BaseModel):
    code: str


class GitHubUser(BaseModel):
    id: int
    login: str
    avatar_url: str
    name: Optional[str] = None
    email: Optional[str] = None


class GitHubTokenResponse(BaseModel):
    access_token: str
    session_token: str
    user: GitHubUser


class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = None
    private: bool = False


class GitHubRepo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    default_branch: str
    private: bool


class PushFilesRequest(BaseModel):
    repo: str
    branch: str
    path: str
    commit_message: str
    files: List[dict]


class PushFilesResponse(BaseModel):
    success: bool
    commit_sha: str
    html_url: str


# Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    mode: Optional[str] = 'create'  # 'create' | 'extend'
    github_repo: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    github_repo: Optional[str] = None
    preview_html: Optional[str] = None
    preview_css: Optional[str] = None
    preview_js: Optional[str] = None
    lean_canvas: Optional[dict] = None


class Project(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    mode: str = 'create'
    github_repo: Optional[str] = None
    preview_html: Optional[str] = None
    preview_css: Optional[str] = None
    preview_js: Optional[str] = None
    lean_canvas: Optional[dict] = None
    created_at: str
    updated_at: str


# ============== Multi-LLM Streaming ==============

import anthropic


async def stream_claude(messages: List[ChatMessage], api_key: str, model: Optional[str]):
    """Stream from Anthropic Claude."""
    client_llm = anthropic.Anthropic(api_key=api_key)
    anthropic_messages = [{"role": m.role, "content": m.content} for m in messages]
    chosen_model = model or "claude-sonnet-4-5-20250929"

    with client_llm.messages.stream(
        model=chosen_model,
        max_tokens=4096,
        system=BROSTORM_SYSTEM_PROMPT,
        messages=anthropic_messages
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'type': 'text_delta', 'text': text})}\n\n"


async def stream_openai(messages: List[ChatMessage], api_key: str, model: Optional[str]):
    """Stream from OpenAI."""
    chosen_model = model or "gpt-4o"
    openai_messages = [{"role": "system", "content": BROSTORM_SYSTEM_PROMPT}]
    openai_messages += [{"role": m.role, "content": m.content} for m in messages]

    async with httpx.AsyncClient() as http_client:
        async with http_client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": chosen_model,
                "messages": openai_messages,
                "stream": True,
                "max_tokens": 4096,
            },
            timeout=60.0,
        ) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                raise HTTPException(status_code=response.status_code, detail=error_body.decode())
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0].get("delta", {})
                        text = delta.get("content", "")
                        if text:
                            yield f"data: {json.dumps({'type': 'text_delta', 'text': text})}\n\n"
                    except (json.JSONDecodeError, KeyError):
                        pass


async def stream_gemini(messages: List[ChatMessage], api_key: str, model: Optional[str]):
    """Stream from Google Gemini via REST."""
    chosen_model = model or "gemini-1.5-flash"
    # Build Gemini contents format
    contents = []
    for m in messages:
        role = "user" if m.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m.content}]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:streamGenerateContent"
    payload = {
        "system_instruction": {"parts": [{"text": BROSTORM_SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": 4096},
    }

    async with httpx.AsyncClient() as http_client:
        async with http_client.stream(
            "POST",
            url,
            params={"key": api_key, "alt": "sse"},
            json=payload,
            timeout=60.0,
        ) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                raise HTTPException(status_code=response.status_code, detail=error_body.decode())
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    try:
                        data = json.loads(chunk)
                        candidates = data.get("candidates", [])
                        for candidate in candidates:
                            parts = candidate.get("content", {}).get("parts", [])
                            for part in parts:
                                text = part.get("text", "")
                                if text:
                                    yield f"data: {json.dumps({'type': 'text_delta', 'text': text})}\n\n"
                    except (json.JSONDecodeError, KeyError):
                        pass


async def stream_chat_response(request: ChatRequest):
    """Route to the correct LLM provider and stream response."""
    provider = (request.provider or 'claude').lower()

    try:
        if provider == 'claude':
            api_key = request.user_api_key or os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('EMERGENT_LLM_KEY')
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'ANTHROPIC_API_KEY not configured'})}\n\n"
                return
            async for chunk in stream_claude(request.messages, api_key, request.model):
                yield chunk

        elif provider == 'openai':
            api_key = request.user_api_key
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'OpenAI API key required. Add it in Settings.'})}\n\n"
                return
            async for chunk in stream_openai(request.messages, api_key, request.model):
                yield chunk

        elif provider == 'gemini':
            api_key = request.user_api_key
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Gemini API key required. Add it in Settings.'})}\n\n"
                return
            async for chunk in stream_gemini(request.messages, api_key, request.model):
                yield chunk

        else:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Unknown provider: {provider}'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'content_block_stop'})}\n\n"
        yield f"data: {json.dumps({'type': 'message_stop'})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Chat streaming error ({provider}): {str(e)}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        yield "data: [DONE]\n\n"


# ============== Routes ==============

@api_router.get("/")
async def root():
    return {"message": "Cartola Lab Studio API"}


@api_router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """SSE endpoint for multi-LLM chat with BroStorm."""
    return StreamingResponse(
        stream_chat_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ============== Auth Endpoints ==============

GITHUB_API_URL = "https://api.github.com"
GITHUB_OAUTH_URL = "https://github.com/login/oauth/access_token"


@api_router.post("/auth/github/exchange", response_model=GitHubTokenResponse)
async def github_exchange_code(request: GitHubExchangeRequest):
    """Exchange GitHub OAuth code for access token; upsert user; return JWT."""
    client_id = os.environ.get('GITHUB_CLIENT_ID')
    client_secret = os.environ.get('GITHUB_CLIENT_SECRET')

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
        )

    try:
        async with httpx.AsyncClient() as http_client:
            # Exchange code for token
            token_response = await http_client.post(
                GITHUB_OAUTH_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": request.code
                },
                headers={"Accept": "application/json"},
                timeout=15.0
            )

            if token_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange code for token")

            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                error = token_data.get("error_description", "No access token received")
                raise HTTPException(status_code=400, detail=error)

            # Fetch GitHub user info
            user_response = await http_client.get(
                f"{GITHUB_API_URL}/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )

            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to fetch user info")

            user_data = user_response.json()
            user_id = f"github_{user_data['id']}"
            now = datetime.now(timezone.utc).isoformat()

            # Upsert user in MongoDB
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "id": user_id,
                    "github_id": user_data["id"],
                    "login": user_data["login"],
                    "avatar_url": user_data["avatar_url"],
                    "name": user_data.get("name"),
                    "email": user_data.get("email"),
                    "updated_at": now
                }, "$setOnInsert": {"created_at": now}},
                upsert=True
            )

            session_token = create_jwt(user_id)

            return GitHubTokenResponse(
                access_token=access_token,
                session_token=session_token,
                user=GitHubUser(
                    id=user_data["id"],
                    login=user_data["login"],
                    avatar_url=user_data["avatar_url"],
                    name=user_data.get("name"),
                    email=user_data.get("email")
                )
            )

    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error communicating with GitHub: {str(e)}")


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current authenticated user."""
    return current_user


@api_router.post("/auth/logout")
async def logout():
    """Logout (client-side token removal — no server state to clear)."""
    return {"message": "Logged out"}


# ============== Google OAuth ==============

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class GoogleExchangeRequest(BaseModel):
    code: str
    redirect_uri: str


class GoogleUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class GoogleTokenResponse(BaseModel):
    session_token: str
    user: GoogleUser


@api_router.post("/auth/google/exchange", response_model=GoogleTokenResponse)
async def google_exchange_code(request: GoogleExchangeRequest):
    """Exchange Google OAuth code for access token; upsert user; return JWT."""
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )

    try:
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": request.code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": request.redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
                timeout=15.0,
            )

            if token_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to exchange Google code for token")

            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(status_code=400, detail="No access token from Google")

            user_response = await http_client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0,
            )

            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to fetch Google user info")

            user_data = user_response.json()
            user_id = f"google_{user_data['id']}"
            now = datetime.now(timezone.utc).isoformat()

            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "id": user_id,
                    "google_id": user_data["id"],
                    "email": user_data.get("email"),
                    "name": user_data.get("name"),
                    "avatar_url": user_data.get("picture"),
                    "updated_at": now,
                }, "$setOnInsert": {"created_at": now}},
                upsert=True,
            )

            session_token = create_jwt(user_id)
            return GoogleTokenResponse(
                session_token=session_token,
                user=GoogleUser(
                    id=user_data["id"],
                    email=user_data.get("email", ""),
                    name=user_data.get("name"),
                    picture=user_data.get("picture"),
                ),
            )

    except httpx.RequestError as e:
        logger.error(f"Google API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error communicating with Google: {str(e)}")


# ============== Project Endpoints ==============

@api_router.get("/projects")
async def list_projects(current_user: dict = Depends(get_current_user)):
    """List all projects for the current user."""
    projects = await db.projects.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    return {"projects": projects}


@api_router.post("/projects")
async def create_project(body: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """Create a new project."""
    now = datetime.now(timezone.utc).isoformat()
    project = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "name": body.name,
        "description": body.description,
        "mode": body.mode or "create",
        "github_repo": body.github_repo,
        "preview_html": None,
        "preview_css": None,
        "preview_js": None,
        "lean_canvas": None,
        "created_at": now,
        "updated_at": now
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get a project by ID."""
    project = await db.projects.find_one(
        {"id": project_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@api_router.patch("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    """Update a project."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.projects.update_one(
        {"id": project_id, "user_id": current_user["id"]},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    return await db.projects.find_one({"id": project_id}, {"_id": 0})


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a project."""
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


# ============== Chat Messages (per project) ==============

@api_router.get("/projects/{project_id}/messages")
async def get_project_messages(project_id: str, current_user: dict = Depends(get_current_user)):
    """Get chat message history for a project."""
    # Verify ownership
    project = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    messages = await db.chat_messages.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return {"messages": messages}


@api_router.post("/projects/{project_id}/messages")
async def save_project_message(project_id: str, message: ChatMessage, current_user: dict = Depends(get_current_user)):
    """Save a chat message for a project."""
    project = await db.projects.find_one({"id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "role": message.role,
        "content": message.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============== GitHub Endpoints ==============

@api_router.get("/github/user")
async def get_github_user(request: Request):
    """Get authenticated GitHub user."""
    token = request.headers.get("X-GitHub-Token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            f"{GITHUB_API_URL}/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            },
            timeout=10.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired GitHub token")

        return response.json()


@api_router.get("/github/repos")
async def list_github_repos(request: Request):
    """List user's GitHub repositories."""
    token = request.headers.get("X-GitHub-Token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            f"{GITHUB_API_URL}/user/repos",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"sort": "updated", "per_page": 50, "affiliation": "owner"},
            timeout=15.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories")

        repos = response.json()
        return [
            {
                "id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo.get("description"),
                "html_url": repo["html_url"],
                "default_branch": repo.get("default_branch", "main"),
                "private": repo["private"]
            }
            for repo in repos
        ]


@api_router.post("/github/repos")
async def create_github_repo(request: Request, repo_data: CreateRepoRequest):
    """Create a new GitHub repository."""
    token = request.headers.get("X-GitHub-Token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            f"{GITHUB_API_URL}/user/repos",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            },
            json={
                "name": repo_data.name,
                "description": repo_data.description or "Generated by Cartola Lab Studio",
                "private": repo_data.private,
                "auto_init": True
            },
            timeout=15.0
        )

        if response.status_code not in [201, 200]:
            error_msg = response.json().get("message", "Failed to create repository")
            raise HTTPException(status_code=response.status_code, detail=error_msg)

        repo = response.json()
        return {
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "description": repo.get("description"),
            "html_url": repo["html_url"],
            "default_branch": repo.get("default_branch", "main"),
            "private": repo["private"]
        }


@api_router.get("/github/repos/{owner}/{repo}/branches")
async def list_repo_branches(owner: str, repo: str, request: Request):
    """List branches of a repository."""
    token = request.headers.get("X-GitHub-Token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    async with httpx.AsyncClient() as http_client:
        response = await http_client.get(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/branches",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            },
            timeout=10.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch branches")

        branches = response.json()
        return [branch["name"] for branch in branches]


@api_router.post("/github/push")
async def push_to_github(request: Request, push_data: PushFilesRequest):
    """Push files to a GitHub repository using Git Trees API."""
    token = request.headers.get("X-GitHub-Token")
    if not token:
        raise HTTPException(status_code=401, detail="GitHub token required")

    repo = push_data.repo
    branch = push_data.branch
    path_prefix = push_data.path.strip("/")

    try:
        async with httpx.AsyncClient() as http_client:
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github.v3+json"
            }

            # 1. Get the reference (latest commit SHA)
            ref_response = await http_client.get(
                f"{GITHUB_API_URL}/repos/{repo}/git/ref/heads/{branch}",
                headers=headers,
                timeout=10.0
            )

            if ref_response.status_code != 200:
                raise HTTPException(status_code=404, detail=f"Branch '{branch}' not found")

            ref_data = ref_response.json()
            latest_commit_sha = ref_data["object"]["sha"]

            # 2. Get the tree of the latest commit
            commit_response = await http_client.get(
                f"{GITHUB_API_URL}/repos/{repo}/git/commits/{latest_commit_sha}",
                headers=headers,
                timeout=10.0
            )

            if commit_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch latest commit")

            commit_obj = commit_response.json()
            base_tree_sha = commit_obj["tree"]["sha"]

            # 3. Create tree entries for each file
            tree_entries = []
            for file_data in push_data.files:
                file_path = file_data["name"]
                if path_prefix:
                    file_path = f"{path_prefix}/{file_data['name']}"
                tree_entries.append({
                    "path": file_path,
                    "mode": "100644",
                    "type": "blob",
                    "content": file_data["content"]
                })

            # 4. Create a new tree
            tree_response = await http_client.post(
                f"{GITHUB_API_URL}/repos/{repo}/git/trees",
                headers=headers,
                json={"base_tree": base_tree_sha, "tree": tree_entries},
                timeout=15.0
            )

            if tree_response.status_code not in [201, 200]:
                error_msg = tree_response.json().get("message", "Failed to create tree")
                raise HTTPException(status_code=400, detail=error_msg)

            tree_data = tree_response.json()
            new_tree_sha = tree_data["sha"]

            # 5. Create a new commit
            commit_create_response = await http_client.post(
                f"{GITHUB_API_URL}/repos/{repo}/git/commits",
                headers=headers,
                json={
                    "message": push_data.commit_message,
                    "tree": new_tree_sha,
                    "parents": [latest_commit_sha]
                },
                timeout=15.0
            )

            if commit_create_response.status_code not in [201, 200]:
                error_msg = commit_create_response.json().get("message", "Failed to create commit")
                raise HTTPException(status_code=400, detail=error_msg)

            new_commit = commit_create_response.json()
            new_commit_sha = new_commit["sha"]

            # 6. Update the branch reference
            update_ref_response = await http_client.patch(
                f"{GITHUB_API_URL}/repos/{repo}/git/refs/heads/{branch}",
                headers=headers,
                json={"sha": new_commit_sha},
                timeout=10.0
            )

            if update_ref_response.status_code != 200:
                error_msg = update_ref_response.json().get("message", "Failed to update reference")
                raise HTTPException(status_code=400, detail=error_msg)

            return PushFilesResponse(
                success=True,
                commit_sha=new_commit_sha,
                html_url=f"https://github.com/{repo}/commit/{new_commit_sha}"
            )

    except httpx.RequestError as e:
        logger.error(f"GitHub push error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error communicating with GitHub: {str(e)}")


# ============== Legacy Endpoints ==============

@api_router.post("/create-task", response_model=CreateTaskResponse)
async def create_task(request: CreateTaskRequest):
    """Create a task (legacy - mocked)."""
    issue_id = str(uuid.uuid4())
    identifier = f"CARA-{uuid.uuid4().int % 1000}"

    task_doc = {
        "id": issue_id,
        "identifier": identifier,
        "title": request.title,
        "description": request.description,
        "acceptance_criteria": request.acceptance_criteria,
        "preview_html": request.preview_html,
        "preview_css": request.preview_css,
        "preview_js": request.preview_js,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "created"
    }
    await db.tasks.insert_one(task_doc)

    return CreateTaskResponse(
        issue_id=issue_id,
        identifier=identifier,
        url=f"https://paperclip.example.com/issues/{identifier}"
    )


@api_router.get("/tasks")
async def get_tasks():
    """Get all created tasks."""
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    return {"tasks": tasks}


@api_router.post("/sessions")
async def create_session():
    """Create a new chat session."""
    session = ChatSession()
    session_doc = session.model_dump()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    await db.sessions.insert_one(session_doc)
    return {"session_id": session.id}


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a chat session by ID."""
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ============== Google Drive Export ==============

GDRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files"
GDRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"


class GDriveExportRequest(BaseModel):
    project_id: str
    access_token: str  # User's Google OAuth access token — never stored


@api_router.post("/export/gdrive")
async def export_to_gdrive(body: GDriveExportRequest, current_user: dict = Depends(get_current_user)):
    """Export project HTML/CSS/JS as files to user's Google Drive."""
    project = await db.projects.find_one(
        {"id": body.project_id, "user_id": current_user["id"]},
        {"_id": 0},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    html = project.get("preview_html", "")
    css = project.get("preview_css", "")
    js = project.get("preview_js", "")
    project_name = project.get("name", "untitled-project")

    if not html and not css and not js:
        raise HTTPException(status_code=400, detail="Project has no preview content to export")

    files_uploaded = []

    async def upload_file(name: str, content: str, mime: str):
        import base64
        metadata = {"name": f"{project_name}/{name}", "mimeType": mime}
        boundary = "boundary_cartolab"
        body_parts = (
            f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
            + json.dumps(metadata)
            + f"\r\n--{boundary}\r\nContent-Type: {mime}\r\n\r\n"
            + content
            + f"\r\n--{boundary}--"
        )
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.post(
                f"{GDRIVE_UPLOAD_URL}?uploadType=multipart",
                content=body_parts.encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {body.access_token}",
                    "Content-Type": f"multipart/related; boundary={boundary}",
                },
                timeout=30.0,
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=resp.status_code, detail=f"Google Drive upload failed: {resp.text}")
            return resp.json()

    try:
        if html:
            result = await upload_file("index.html", html, "text/html")
            files_uploaded.append({"name": "index.html", "id": result.get("id")})
        if css:
            result = await upload_file("styles.css", css, "text/css")
            files_uploaded.append({"name": "styles.css", "id": result.get("id")})
        if js:
            result = await upload_file("script.js", js, "application/javascript")
            files_uploaded.append({"name": "script.js", "id": result.get("id")})

        return {"success": True, "files": files_uploaded, "folder": project_name}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Google Drive export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


# ============== App Setup ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
