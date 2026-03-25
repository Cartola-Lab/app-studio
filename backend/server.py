from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import json
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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


# Define Models
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


# Import emergent integrations for Claude
from emergentintegrations.llm.chat import LlmChat, UserMessage


async def stream_chat_response(messages: List[ChatMessage], session_id: str):
    """Stream chat response from Claude via emergent integrations"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            yield f"data: {json.dumps({'type': 'error', 'message': 'API key not configured'})}\n\n"
            return

        # Initialize chat with Claude Sonnet
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=BROSTORM_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Build message history for context
        full_context = ""
        for msg in messages[:-1]:  # All except the last message
            if msg.role == "user":
                full_context += f"User: {msg.content}\n"
            else:
                full_context += f"Assistant: {msg.content}\n"
        
        # Add the last user message
        last_message = messages[-1].content if messages else ""
        if full_context:
            last_message = f"Previous conversation:\n{full_context}\n\nCurrent message: {last_message}"

        user_message = UserMessage(text=last_message)

        # Get response (non-streaming fallback since emergentintegrations may not support streaming)
        response = await chat.send_message(user_message)

        # Simulate streaming by chunking the response
        chunk_size = 20
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i + chunk_size]
            yield f"data: {json.dumps({'type': 'text_delta', 'text': chunk})}\n\n"
            await asyncio.sleep(0.02)  # Small delay for streaming effect

        yield f"data: {json.dumps({'type': 'content_block_stop'})}\n\n"
        yield f"data: {json.dumps({'type': 'message_stop'})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as e:
        logging.error(f"Chat streaming error: {str(e)}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        yield "data: [DONE]\n\n"


# Routes
@api_router.get("/")
async def root():
    return {"message": "Cartola Lab Studio API"}


@api_router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """SSE endpoint for chat with BroStorm"""
    return StreamingResponse(
        stream_chat_response(request.messages, request.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@api_router.post("/create-task", response_model=CreateTaskResponse)
async def create_task(request: CreateTaskRequest):
    """Create a task in Paperclip (mocked)"""
    # Generate mock issue ID
    issue_id = str(uuid.uuid4())
    identifier = f"CARA-{uuid.uuid4().int % 1000}"
    
    # Store in MongoDB for reference
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
    """Get all created tasks"""
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(100)
    return {"tasks": tasks}


@api_router.post("/sessions")
async def create_session():
    """Create a new chat session"""
    session = ChatSession()
    session_doc = session.model_dump()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    await db.sessions.insert_one(session_doc)
    return {"session_id": session.id}


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a chat session by ID"""
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


# ============== GitHub OAuth Endpoints ==============

GITHUB_API_URL = "https://api.github.com"
GITHUB_OAUTH_URL = "https://github.com/login/oauth/access_token"


@api_router.post("/auth/github/exchange", response_model=GitHubTokenResponse)
async def github_exchange_code(request: GitHubExchangeRequest):
    """Exchange GitHub OAuth code for access token"""
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
            
            # Fetch user info
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
            
            return GitHubTokenResponse(
                access_token=access_token,
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


@api_router.get("/github/user")
async def get_github_user(request: Request):
    """Get authenticated GitHub user"""
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
    """List user's GitHub repositories"""
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
            params={
                "sort": "updated",
                "per_page": 50,
                "affiliation": "owner"
            },
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
    """Create a new GitHub repository"""
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
    """List branches of a repository"""
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
    """Push files to a GitHub repository using Git Trees API"""
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
                json={
                    "base_tree": base_tree_sha,
                    "tree": tree_entries
                },
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


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
