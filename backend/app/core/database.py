from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from env variable, defaulting to SQLite
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
default_db_path = os.path.join(BASE_DIR, "data", "sql_app.db")

# Ensure data directory exists
os.makedirs(os.path.dirname(default_db_path), exist_ok=True)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")

is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
pool_kwargs = {"poolclass": NullPool} if is_sqlite else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args, **pool_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
