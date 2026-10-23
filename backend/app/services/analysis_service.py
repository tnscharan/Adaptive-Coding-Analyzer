import ast
import re
import logging
from radon.complexity import cc_visit
from radon.metrics import mi_visit

logger = logging.getLogger(__name__)

class SecurityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.issues = []

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in ['exec', 'eval']:
                self.issues.append(f"Security: Avoid using {node.func.id}() as it can lead to code injection.")
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name in ['subprocess', 'os', 'sqlite3']:
                self.issues.append(f"Security: Importing {alias.name} can be risky if inputs are not sanitized.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module in ['subprocess', 'os', 'sqlite3']:
            self.issues.append(f"Security: Importing from {node.module} can be risky if inputs are not sanitized.")
        for alias in node.names:
            if alias.name in ['system', 'popen', 'subprocess', 'os', 'sqlite3']:
                self.issues.append(f"Security: Importing {alias.name} is blocked for execution safety.")
        self.generic_visit(node)

class DeepNestingVisitor(ast.NodeVisitor):
    def __init__(self):
        self.max_depth = 0
        self.current_depth = 0

    def generic_visit(self, node):
        if isinstance(node, (ast.If, ast.For, ast.While, ast.With, ast.Try)):
            self.current_depth += 1
            if self.current_depth > self.max_depth:
                self.max_depth = self.current_depth
            super().generic_visit(node)
            self.current_depth -= 1
        else:
            super().generic_visit(node)

class RecursionVisitor(ast.NodeVisitor):
    def __init__(self):
        self.recursion_detected = False
        self.current_function = None

    def visit_FunctionDef(self, node):
        old_function = self.current_function
        self.current_function = node.name
        self.generic_visit(node)
        self.current_function = old_function

    def visit_Call(self, node):
        if self.current_function:
            called_name = None
            if isinstance(node.func, ast.Name):
                called_name = node.func.id
            elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == "self":
                called_name = node.func.attr
                
            if called_name == self.current_function:
                self.recursion_detected = True
        self.generic_visit(node)

class ImportCounter(ast.NodeVisitor):
    def __init__(self):
        self.count = 0

    def visit_Import(self, node):
        self.count += len(node.names)
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        self.count += len(node.names)
        self.generic_visit(node)

class CodeIntelligence:
    @staticmethod
    def _call_gemini_api(
        api_key: str,
        code: str,
        language: str,
        workspace_files: list = None,
        filename: str = None,
        behavioral_stats: dict = None
    ) -> dict:
        import httpx
        import json
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        
        # Prepare context of other files
        files_context = ""
        if workspace_files:
            files_context = "Other files in the workspace:\n"
            for f in workspace_files:
                name = getattr(f, "name", f.get("name") if isinstance(f, dict) else "")
                if filename and name == filename:
                    continue
                f_code = getattr(f, "code", f.get("code") if isinstance(f, dict) else "")
                f_lang = getattr(f, "language", f.get("language") if isinstance(f, dict) else "")
                if name and f_code:
                    files_context += f"--- File: {name} ({f_lang}) ---\n{f_code}\n\n"
                    
        # Prepare context of typing telemetry behavior
        telemetry_context = ""
        if behavioral_stats:
            avg_wpm = behavioral_stats.get("avg_wpm", 0.0)
            pauses = behavioral_stats.get("pauses", 0)
            backspaces = behavioral_stats.get("backspaces", 0)
            telemetry_context = (
                f"User Typing Telemetry:\n"
                f"- Average WPM: {avg_wpm:.1f}\n"
                f"- Long Pauses: {pauses}\n"
                f"- Correction frequency (backspaces): {backspaces}\n\n"
                "Please analyze the user's typing telemetry in your response (e.g. if backspaces are high, "
                "recommend outlining code structures beforehand; if pauses are high, address potential "
                "algorithmic planning blockers or design hesitations).\n"
            )

        active_file_label = f"Active File: {filename}\n" if filename else ""

        prompt = f"""
You are an advanced AI code analyzer. Perform a detailed, context-aware analysis of the active file in context of the surrounding workspace files and the user's typing behavior telemetry.

{active_file_label}Active File Content ({language}):
```
{code}
```

{files_context}

{telemetry_context}
Return a valid JSON object matching the following structure exactly (do not output any markdown code blocks, just raw JSON):
{{
  "scores": {{
    "overall": 85.0,
    "efficiency": 80.0,
    "readability": 90.0,
    "maintainability": 85.0,
    "security": 95.0,
    "optimization": 80.0
  }},
  "strengths": [
    "Modular function layout",
    "Clean variable naming conventions"
  ],
  "weaknesses": [
    "Security: Plaintext password storage detected (or similar vulnerabilities if any)",
    "Deep nested conditionals in active code"
  ],
  "action_plan": [
    "Extract logic from nested conditions into separate routines",
    "Add logging for tracking data flow errors"
  ],
  "profile_summary": {{
    "title": "Master Software Engineer",
    "description": "Exhibits solid code structure and clear flow control."
  }},
  "learning_pathway": [
    {{
      "title": "Control Flow Optimization",
      "description": "Simplify multi-level branching to make execution paths cleaner."
    }},
    {{
      "title": "Security Hygiene",
      "description": "Sanitize inputs and protect API secrets."
    }}
  ]
}}
"""
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            r = httpx.post(url, json=payload, timeout=20.0)
            if r.status_code == 200:
                res_data = r.json()
                text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text.strip())
                return parsed
        except Exception as e:
            logger.error(f"Error calling Gemini API for code review: {e}")
        return None

    @staticmethod
    def analyze_code(
        code: str,
        language: str = "python",
        workspace_files: list = None,
        filename: str = None,
        behavioral_stats: dict = None
    ):
        import os
        logger.info(f"Analyzing code in language: {language}")
        
        # 1. Parse AST/Regex metrics deterministically (local parsing)
        local_metrics = CodeIntelligence._get_local_ast_metrics(code, language)
        
        # 2. Check for AI API key (online mode)
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if api_key:
            logger.info("AI API Key detected. Invoking online Gemini reviewer...")
            ai_result = CodeIntelligence._call_gemini_api(api_key, code, language, workspace_files, filename, behavioral_stats)
            if ai_result:
                # Merge local AST metrics with AI results for absolute precision
                ai_result["ast_metrics"] = local_metrics["ast_metrics"]
                ai_result["complexity_score"] = local_metrics["complexity_score"]
                ai_result["maintainability_index"] = local_metrics["maintainability_index"]
                return ai_result
                
        # 3. Fallback/Offline Mode: Smart dynamic simulator aware of workspace files
        logger.info("Running offline rules-based dynamic intelligence reviewer...")
        return CodeIntelligence._simulate_ai_review(code, language, local_metrics, workspace_files, filename, behavioral_stats)

    @staticmethod
    def _get_local_ast_metrics(code: str, language: str) -> dict:
        if language != "python":
            return CodeIntelligence._get_generic_metrics(code, language)
            
        try:
            tree = ast.parse(code)
            sec_visitor = SecurityVisitor()
            sec_visitor.visit(tree)
            nest_visitor = DeepNestingVisitor()
            nest_visitor.visit(tree)
            rec_visitor = RecursionVisitor()
            rec_visitor.visit(tree)
            imp_counter = ImportCounter()
            imp_counter.visit(tree)

            metrics = {
                "num_loops": 0,
                "num_functions": 0,
                "num_classes": 0,
                "num_imports": imp_counter.count,
                "recursion_detected": rec_visitor.recursion_detected,
                "max_nesting_depth": nest_visitor.max_depth,
                "security_issues": sec_visitor.issues
            }

            for node in ast.walk(tree):
                if isinstance(node, (ast.For, ast.While)):
                    metrics["num_loops"] += 1
                elif isinstance(node, ast.FunctionDef):
                    metrics["num_functions"] += 1
                elif isinstance(node, ast.ClassDef):
                    metrics["num_classes"] += 1

            lines = code.split('\n')
            total_lines = len(lines)
            comments = sum(1 for line in lines if line.strip().startswith('#'))
            
            complexity = cc_visit(code)
            avg_complexity = sum(c.complexity for c in complexity) / len(complexity) if complexity else 1.0
            
            try:
                mi_score = mi_visit(code, multi=True)
            except Exception:
                mi_score = 100.0

            maintainability = min(100.0, max(0.0, mi_score))
            readability = min(100.0, max(0.0, 50.0 + (comments / total_lines * 100.0) if total_lines else 100.0))
            efficiency = min(100.0, max(0.0, 100.0 - (metrics["num_loops"] * 5.0) - (nest_visitor.max_depth * 10.0)))
            security = min(100.0, max(0.0, 100.0 - (len(sec_visitor.issues) * 25.0)))
            optimization = min(100.0, max(0.0, 100.0 - (avg_complexity * 5.0)))

            return {
                "ast_metrics": metrics,
                "complexity_score": avg_complexity,
                "maintainability_index": mi_score,
                "subscores": {
                    "maintainability": maintainability,
                    "readability": readability,
                    "efficiency": efficiency,
                    "security": security,
                    "optimization": optimization
                }
            }
        except Exception as e:
            logger.error(f"Error parsing Python AST: {e}")
            return {
                "error": str(e),
                "ast_metrics": {"num_loops": 0, "num_functions": 0, "num_classes": 0, "num_imports": 0, "recursion_detected": False, "max_nesting_depth": 0, "security_issues": []},
                "complexity_score": 1.0,
                "maintainability_index": 100.0,
                "subscores": {"maintainability": 100.0, "readability": 100.0, "efficiency": 100.0, "security": 100.0, "optimization": 100.0}
            }

    @staticmethod
    def _get_generic_metrics(code: str, language: str) -> dict:
        lines = code.split('\n')
        total_lines = len(lines)
        
        comments = 0
        if language in ["c", "cpp", "java", "javascript"]:
            comments = sum(1 for line in lines if line.strip().startswith('//') or line.strip().startswith('/*') or line.strip().startswith('*'))
        else:
            comments = sum(1 for line in lines if line.strip().startswith('#'))

        num_loops = len(re.findall(r'\b(for|while)\s*\(', code))
        num_ifs = len(re.findall(r'\b(if)\s*\(', code))
        num_classes = len(re.findall(r'\bclass\s+\w+', code))
        
        if language == "java":
            num_functions = len(re.findall(r'(public|private|protected|static)\s+[\w<>]+\s+\w+\s*\(', code))
            num_imports = len(re.findall(r'\bimport\s+[\w\.\*]+;', code))
        elif language in ["c", "cpp"]:
            num_functions = len(re.findall(r'\b\w+\s+\w+\s*\(.*?\)\s*\{', code))
            num_imports = len(re.findall(r'#include\s+["<][\w\.]+[">]', code))
        elif language == "javascript":
            num_functions = len(re.findall(r'\bfunction\s+\w+|const\s+\w+\s*=\s*\(.*?\)\s*=>|\b\w+\s*\(.*?\)\s*\{', code))
            num_imports = len(re.findall(r'\bimport\s+.*?from\b|\brequire\s*\(', code))
        else:
            num_functions = len(re.findall(r'\bdef\s+\w+', code))
            num_imports = 0

        max_nesting = 0
        current_nesting = 0
        for char in code:
            if char == '{':
                current_nesting += 1
                max_nesting = max(max_nesting, current_nesting)
            elif char == '}':
                current_nesting = max(0, current_nesting - 1)

        recursion_detected = False
        if language in ["c", "cpp", "java"]:
            func_defs = re.findall(r'\b(\w+)\s*\(.*?\)\s*\{', code)
            for f in func_defs:
                if f != "main" and len(re.findall(rf'\b{f}\s*\(', code)) > 1:
                    recursion_detected = True
                    break

        security_issues = []
        if language in ["c", "cpp"]:
            if "gets(" in code or "strcpy(" in code or "sprintf(" in code:
                security_issues.append("Security: Use of unsafe C-string function gets() or strcpy(). Use fgets() or strncpy() instead.")
        if language == "java":
            if "Runtime.getRuntime().exec(" in code or "ProcessBuilder" in code:
                security_issues.append("Security: OS process execution. Sanitize system inputs.")

        complexity = float(1 + num_loops + num_ifs)
        
        readability = min(100.0, max(0.0, 50.0 + (comments / total_lines * 100.0) if total_lines else 100.0))
        efficiency = min(100.0, max(0.0, 100.0 - (num_loops * 5.0) - (max_nesting * 5.0)))
        maintainability = min(100.0, max(0.0, 100.0 - (complexity * 2.5)))
        security = min(100.0, max(0.0, 100.0 - (len(security_issues) * 25.0)))
        optimization = min(100.0, max(0.0, 100.0 - (complexity * 3.0)))

        metrics = {
            "num_loops": num_loops,
            "num_functions": num_functions,
            "num_classes": num_classes,
            "num_imports": num_imports,
            "recursion_detected": recursion_detected,
            "max_nesting_depth": max_nesting,
            "security_issues": security_issues
        }

        return {
            "ast_metrics": metrics,
            "complexity_score": complexity,
            "maintainability_index": maintainability,
            "subscores": {
                "maintainability": maintainability,
                "readability": readability,
                "efficiency": efficiency,
                "security": security,
                "optimization": optimization
            }
        }

    @staticmethod
    def _simulate_ai_review(
        code: str,
        language: str,
        local_metrics: dict,
        workspace_files: list = None,
        filename: str = None,
        behavioral_stats: dict = None
    ) -> dict:
        ast_m = local_metrics["ast_metrics"]
        complexity = local_metrics["complexity_score"]
        mi = local_metrics["maintainability_index"]
        subscores = local_metrics["subscores"]
        
        # Calculate overall score
        overall = (subscores["maintainability"] + subscores["readability"] + subscores["efficiency"] + 
                   subscores["security"] + subscores["optimization"]) / 5.0
        
        # Check cross-references / imports in workspace files
        referenced_files = []
        other_files = []
        if workspace_files:
            for f in workspace_files:
                name = getattr(f, "name", f.get("name") if isinstance(f, dict) else "")
                if filename and name == filename:
                    continue
                if name:
                    base_name = name.split(".")[0]
                    # Check if the active code references this file's base name
                    if base_name and base_name in code:
                        referenced_files.append(name)
                    else:
                        other_files.append(name)

        # Get typing telemetry variables
        avg_wpm = 0.0
        pauses = 0
        backspaces = 0
        if behavioral_stats:
            avg_wpm = behavioral_stats.get("avg_wpm", 0.0)
            pauses = behavioral_stats.get("pauses", 0)
            backspaces = behavioral_stats.get("backspaces", 0)

        display_name = filename if filename else f"source.{'py' if language == 'python' else language}"

        # 1. Strengths
        strengths = []
        if subscores["security"] >= 100.0:
            strengths.append(f"Security: Code in '{display_name}' checked cleanly with zero risky system invocations or subprocess calls.")
        if subscores["efficiency"] >= 85.0:
            strengths.append(f"Efficiency: Compact control loops and linear execution paths detected in '{display_name}'.")
        if ast_m["num_functions"] >= 2:
            strengths.append(f"Modularity: Partitioned cleanly into {ast_m['num_functions']} helper functions inside '{display_name}'.")
        if ast_m.get("recursion_detected"):
            strengths.append(f"Recursion used: suitable for divide-and-conquer processing in '{display_name}'.")
        if referenced_files:
            strengths.append(f"Workspace Integration: '{display_name}' correctly imports/calls module dependencies: {', '.join(referenced_files)}.")
        if avg_wpm >= 60.0 and mi >= 75.0:
            strengths.append(f"Cognitive Flow: Steady translation velocity ({avg_wpm:.1f} WPM) with high structural logic quality.")
        
        if not strengths:
            strengths.append(f"Code in '{display_name}' parses correctly with standardized syntactic layout.")
            
        # 2. Weaknesses & Vulnerabilities
        weaknesses = []
        if complexity > 5.0:
            weaknesses.append(f"High Cyclomatic Complexity ({complexity:.1f}) in '{display_name}': Code contains too many branches. Extract helpers.")
        if ast_m["max_nesting_depth"] > 3:
            weaknesses.append(f"Deep logical nesting ({ast_m['max_nesting_depth']} levels) in '{display_name}': Can cause readability degradation.")
        if ast_m["security_issues"]:
            for issue in ast_m["security_issues"]:
                weaknesses.append(issue)
        if mi < 60.0:
            weaknesses.append(f"Low Maintainability Index ({mi:.1f}) in '{display_name}': Hard to refactor. Write docs and clear loops.")
        
        # Behavioral telemetry weaknesses
        if backspaces > 15:
            weaknesses.append(f"High Correction Rate: {backspaces} backspaces recorded while editing '{display_name}'. Suggests design-on-the-fly; plan logic before writing.")
        if pauses > 5:
            weaknesses.append(f"Cognitive Stalling: {pauses} long pauses detected. Suggests hesitation or logic blocker while designing '{display_name}'.")
            
        if not referenced_files and other_files:
            weaknesses.append(f"Workspace: Monolithic setup. Surrounding modules like '{other_files[0]}' are ignored by '{display_name}'. Try modularizing.")

        if not weaknesses:
            weaknesses.append("No critical architectural weaknesses or security alerts found.")

        # 3. Action Plan / Recommendations
        action_plan = []
        if ast_m["security_issues"]:
            action_plan.append("Sanitize inputs and replace risky process wrappers with library methods.")
        if complexity > 5.0:
            action_plan.append(f"Extract block routines inside '{display_name}' conditionals into standalone functions.")
        if ast_m["max_nesting_depth"] > 3:
            action_plan.append("Rewrite deep if-else structures using early exit statements (guard clauses).")
        
        # Telemetry behavior action plans
        if backspaces > 15:
            action_plan.append(f"Outline method signatures or flowcharts for '{display_name}' before writing code to reduce backspace corrections.")
        if pauses > 5:
            action_plan.append(f"Decompose the current complex algorithms in '{display_name}' into smaller logical units to minimize pauses.")

        if other_files and not referenced_files:
            action_plan.append(f"Import reusable utility bindings from workspace file: '{other_files[0]}'.")
        
        if not action_plan:
            action_plan.append("Implement boundary condition tests to ensure runtime correctness.")
            
        # 4. Profile Summary
        if avg_wpm >= 75.0:
            title = "High-Velocity Coder"
        elif avg_wpm >= 40.0:
            title = "Steady Pragmatist"
        elif avg_wpm > 0.0:
            title = "Deliberate Architect"
        else:
            title = "Optimal Logical Architect" if overall >= 80.0 else "Developing Thinker"

        if overall >= 85.0 and avg_wpm >= 60.0:
            title = "Elite Systems Architect"
        elif overall < 55.0 and backspaces > 15:
            title = "Iterative Refiner"

        desc = f"Currently coding '{display_name}' in {language.capitalize()}."
        if avg_wpm > 0.0:
            desc += f" Working at a velocity of {avg_wpm:.1f} WPM with {backspaces} corrections and {pauses} pauses."
            if backspaces > 15:
                desc += " High correction activity suggests you are resolving structural logic on the fly."
            elif pauses > 5:
                desc += " Frequent planning pauses indicate careful consideration of implementation paths."
            else:
                desc += " Consistent typing pace and smooth editing flow observed."
        else:
            desc += " Focuses on solving direct constraints. Telemetry will calibrate further once you begin typing in the editor."

        # 5. Learning Pathway Guide
        learning_pathway = []
        if avg_wpm > 0.0:
            learning_pathway.append({
                "title": "Cognitive Rhythm & Editing Pace",
                "description": f"Currently working on '{display_name}' at {avg_wpm:.1f} WPM with {backspaces} correction events. Pace typing to maintain logical focus."
            })
            
        if pauses > 3:
            learning_pathway.append({
                "title": "Algorithmic Pause Management",
                "description": f"We detected {pauses} pauses during editing. Consider defining stubs or outlining logic boundaries before coding to stay in a fluent state."
            })

        learning_pathway.append({
            "title": "Architectural Cleanliness & Formatting",
            "description": f"Current cyclomatic complexity in '{display_name}' is {complexity:.1f}. Try extracting deep logical blocks to keep the maintainability index above 80/100."
        })
        learning_pathway.append({
            "title": "Data Flow & Loop Efficiency",
            "description": f"Code in '{display_name}' implements {ast_m['num_loops']} loop iterations. Optimize loops by caching bounds and avoiding quadratic lookups."
        })

        if ast_m["security_issues"] or len(weaknesses) > 1:
            learning_pathway.append({
                "title": "Defensive Coding & Security",
                "description": "Examine variables and system interfaces closely to guarantee inputs are safe from buffer or injection risks."
            })
            
        return {
            "ast_metrics": ast_m,
            "complexity_score": complexity,
            "maintainability_index": mi,
            "strengths": strengths[:5],
            "weaknesses": weaknesses[:5],
            "action_plan": action_plan[:5],
            "profile_summary": {
                "title": title,
                "description": desc
            },
            "learning_pathway": learning_pathway,
            "scores": {
                "overall": overall,
                "efficiency": subscores["efficiency"],
                "readability": subscores["readability"],
                "maintainability": subscores["maintainability"],
                "security": subscores["security"],
                "optimization": subscores["optimization"]
            }
        }

    @staticmethod
    def detect_weaknesses(analysis_results, behavioral_data=None):
        """Dynamic weakness detection used by router submissions"""
        weaknesses = []
        ast_m = analysis_results.get("ast_metrics", {})
        complexity = analysis_results.get("complexity_score", 0.0)
        mi_score = analysis_results.get("maintainability_index", 100.0)
        
        if complexity > 5.0:
            weaknesses.append("High Cyclomatic Complexity: Break your functions down to be more modular.")
        if ast_m.get("max_nesting_depth", 0) > 3:
            weaknesses.append(f"Deep nesting detected (depth {ast_m['max_nesting_depth']}): Flatten control paths using early returns.")
        if ast_m.get("security_issues"):
            for issue in ast_m["security_issues"]:
                weaknesses.append(issue)
        if mi_score < 60.0:
            weaknesses.append("Low Maintainability: Refactor compound conditions and document classes/functions.")
        if ast_m.get("num_loops", 0) > 2:
            weaknesses.append("High Loop Density: Verify nested loops don't cause quadratic time O(N^2) bottlenecks.")
            
        if not weaknesses:
            weaknesses.append("No critical weaknesses detected! Code structure is solid.")
            
        return weaknesses[:5]

    @staticmethod
    def detect_weaknesses_metrics(metrics, complexity_score, maintainability_index):
        """Internal static weakness generator"""
        weaknesses = []
        if complexity_score > 5.0:
            weaknesses.append("High Cyclomatic Complexity: Break logic down into smaller, modular helper functions.")
        if metrics.get("max_nesting_depth", 0) > 3:
            weaknesses.append(f"Deep nesting (depth {metrics['max_nesting_depth']}): Restructure nested blocks using guard clauses.")
        if metrics.get("security_issues"):
            for issue in metrics["security_issues"]:
                weaknesses.append(issue)
        if maintainability_index < 60.0:
            weaknesses.append("Low Maintainability Index: Refactor monolithic code sections and add comments.")
        if metrics.get("num_loops", 0) > 2:
            weaknesses.append("High Loop Density: Consider caching values or restructuring logic to avoid redundant iterations.")
        
        if not weaknesses:
            weaknesses.append("No critical weaknesses detected! Structure looks solid.")
            
        return weaknesses[:5]

    @staticmethod
    def detect_strengths(metrics, scores):
        strengths = []
        if scores.get("security", 0.0) >= 100.0:
            strengths.append("No risky execution or unsafe input APIs were detected.")
        if scores.get("efficiency", 0.0) >= 80.0:
            strengths.append("Control flow is compact enough for fast execution.")
        if metrics.get("num_functions", 0) > 0:
            strengths.append("The solution is cleanly structured into modular functions.")
        if metrics.get("recursion_detected"):
            strengths.append("Recursion used: suitable for divide-and-conquer processing.")
        if metrics.get("num_classes", 0) > 0:
            strengths.append("Object-oriented structure supports encapsulation and extension.")
            
        if not strengths:
            strengths.append("Code is cleanly structured enough to proceed with further optimization.")
            
        return strengths[:5]

    @staticmethod
    def build_action_plan(metrics, complexity_score, maintainability_index, security_issues):
        plan = []
        if security_issues:
            plan.append("Replace risky system functions first, then rerun security analysis.")
        if complexity_score > 5.0:
            plan.append("Extract sub-branches of logic out into dedicated single-responsibility helper functions.")
        if metrics.get("max_nesting_depth", 0) > 3:
            plan.append("Use early returns or guard clauses to flatten multi-level if/for statements.")
        if metrics.get("num_loops", 0) > 2:
            plan.append("Check if nested iterations can be combined or optimized using dict/set lookup.")
        if maintainability_index < 60.0:
            plan.append("Introduce docstrings and descriptive naming conventions to clarify code intent.")
            
        if not plan:
            plan.append("Incorporate edge case unit tests to solidify and validate current logic.")
            
        return plan[:5]
