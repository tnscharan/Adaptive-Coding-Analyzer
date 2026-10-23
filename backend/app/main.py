from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core import database
from app.core.logging_config import setup_logging

# Configure logging using standard file handlers
setup_logging()
logger = logging.getLogger(__name__)

from app.models import domain as models
from app.api.routers import sessions_router, execution_router, analytics_router

app = FastAPI(title="Adaptive Cognitive Programming Intelligence System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized API response format helper
@app.middleware("http")
async def standardize_response_middleware(request: Request, call_next):
    # Skip standard formatting for WebSockets or documentation paths
    if request.url.path.startswith("/ws") or request.url.path in ["/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
        
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled API error: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": f"Server Error: {str(e)}",
                "data": None
            }
        )

# Initialize database tables
models.Base.metadata.create_all(bind=database.engine)

# Seed default demo user if empty on startup
db = database.SessionLocal()
try:
    demo_user = db.query(models.User).filter(models.User.id == 1).first()
    if not demo_user:
        logger.info("Database initialized. Seeding default Demo User (ID=1)")
        demo_user = models.User(id=1, name="Demo User", email="demo@example.com")
        db.add(demo_user)
        db.commit()
        logger.info("Default Demo User seeded successfully.")
except Exception as e:
    db.rollback()
    logger.error(f"Error seeding default user: {e}")
finally:
    db.close()

# Include routers
app.include_router(sessions_router.router)
app.include_router(execution_router.router)
app.include_router(analytics_router.router)

@app.get("/")
def read_root():
    return {
        "success": True,
        "message": "Welcome to the Adaptive Cognitive API",
        "data": {
            "version": "2.0.0",
            "status": "online"
        }
    }

@app.get("/health")
def health_check():
    has_docker = execution_router.execution_manager.client is not None
    return {
        "success": True,
        "message": "System check complete",
        "data": {
            "status": "online",
            "service": "adaptive-cognitive-local-engine",
            "sandbox_enabled": has_docker
        }
    }
