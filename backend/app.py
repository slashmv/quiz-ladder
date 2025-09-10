# backend/app.py
import json
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

TESTS_DIR = Path(__file__).resolve().parent / "tests"
TESTS_DIR.mkdir(exist_ok=True)

def read_json(p: Path) -> dict:
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def compute_golden_number(quiz: dict) -> int:
    total = 0
    for q in quiz.get("questions", []):
        for o in q.get("options", []):
            if o.get("is_correct"):
                total += o.get("points", 0)
    return int(total)

@app.get("/api/tests")
def list_tests():
    items = []
    for f in sorted(TESTS_DIR.glob("*.json")):
        try:
            data = read_json(f)
            items.append({
                "id": f.stem,                          # filename without .json
                "title": data.get("title", f.stem),
                "num_questions": len(data.get("questions", []))
            })
        except Exception:
            # Skip malformed files but show something useful
            items.append({
                "id": f.stem,
                "title": f.stem + " (invalid json)",
                "num_questions": 0
            })
    return jsonify(items)

@app.get("/api/quiz/<test_id>")
def get_quiz(test_id: str):
    p = TESTS_DIR / f"{test_id}.json"
    if not p.exists():
        return jsonify({"error": "test not found", "id": test_id}), 404
    quiz = read_json(p)
    golden = compute_golden_number(quiz)
    return jsonify({
        "id": test_id,
        "title": quiz.get("title", test_id),
        "questions": quiz.get("questions", []),
        "golden": golden
    })
@app.post("/api/tests")
def create_or_update_test():
    data = request.get_json(silent=True) or {}
    test_id = (data.get("id") or "").strip()
    title = (data.get("title") or "").strip()
    questions = data.get("questions") or []

    if not test_id:
        return jsonify({"error": "Missing 'id' (filename without .json)"}), 400
    if not title:
        return jsonify({"error": "Missing 'title'"}), 400
    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({"error": "Questions must be a non-empty list"}), 400

    # Basic validation + enforce non-zero points
    for i, q in enumerate(questions, start=1):
        if q.get("type") not in ("single", "multi"):
            return jsonify({"error": f"Question {i}: 'type' must be 'single' or 'multi'"}), 400
        opts = q.get("options") or []
        if len(opts) < 2:
            return jsonify({"error": f"Question {i}: needs at least 2 options"}), 400
        any_correct = False
        for o in opts:
            pts = o.get("points")
            if not isinstance(pts, (int, float)) or pts == 0:
                return jsonify({"error": f"Question {i} option {o.get('id')}: 'points' must be non-zero number"}), 400
            if o.get("is_correct"):
                any_correct = True
        if not any_correct:
            return jsonify({"error": f"Question {i}: at least one option must be marked is_correct"}), 400

    out = {"title": title, "questions": questions}
    p = TESTS_DIR / f"{test_id}.json"
    try:
        p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        return jsonify({"error": f"Failed to save: {e}"}), 500

    return jsonify({"ok": True, "saved": str(p)}), 200
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
