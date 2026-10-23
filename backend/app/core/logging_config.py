import os
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logs directory relative to this file's parent's parent (backend root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGS_DIR = os.path.join(BASE_DIR, "logs")

if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

def setup_logging():
    # Root logger
    root_logger = logging.getLogger()
    
    # Read LOG_LEVEL from environment (default: INFO)
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)
    root_logger.setLevel(log_level)
    
    # Read CONSOLE_LOG_LEVEL from environment (default: INFO)
    console_log_level_str = os.getenv("CONSOLE_LOG_LEVEL", "INFO").upper()
    console_log_level = getattr(logging, console_log_level_str, logging.WARNING)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Detailed Formatter (for file logs)
    detailed_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Clean Formatter (for console logs)
    console_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s - %(message)s",
        datefmt="%H:%M:%S"
    )

    # backend.log (INFO and above, or log_level)
    backend_log_path = os.path.join(LOGS_DIR, "backend.log")
    backend_handler = RotatingFileHandler(backend_log_path, maxBytes=5*1024*1024, backupCount=3)
    backend_handler.setLevel(log_level)
    backend_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(backend_handler)

    # errors.log (ERROR and above)
    errors_log_path = os.path.join(LOGS_DIR, "errors.log")
    errors_handler = RotatingFileHandler(errors_log_path, maxBytes=5*1024*1024, backupCount=3)
    errors_handler.setLevel(logging.ERROR)
    errors_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(errors_handler)

    # Also log to console (WARNING and above by default, or console_log_level)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_log_level)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # Set logger levels for specific libraries
    logging.getLogger("uvicorn").setLevel(console_log_level)
    logging.getLogger("uvicorn.error").setLevel(console_log_level)
    logging.getLogger("uvicorn.access").setLevel(console_log_level)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
