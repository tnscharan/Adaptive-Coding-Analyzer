import os
import json

output_dir = "saved_programs"
files_to_inject = []

for filename in sorted(os.listdir(output_dir)):
    path = os.path.join(output_dir, filename)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    ext = filename.split(".")[-1].lower()
    lang = "python"
    if ext == "java":
        lang = "java"
    elif ext == "c":
        lang = "c"
    elif ext == "cpp":
        lang = "cpp"
        
    files_to_inject.append({
        "id": f"prog_{filename.split('.')[0]}",
        "name": filename,
        "code": content,
        "language": lang
    })

js_code = f"localStorage.setItem('acpis:workspace:files', JSON.stringify({json.dumps(files_to_inject)}));\n"
js_code += f"localStorage.setItem('acpis:workspace:activeFileId', '{files_to_inject[0]['id']}');\n"
js_code += "location.reload();\n"

scratch_dir = os.path.join(os.getcwd(), "scratch")
os.makedirs(scratch_dir, exist_ok=True)
js_path = os.path.join(scratch_dir, "inject_programs.js")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_code)

print(f"Generated injector script inside {js_path}")
