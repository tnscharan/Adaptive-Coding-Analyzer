import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime

from app.main import app
from app.core.database import Base, get_db
from app.models import domain as models
from app.services.analysis_service import CodeIntelligence

# Set up temporary test database
from sqlalchemy.pool import NullPool
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(BASE_DIR, "data", "test_app.db")
os.makedirs(os.path.dirname(db_path), exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=NullPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override database dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Setup tables
    Base.metadata.create_all(bind=engine)
    # Seed default user
    db = TestingSessionLocal()
    if not db.query(models.User).filter(models.User.id == 1).first():
        user = models.User(id=1, name="Test User", email="test@example.com")
        db.add(user)
        db.commit()
    db.close()
    
    yield
    
    # Teardown tables
    Base.metadata.drop_all(bind=engine)

# 1. Test Read Root
def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Welcome" in data["message"]

# 2. Test Health Check
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "online"

# 3. Test Session Start
def test_create_session():
    response = client.post("/sessions/start", json={"language": "python"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] is not None
    assert data["language"] == "python"
    assert data["user_id"] == 1

# 4. Test Session Start Invalid Payload
def test_create_session_invalid_input():
    response = client.post("/sessions/start", json={})
    assert response.status_code == 422  # Validation Error

# 5. Test Session End
def test_end_session():
    # Create session
    start_res = client.post("/sessions/start", json={"language": "python"})
    session_id = start_res.json()["id"]

    # End session
    end_res = client.post(f"/sessions/end/{session_id}")
    assert end_res.status_code == 200
    data = end_res.json()
    assert data["ended_at"] is not None
    assert data["duration_seconds"] is not None

# 6. Test Session End Not Found
def test_end_session_not_found():
    response = client.post("/sessions/end/9999")
    assert response.status_code == 404

# 7. Test Session End Already Ended
def test_end_session_already_ended():
    start_res = client.post("/sessions/start", json={"language": "python"})
    session_id = start_res.json()["id"]
    
    client.post(f"/sessions/end/{session_id}")
    res2 = client.post(f"/sessions/end/{session_id}")
    assert res2.status_code == 200  # Should return existing record gracefully

# 8. Test Track Event Valid
def test_track_event_valid():
    start_res = client.post("/sessions/start", json={"language": "python"})
    session_id = start_res.json()["id"]

    event_data = {
        "session_id": session_id,
        "event_type": "typing",
        "payload_json": {"char": "a"}
    }
    response = client.post("/sessions/events/track", json=event_data)
    assert response.status_code == 200
    assert response.json()["success"] is True

# 9. Test Track Event Invalid Type
def test_track_event_invalid_type():
    start_res = client.post("/sessions/start", json={"language": "python"})
    session_id = start_res.json()["id"]

    event_data = {
        "session_id": session_id,
        "event_type": "invalid_type_here",
        "payload_json": {}
    }
    response = client.post("/sessions/events/track", json=event_data)
    assert response.status_code == 400

# 10. Test Track Event Invalid Session
def test_track_event_invalid_session():
    event_data = {
        "session_id": 9999,
        "event_type": "typing",
        "payload_json": {}
    }
    response = client.post("/sessions/events/track", json=event_data)
    assert response.status_code == 404

# 11. Test AST Analysis Python Simple
def test_ast_analysis_python_simple():
    code = "def add(a, b):\n    return a + b\n"
    res = CodeIntelligence.analyze_code(code, "python")
    assert res["ast_metrics"]["num_functions"] == 1
    assert res["ast_metrics"]["num_loops"] == 0
    assert res["complexity_score"] == 1.0

# 12. Test AST Analysis Python Nesting
def test_ast_analysis_python_nesting():
    code = "for i in range(10):\n    if i > 5:\n        for j in range(5):\n            print(i, j)"
    res = CodeIntelligence.analyze_code(code, "python")
    assert res["ast_metrics"]["num_loops"] == 2
    assert res["ast_metrics"]["max_nesting_depth"] == 3

# 13. Test AST Analysis Python Recursion
def test_ast_analysis_python_recursion():
    code = "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)"
    res = CodeIntelligence.analyze_code(code, "python")
    assert res["ast_metrics"]["recursion_detected"] is True

# 14. Test AST Analysis Python Security
def test_ast_analysis_python_security():
    code = "eval('print(123)')\nimport os"
    res = CodeIntelligence.analyze_code(code, "python")
    assert len(res["ast_metrics"]["security_issues"]) > 0

# 15. Test AST Analysis Generic C
def test_ast_analysis_generic_c():
    code = "#include <stdio.h>\nint main() {\n    printf(\"Hello\");\n}"
    res = CodeIntelligence.analyze_code(code, "c")
    assert res["ast_metrics"]["num_imports"] == 1
    assert res["complexity_score"] == 1.0

# 16. Test AST Analysis Generic C++
def test_ast_analysis_generic_cpp():
    code = "#include <iostream>\nint main() {\n    for(int i=0; i<10; ++i) {\n        std::cout << i;\n    }\n}"
    res = CodeIntelligence.analyze_code(code, "cpp")
    assert res["ast_metrics"]["num_loops"] == 1
    assert res["complexity_score"] == 2.0

# 17. Test AST Analysis Generic Java
def test_ast_analysis_generic_java():
    code = "import java.util.*;\npublic class Main {\n    public static void run() {}\n}"
    res = CodeIntelligence.analyze_code(code, "java")
    assert res["ast_metrics"]["num_imports"] == 1
    assert res["ast_metrics"]["num_functions"] == 1

# 18. Test Predict Readiness Beginner
def test_predict_readiness_beginner():
    payload = {"user_id": 1}
    # Create beginner session
    response = client.post("/predict/readiness", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_level"] in ["Beginner", "Intermediate", "Advanced"]

# 19. Test Get Dashboard Empty
def test_get_dashboard_empty():
    response = client.get("/analytics/dashboard/1")
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["executions_count"] == 0
    assert data["success_rate"] == 80.0

# 20. Test Get Dashboard With Data
def test_get_dashboard_with_data():
    # Start a session
    sess_res = client.post("/sessions/start", json={"language": "python"})
    session_id = sess_res.json()["id"]
    
    # Save a run mock
    db = TestingSessionLocal()
    run_rec = models.CodeExecution(
        session_id=session_id,
        language="python",
        source_code="print(1)",
        output="1\n",
        exit_code=0,
        execution_time=0.1,
        complexity_score=1.0,
        maintainability_index=100.0,
        ast_metrics={"num_loops": 0},
        scores={"overall": 90.0, "readability": 90.0, "efficiency": 90.0, "maintainability": 100.0, "security": 100.0, "optimization": 95.0}
    )
    db.add(run_rec)
    db.commit()
    db.close()
    
    response = client.get("/analytics/dashboard/1")
    assert response.status_code == 200
    data = response.json()
    assert data["total_sessions"] == 1
    assert data["executions_count"] == 1
    assert data["success_rate"] == 100.0
    assert data["profile_level"] in ["Beginner", "Intermediate", "Advanced"]

# 21. Test Local Execution Fallback
def test_local_execution_fallback(monkeypatch):
    from app.api.routers import execution_router
    monkeypatch.setattr(execution_router.execution_manager, "client", None)

    # Start session
    sess_res = client.post("/sessions/start", json={"language": "python"})
    assert sess_res.status_code == 200
    session_id = sess_res.json()["id"]
    
    # Run code execution via HTTP endpoint
    exec_res = client.post("/execution/execute", json={
        "session_id": session_id,
        "language": "python",
        "code": "print('hello fallback')"
    })
    
    assert exec_res.status_code == 200
    data = exec_res.json()
    assert "hello fallback" in data["output"]
    assert data["exit_code"] == 0

# 22. Test DP vs Recursion Complexity
def test_complexity_dp_vs_recursion():
    # DP (Linear time)
    dp_code = "def fib(n):\n    dp = [0] * (n+1)\n    for i in range(2, n+1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]"
    dp_res = CodeIntelligence.analyze_code(dp_code, "python")
    assert dp_res["complexity_score"] == 2.0  # Radon includes loops in complexity
    assert dp_res["scores"]["efficiency"] >= 80.0
    
    # Recursive (Exponential time)
    rec_code = "def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)"
    rec_res = CodeIntelligence.analyze_code(rec_code, "python")
    assert rec_res["complexity_score"] == 2.0  # contains an if branch
    assert rec_res["ast_metrics"]["recursion_detected"] is True
    assert any("Recursion" in s for s in rec_res["strengths"])

# 23. Test Workspace Multi-file AST Review Heuristics
def test_ast_workspace_multifile_analysis():
    active_code = "import utils\nutils.format_date('2026')"
    workspace_files = [
        {"name": "utils.py", "code": "def format_date(d):\n    return d", "language": "python"}
    ]
    res = CodeIntelligence.analyze_code(active_code, "python", workspace_files)
    
    # Check that it detected workspace integration
    assert any("Workspace Integration" in s for s in res["strengths"])
    assert not any("ignores surrounding" in w.lower() for w in res["weaknesses"])

# 24. Test C++ Sorting Complexity Estimation
def test_cpp_complexity_sort():
    cpp_code = "#include <algorithm>\nvoid sortArray(int arr[], int n) {\n    for(int i=0; i<n; ++i) {\n        for(int j=i+1; j<n; ++j) {\n            if(arr[i] > arr[j]) swap(arr[i], arr[j]);\n        }\n    }\n}"
    res = CodeIntelligence.analyze_code(cpp_code, "cpp")
    
    # Time complexity should be estimated as O(N^2) because max nested loop depth is 2
    assert res["ast_metrics"]["num_loops"] == 2
    assert res["complexity_score"] == 4.0  # 1 + loops + ifs
    assert any("O(N^2)" in w for w in res["weaknesses"]) or res["scores"]["efficiency"] < 100.0

# 25. Test Behavioral Telemetry AST Analysis
def test_ast_behavioral_telemetry_analysis():
    code = "def process():\n    pass"
    behavioral_stats = {
        "avg_wpm": 85.0,
        "pauses": 8,
        "backspaces": 22
    }
    workspace_files = [
        {"name": "helper.py", "code": "def run(): pass", "language": "python"}
    ]
    res = CodeIntelligence.analyze_code(
        code=code,
        language="python",
        workspace_files=workspace_files,
        filename="process.py",
        behavioral_stats=behavioral_stats
    )
    
    # Verify custom Mastery Profile title matching velocity WPM
    assert res["profile_summary"]["title"] in ["High-Velocity Coder", "Elite Systems Architect"]
    assert "process.py" in res["profile_summary"]["description"]
    assert "85.0" in res["profile_summary"]["description"]
    
    # Verify weaknesses and action plans based on telemetry
    assert any("High Correction Rate" in w for w in res["weaknesses"])
    assert any("Cognitive Stalling" in w for w in res["weaknesses"])
    assert any("backspace corrections" in a for a in res["action_plan"])
    assert any("minimize pauses" in a for a in res["action_plan"])
    
    # Verify pathway guide has telemetry entries
    pathway_titles = [step["title"] for step in res["learning_pathway"]]
    assert "Cognitive Rhythm & Editing Pace" in pathway_titles
    assert "Algorithmic Pause Management" in pathway_titles
