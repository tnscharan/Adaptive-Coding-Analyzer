# Contributing to ACPIS

Thank you for your interest in contributing to the **Adaptive Cognitive Programming Intelligence System (ACPIS)**! We welcome contributions ranging from cognitive telemetry algorithms and AST parsers to UI/UX improvements and documentation.

---

## 🧭 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors. Please treat fellow community members with respect, constructive feedback, and professional kindness.

---

## 🛠️ Getting Started

### 1. Fork & Clone
Fork the repository on GitHub, then clone your fork locally:
```bash
git clone https://github.com/<your-username>/Adaptive-Coding-Analyzer.git
cd Adaptive-Coding-Analyzer
```

### 2. Set Up the Development Environment
ACPIS includes automated VS Code / Antigravity setup tasks:
* Press `Ctrl+Shift+B` (or run task **"Install and Run Tasks"**) to automatically set up the virtual environment, install Python and Node dependencies, and start both dev servers.

Alternatively, follow the manual setup:
```bash
# Backend
python -m venv .venv
source .venv/bin/activate  # Or .\.venv\Scripts\Activate.ps1 on Windows
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
```

---

## 🌿 Branching & Development Workflow

1. Create a descriptive feature branch from `main`:
   ```bash
   git checkout -b feature/cognitive-burst-detection
   # or
   git checkout -b fix/editor-layout-shift
   ```
2. Make your atomic commits adhering to the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat:` for new capabilities
   - `fix:` for bug fixes
   - `docs:` for documentation updates
   - `style:` for formatting/styling adjustments
   - `refactor:` for code restructurings
   - `test:` for test additions or modifications
   - `chore:` for build tooling and dependency bumps

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all tests pass cleanly:

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 🚀 Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request targeting the `main` branch of `tnscharan/Adaptive-Coding-Analyzer`.
3. Complete all sections of the Pull Request template.
4. Respond to feedback and discussions during code review.

Thank you for helping push cognitive code intelligence forward!
