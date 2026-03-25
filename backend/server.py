from fastapi import FastAPI, APIRouter, HTTPException
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
