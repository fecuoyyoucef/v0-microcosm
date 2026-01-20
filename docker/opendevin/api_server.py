"""
OpenDevin API Server
Provides REST API for interacting with OpenDevin agent
"""

import os
import asyncio
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OpenDevin API",
    description="REST API for OpenDevin AI Agent",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for tasks (في الإنتاج استخدم Redis أو قاعدة بيانات)
tasks_store: Dict[str, Dict[str, Any]] = {}

# Models
class TaskRequest(BaseModel):
    instruction: str
    project_path: Optional[str] = "/workspace"
    max_iterations: Optional[int] = 30
    context: Optional[Dict[str, Any]] = None
    
class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: int  # 0-100
    logs: List[str]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

class KimiLLMConfig(BaseModel):
    """Configuration for Kimi-K2-Instruct"""
    model: str = "moonshotai/Kimi-K2-Instruct-0905"
    api_base: Optional[str] = None
    api_key: Optional[str] = None
    temperature: float = 0.2
    max_tokens: int = 8000

# Initialize Kimi-K2 configuration
kimi_config = KimiLLMConfig(
    api_key=os.getenv("HF_TOKEN1") or os.getenv("HF_TOKEN"),
    api_base=os.getenv("HF_API_BASE", "https://api-inference.huggingface.co/models")
)

def get_kimi_llm():
    """Get configured Kimi-K2 LLM instance"""
    from opendevin.llm import LLM
    
    return LLM(
        model=kimi_config.model,
        api_key=kimi_config.api_key,
        api_base=kimi_config.api_base,
        temperature=kimi_config.temperature,
        max_tokens=kimi_config.max_tokens,
    )

async def run_opendevin_task(task_id: str, instruction: str, project_path: str, max_iterations: int):
    """Run OpenDevin task in background"""
    try:
        logger.info(f"Starting task {task_id}: {instruction}")
        
        # Update task status
        tasks_store[task_id]["status"] = "running"
        tasks_store[task_id]["progress"] = 10
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Starting OpenDevin agent...")
        
        # Import OpenDevin components
        from opendevin.controller import AgentController
        from opendevin.agent import Agent
        
        # Initialize LLM with Kimi-K2
        llm = get_kimi_llm()
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Initialized Kimi-K2-Instruct model")
        tasks_store[task_id]["progress"] = 20
        
        # Initialize agent
        agent = Agent.get_cls("CodeActAgent")(llm=llm)
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Initialized CodeAct agent")
        tasks_store[task_id]["progress"] = 30
        
        # Initialize controller
        controller = AgentController(
            agent=agent,
            workdir=project_path,
            max_iterations=max_iterations,
        )
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Initialized agent controller")
        tasks_store[task_id]["progress"] = 40
        
        # Run task
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Executing instruction: {instruction}")
        result = await controller.run(instruction)
        
        tasks_store[task_id]["progress"] = 90
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Task execution completed")
        
        # Store result
        tasks_store[task_id]["status"] = "completed"
        tasks_store[task_id]["progress"] = 100
        tasks_store[task_id]["result"] = {
            "success": True,
            "output": result.get("output", ""),
            "actions": result.get("actions", []),
            "files_changed": result.get("files_changed", []),
            "iterations": result.get("iterations", 0),
        }
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] Task completed successfully")
        tasks_store[task_id]["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Task {task_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Task {task_id} failed: {str(e)}")
        tasks_store[task_id]["status"] = "failed"
        tasks_store[task_id]["error"] = str(e)
        tasks_store[task_id]["logs"].append(f"[{datetime.now().isoformat()}] ERROR: {str(e)}")
        tasks_store[task_id]["updated_at"] = datetime.now().isoformat()

@app.get("/")
async def root():
    return {
        "service": "OpenDevin API",
        "version": "1.0.0",
        "status": "running",
        "llm_backend": kimi_config.model
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "llm_configured": kimi_config.api_key is not None,
        "active_tasks": len([t for t in tasks_store.values() if t["status"] == "running"])
    }

@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(request: TaskRequest, background_tasks: BackgroundTasks):
    """Create new OpenDevin task"""
    task_id = str(uuid.uuid4())
    
    # Initialize task
    tasks_store[task_id] = {
        "task_id": task_id,
        "instruction": request.instruction,
        "status": "pending",
        "progress": 0,
        "logs": [],
        "result": None,
        "error": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    
    # Run task in background
    background_tasks.add_task(
        run_opendevin_task,
        task_id,
        request.instruction,
        request.project_path,
        request.max_iterations
    )
    
    logger.info(f"Created task {task_id}")
    
    return TaskResponse(
        task_id=task_id,
        status="pending",
        message="Task created and queued for execution"
    )

@app.get("/api/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """Get task status and results"""
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskStatus(**tasks_store[task_id])

@app.get("/api/tasks")
async def list_tasks(status: Optional[str] = None, limit: int = 50):
    """List all tasks"""
    tasks = list(tasks_store.values())
    
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    
    # Sort by created_at descending
    tasks.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "total": len(tasks),
        "tasks": tasks[:limit]
    }

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    if task_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del tasks_store[task_id]
    return {"message": "Task deleted successfully"}

@app.post("/api/llm/test")
async def test_llm():
    """Test Kimi-K2 LLM connection"""
    try:
        llm = get_kimi_llm()
        response = await llm.chat("مرحباً، هل يمكنك الرد باللغة العربية؟")
        return {
            "success": True,
            "model": kimi_config.model,
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("OPENDEVIN_API_HOST", "0.0.0.0")
    port = int(os.getenv("OPENDEVIN_API_PORT", "8080"))
    
    logger.info(f"Starting OpenDevin API server on {host}:{port}")
    logger.info(f"Using LLM: {kimi_config.model}")
    
    uvicorn.run(app, host=host, port=port)
