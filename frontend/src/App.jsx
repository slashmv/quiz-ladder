// frontend/src/App.jsx — Sidebar + Home (square cards) + Create Test + Play (board+quiz) with smooth animation
import { useEffect, useMemo, useRef, useState } from "react";

// Build a 10x10 snake-numbered board starting bottom-left (1..100)
function buildBoard() {
  const rows = [];
  let num = 1;
  for (let r = 0; r < 10; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) row.push(num++);
    if (r % 2 === 1) row.reverse();
    rows.unshift(row);
  }
  return rows;
}

// ---------------------- CREATE TEST SCREEN ----------------------
function CreateTest({ onSaved }) {
  const [testId, setTestId] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);

  const emptyQ = {
    id: null,
    type: "single",
    prompt: "",
    options: [
      { id: "a", text: "", points: 1, is_correct: false },
      { id: "b", text: "", points: 1, is_correct: false },
    ],
  };
  const [editing, setEditing] = useState(structuredClone(emptyQ));
  const [editingIndex, setEditingIndex] = useState(-1); // -1 => new question
  const [msg, setMsg] = useState("");

  function resetEditor() {
    setEditing(structuredClone(emptyQ));
    setEditingIndex(-1);
  }

  function addOption() {
    const next = structuredClone(editing);
    const nextChar = String.fromCharCode(97 + next.options.length); // a,b,c,...
    next.options.push({ id: nextChar, text: "", points: 1, is_correct: false });
    setEditing(next);
  }

  function removeOption(idx) {
    const next = structuredClone(editing);
    next.options.splice(idx, 1);
    next.options.forEach((o, i) => (o.id = String.fromCharCode(97 + i)));
    setEditing(next);
  }

  function updateOption(idx, patch) {
    const next = structuredClone(editing);
    next.options[idx] = { ...next.options[idx], ...patch };
    setEditing(next);
  }

  function editQuestion(i) {
    const q = questions[i];
    setEditing(structuredClone(q));
    setEditingIndex(i);
    setMsg("");
  }

  function saveQuestion() {
    if (!editing.prompt.trim()) return setMsg("Please enter a question prompt.");
    if (editing.options.length < 2) return setMsg("Add at least 2 options.");
    if (!editing.options.some((o) => o.is_correct)) return setMsg("Mark at least one correct option.");
    if (editing.options.some((o) => !o.text.trim())) return setMsg("Every option needs text.");
    if (editing.options.some((o) => Number(o.points) === 0 || Number.isNaN(Number(o.points))))
      return setMsg("Points must be non-zero numbers.");

    const q = structuredClone(editing);
    if (editingIndex === -1) {
      q.id = questions.length + 1;
      setQuestions([...questions, q]);
    } else {
      const next = [...questions];
      next[editingIndex] = q;
      setQuestions(next);
    }
    resetEditor();
    setMsg("Question saved.");
  }

  async function saveTest() {
    setMsg("");
    if (!testId.trim()) return setMsg("Please enter a Test ID (filename).");
    if (!title.trim()) return setMsg("Please enter a Title.");
    if (questions.length === 0) return setMsg("Add at least one question.");

    try {
      const res = await fetch("http://localhost:5001/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testId.trim(), title: title.trim(), questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setMsg("✅ Test saved.");
      onSaved?.();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  return (
    <section className="w-full max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">Create Test</h1>

      {/* Test Meta */}
      <div className="p-4 bg-white rounded-xl shadow mb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Test ID (filename, no .json)</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              placeholder="general_knowledge_v2"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Title</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="General Knowledge Demo"
            />
          </div>
        </div>
      </div>

      {/* Question Editor */}
      <div className="p-4 bg-white rounded-xl shadow mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="font-medium">
            {editingIndex === -1 ? "New Question" : `Edit Question #${editingIndex + 1}`}
          </div>
          {msg && <div className="text-sm text-gray-600">{msg}</div>}
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="text-sm text-gray-600">Question</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={editing.prompt}
              onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Type</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value })}
            >
              <option value="single">single</option>
              <option value="multi">multi</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-2">Options</div>
          <div className="space-y-2">
            {editing.options.map((o, i) => (
              <div key={o.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    placeholder={`Option ${o.id.toUpperCase()}`}
                    value={o.text}
                    onChange={(e) => updateOption(i, { text: e.target.value })}
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    className="w-full border rounded-md px-3 py-2"
                    value={o.points}
                    onChange={(e) => updateOption(i, { points: Number(e.target.value) })}
                  />
                </div>
                <label className="col-span-3 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={o.is_correct}
                    onChange={(e) => updateOption(i, { is_correct: e.target.checked })}
                  />
                  <span className="text-sm">is_correct</span>
                </label>
                <div className="col-span-1 text-right">
                  {editing.options.length > 2 && (
                    <button className="px-2 py-1 border rounded-md" onClick={() => removeOption(i)}>
                      −
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <button className="px-3 py-2 rounded-lg border" onClick={addOption}>
              + Add Option
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={saveQuestion}>
            Save Question
          </button>
          <button className="px-4 py-2 rounded-lg border" onClick={resetEditor}>
            Clear Editor
          </button>
        </div>
      </div>

      {/* Questions list */}
      <div className="p-4 bg-white rounded-xl shadow mb-6">
        <div className="font-medium mb-3">Questions in this Test</div>
        {questions.length === 0 ? (
          <div className="text-sm text-gray-600">No questions yet.</div>
        ) : (
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Q{i + 1}: {q.prompt}</div>
                  <div className="text-gray-600">Type: {q.type} — {q.options.length} options</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border rounded-md" onClick={() => editQuestion(i)}>
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Save whole test */}
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-lg bg-green-600 text-white" onClick={saveTest}>
          Save Test
        </button>
      </div>
    </section>
  );
}

// ---------------------- MAIN APP ----------------------
export default function App() {
  // NAV
  const [view, setView] = useState("home"); // 'home' | 'play' | 'create'
  const [tests, setTests] = useState([]);
  const [activeTest, setActiveTest] = useState(null);

  // QUIZ/PLAY STATE
  const [quiz, setQuiz] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  // ANIMATION
  const [animPos, setAnimPos] = useState(0);
  const board = useMemo(buildBoard, []);

  // HOME (tests list)
  useEffect(() => {
    fetch("http://localhost:5001/api/tests")
      .then((r) => r.json())
      .then(setTests)
      .catch(console.error);
  }, []);

  function refreshTestsAndGoHome() {
    fetch("http://localhost:5001/api/tests")
      .then((r) => r.json())
      .then((list) => {
        setTests(list);
        setView("home");
      })
      .catch(console.error);
  }

  function startTest(test) {
    setActiveTest(test);
    setQuiz(null);
    setQIndex(0);
    setSelected(new Set());
    setAnswers({});
    setFinished(false);
    setAnimPos(0);
    setView("play");
    fetch(`http://localhost:5001/api/quiz/${test.id}`)
      .then((r) => r.json())
      .then((data) => {
        setQuiz(data);
        if (data?.questions?.length) {
          const first = data.questions[0];
          const prev = answers[first.id];
          setSelected(new Set(prev || []));
        }
      })
      .catch(console.error);
  }

  // SAFE DERIVEDS
  const isLoading = view === "play" && !quiz;
  const questions = quiz?.questions ?? [];
  const target = quiz?.golden ?? 0;
  const current = questions[qIndex] ?? { id: 0, type: "single", options: [], prompt: "" };
  const isMulti = (q) => q.type === "multi";

  // QUIZ HELPERS
  function toggleOption(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isMulti(current)) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }

  function pointsForSelection(q, selSet) {
    let points = 0;
    for (const o of q.options || []) if (selSet.has(o.id)) points += o.points;
    return points;
  }

  function computeProgress(uptoExclusive) {
    let position = 1; // NOTE: starting from 1 keeps the dot on cell 1 initially
    for (let i = 0; i < Math.min(uptoExclusive, questions.length); i++) {
      const q = questions[i];
      const sel = new Set(answers[q.id] || []);
      position += pointsForSelection(q, sel);
    }
    return { position };
  }

  const answeredCount = (() => {
    let count = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!answers[q.id] || answers[q.id].length === 0) break;
      count++;
    }
    return count;
  })();

  const { position } = finished
    ? computeProgress(questions.length)
    : computeProgress(answeredCount);

  // SMOOTH ANIMATION (rAF, ease-out)
  useEffect(() => {
    if (view !== "play") return;
    let raf;
    const start = performance.now();
    const from = animPos,
      to = position;
    if (from === to) return;
    const dist = Math.abs(to - from);
    const duration = Math.min(1200, 200 + dist * 35);
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setAnimPos(from + (to - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [position, view]);

  // BOARD GEOMETRY
  const gridRef = useRef(null);
  const [cellPx, setCellPx] = useState(0);
  const [gapPx, setGapPx] = useState(4);
  useEffect(() => {
    function measure() {
      const el = gridRef.current;
      if (!el) return;
      const firstCell = el.querySelector(".board-cell");
      if (firstCell) setCellPx(firstCell.getBoundingClientRect().width);
      const styles = getComputedStyle(el);
      setGapPx(parseFloat(styles.gap || styles.columnGap || "4") || 4);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function rcFromNumber(n) {
    n = Math.max(1, Math.min(100, Math.round(n)));
    const idx = n - 1;
    const rowFromBottom = Math.floor(idx / 10);
    const posInRow = idx % 10;
    const leftToRight = rowFromBottom % 2 === 0;
    const col = leftToRight ? posInRow : 9 - posInRow;
    const rowTop = 9 - rowFromBottom;
    return { rowTop, col };
  }

  function pixelForNumber(f) {
    if (!gridRef.current || cellPx === 0) return { x: 0, y: 0 };
    const fClamped = Math.max(1, Math.min(100, f));
    const n0 = Math.floor(fClamped);
    const n1 = Math.min(100, Math.max(1, n0 + (fClamped === n0 ? 0 : fClamped > n0 ? 1 : -1)));
    const t = Math.abs(fClamped - n0);
    const a = rcFromNumber(n0),
      b = rcFromNumber(n1);
    const step = cellPx + gapPx;
    const ax = a.col * step + cellPx / 2,
      ay = a.rowTop * step + cellPx / 2;
    const bx = b.col * step + cellPx / 2,
      by = b.rowTop * step + cellPx / 2;
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
  }

  const dot = pixelForNumber(animPos <= 0 ? 1 : animPos);
  const currentCell = Math.max(1, Math.min(100, Math.round(animPos <= 0 ? 1 : animPos)));

  // NAV ACTIONS
  function submitCurrent() {
    if (selected.size === 0) return;
    setAnswers((prev) => {
      const merged = { ...prev, [current.id]: Array.from(selected) };
      const nextIndex = qIndex + 1;
      if (nextIndex < questions.length) {
        setQIndex(nextIndex);
        const nextQ = questions[nextIndex];
        setSelected(new Set(merged[nextQ.id] || []));
        setFinished(false);
      } else {
        const allAnswered = questions.every((q) => (merged[q.id] || []).length > 0);
        setFinished(allAnswered);
      }
      return merged;
    });
  }

  function goPrev() {
    if (qIndex === 0) return;
    setAnswers((prev) => {
      const merged = selected.size > 0 ? { ...prev, [current.id]: Array.from(selected) } : prev;
      const idx = qIndex - 1;
      setQIndex(idx);
      const prevQ = questions[idx];
      setSelected(new Set(merged[prevQ.id] || []));
      setFinished(false);
      return merged;
    });
  }

  function goNext() {
    const idx = qIndex + 1;
    if (idx < questions.length) {
      setQIndex(idx);
      const nextQ = questions[idx];
      setSelected(new Set(answers[nextQ.id] || []));
      setFinished(false);
    } else {
      setFinished(questions.every((q) => (answers[q.id] || []).length > 0));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // UI SUBCOMPONENTS
  function BoardCell({ cell, isGolden, isHere }) {
    const base =
      "board-cell relative aspect-square border rounded-md flex items-center justify-center transition-colors";
    const cellClass = [
      base,
      isHere
        ? "bg-blue-50 border-blue-500 ring-2 ring-blue-300"
        : isGolden
        ? "bg-yellow-50 border-yellow-500"
        : "bg-white border-gray-200",
    ].join(" ");
    return (
      <div className={cellClass}>
        <span className="text-[11px] sm:text-xs font-medium text-gray-700 z-10">{cell}</span>
        {isGolden && (
          <span
            className="absolute top-1 right-1 text-[10px] px-1 py-0.5 rounded bg-yellow-400/90 text-black z-10"
            title="Golden Number"
          >
            ★
          </span>
        )}
      </div>
    );
  }

  const statusWhilePlaying =
    position === target ? (
      <span className="text-green-700">(perfect)</span>
    ) : position > target ? (
      <span>(overshoot by {position - target})</span>
    ) : (
      <span>(undershoot by {target - position})</span>
    );

  const showWin = finished && position === target;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 flex-col border-r bg-white">
        <div className="p-4 text-lg font-semibold">Menu</div>
        <nav className="p-2 space-y-1">
          <button
            className={`w-full text-left px-3 py-2 rounded-lg ${
              view === "home" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => setView("home")}
          >
            Home
          </button>
          <button
            className={`w-full text-left px-3 py-2 rounded-lg ${
              view === "create" ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
            onClick={() => setView("create")}
          >
            Create Test
          </button>
        </nav>
        <div className="mt-auto p-3 text-xs text-gray-500">Quiz Ladders</div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6">
        {/* Mobile top bar */}
        <div className="md:hidden mb-4 flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border ${view === "home" ? "bg-gray-900 text-white" : ""}`}
            onClick={() => setView("home")}
          >
            Home
          </button>
          <button
            className={`px-3 py-2 rounded-lg border ${view === "create" ? "bg-gray-900 text-white" : ""}`}
            onClick={() => setView("create")}
          >
            Create
          </button>
        </div>

        {view === "home" && (
          <section>
            <h1 className="text-2xl font-semibold mb-4">Available Tests</h1>
            {tests.length === 0 ? (
              <div className="text-sm text-gray-600">
                No tests found in the <code>tests/</code> folder.
              </div>
            ) : (
              <ul className="grid gap-8 grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
                {tests.map((t) => (
                  <li key={t.id} className="w-full h-full relative bg-white rounded-xl shadow overflow-hidden">
                    <div className="aspect-square" />
                    <div className="absolute inset-0 p-4 flex flex-col">
                      <div>
                        <div className="font-medium leading-tight">{t.title}</div>
                        <div className="text-sm text-gray-600">{t.num_questions} questions</div>
                      </div>
                      <button
                        className="mt-auto px-3 py-2 rounded-lg bg-blue-600 text-white"
                        onClick={() => startTest(t)}
                      >
                        Start
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === "create" && (
          <CreateTest onSaved={refreshTestsAndGoHome} />
        )}

        {view === "play" && (
          <section className="w-full max-w-5xl mx-auto">
            {!isLoading && (
              <>
                <h2 className="text-2xl font-semibold mb-1">{quiz.title}</h2>
                <div className="text-sm text-gray-600">
                  Target (Golden): <span className="font-semibold">{target}</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Square: {position} {statusWhilePlaying}
                </div>
              </>
            )}

            {/* BOARD */}
            <div className="mb-6">
              <div className="p-3 bg-white rounded-xl shadow">
                <div className="font-medium mb-3">Board</div>
                <div className="w-full flex justify-center">
                  <div
                    ref={gridRef}
                    className="relative grid grid-cols-10 gap-1 select-none"
                    style={{ width: "min(100%, 720px)" }}
                  >
                    {board.flat().map((cell, idx) => {
                      const isGolden = cell === target;
                      const isHere = cell === currentCell;
                      return (
                        <BoardCell key={idx} cell={cell} isGolden={isGolden} isHere={isHere} />
                      );
                    })}
                    <div
                      className="pointer-events-none absolute rounded-full bg-blue-600 shadow z-20"
                      style={{
                        width: 12,
                        height: 12,
                        transform: `translate(${Math.max(0, dot.x - 6)}px, ${Math.max(0, dot.y - 6)}px)`,
                        transition: "transform 40ms linear",
                      }}
                      title="Player"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Golden cell = ★. DOT glides smoothly; current tile is highlighted.
                </div>
              </div>
            </div>

            {/* QUIZ CARD */}
            <div className="p-4 bg-white rounded-xl shadow">
              {isLoading ? (
                <div className="p-6">Loading…</div>
              ) : !finished ? (
                <>
                  <div className="font-medium mb-3">
                    Q{qIndex + 1}/{questions.length}: {current.prompt}
                  </div>
                  <div className="space-y-2">
                    {(current.options || []).map((o) => {
                      const checked = selected.has(o.id);
                      return (
                        <label
                          key={o.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {isMulti(current) ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOption(o.id)}
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`opt-${current.id}`}
                                checked={checked}
                                onChange={() => toggleOption(o.id)}
                              />
                            )}
                            <span>{o.text}</span>
                          </div>
                          <span className="text-xs px-2 py-1 border rounded-md">{o.points} pts</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={goPrev}
                      disabled={qIndex === 0}
                      className={`px-3 py-2 rounded-lg border ${
                        qIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={submitCurrent}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                    >
                      Save & Next
                    </button>
                    <button
                      onClick={goNext}
                      disabled={
                        !answers[current.id] ||
                        answers[current.id].length === 0 ||
                        qIndex === questions.length - 1
                      }
                      className={`px-3 py-2 rounded-lg border ${
                        !answers[current.id] ||
                        answers[current.id].length === 0 ||
                        qIndex === questions.length - 1
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Next →
                    </button>
                    <button onClick={clearSelection} className="px-3 py-2 rounded-lg border">
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-medium mb-2">Results</div>
                  <p className="mb-2">Final square: {position} / Golden: {target}</p>
                  {position === target ? (
                    <p className="text-green-700">
                      Perfect. You matched the Golden Number — all answers correct set.
                    </p>
                  ) : position > target ? (
                    <p className="text-amber-700">
                      You overshot by {position - target}. Something in your answers wasn’t correct.
                    </p>
                  ) : (
                    <p className="text-red-700">
                      You undershot by {target - position}. Something in your answers wasn’t correct.
                    </p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button onClick={() => setFinished(false)} className="px-4 py-2 rounded-lg border">
                      Go Back & Edit
                    </button>
                    <button
                      onClick={() => {
                        setQIndex(0);
                        setSelected(new Set(answers[questions[0].id] || []));
                        setFinished(false);
                      }}
                      className="px-4 py-2 rounded-lg border"
                    >
                      Review From Start
                    </button>
                    <button
                      onClick={() => {
                        setQIndex(0);
                        setSelected(new Set());
                        setAnswers({});
                        setFinished(false);
                        setAnimPos(0);
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-800 text-white"
                    >
                      Restart
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Win Popup */}
        {showWin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl p-6 shadow-xl w-[min(92vw,480px)] text-center">
              <div className="text-2xl font-semibold mb-2">You hit the Golden Number! ✨</div>
              <div className="text-sm text-gray-600 mb-4">Final square: {position} / Golden: {target}</div>
              <div className="flex justify-center gap-3">
                <button className="px-4 py-2 rounded-lg border" onClick={() => setFinished(false)}>
                  Review
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-800 text-white"
                  onClick={() => {
                    setQIndex(0);
                    setSelected(new Set());
                    setAnswers({});
                    setFinished(false);
                    setAnimPos(0);
                  }}
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
