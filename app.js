// Huddle Up — app logic

const LOS = 340;
const VB_W = 900;
const VB_H = 470;

const POS_X = {
  normal: { X: 60, B: 210, A: 690, Y: 840, F: 425 },
  tripsRight: { X: 60, B: 650, A: 745, Y: 840, F: 425 },
};

const OL_X = [370, 410, 450, 490, 530];
const Q_POS = [450, 378];
const F_POS = [425, 408];

// Internal geometry keys (X/B/Y/A/F/Q) never show up in the UI — this maps
// each one to the short label drawn on the diagram (WR/SR/RB/QB).
const POS_ABBR = { X: "WR", Y: "WR", B: "SR", A: "SR", F: "RB", Q: "QB" };

function pt(x, y) { return `${x},${y}`; }

const ROUTE_BUILDERS = {
  hitch(x, dir, depth = 7) {
    const d = 45 + depth * 13;
    return [[x, LOS], [x, LOS - d], [x + dir * -18, LOS - d + 14]];
  },
  slant(x, dir, depth = 3) {
    const stem = 20 + depth * 6;
    return [[x, LOS], [x, LOS - stem], [x + dir * -95, LOS - stem - 60]];
  },
  out(x, dir, depth = 5, quick = false) {
    const d = quick ? 55 : 40 + depth * 10;
    return [[x, LOS], [x, LOS - d], [x + dir * 95, LOS - d]];
  },
  fade(x, dir) {
    return [[x, LOS], [x + dir * 30, LOS - 150], [x + dir * 50, LOS - 300]];
  },
  post(x, dir) {
    return [[x, LOS], [x, LOS - 170], [x + dir * -100, LOS - 300]];
  },
  corner(x, dir) {
    return [[x, LOS], [x, LOS - 170], [x + dir * 100, LOS - 300]];
  },
  dig(x, dir) {
    const across = dir < 0 ? 480 : x + dir * -230;
    return [[x, LOS], [x, LOS - 190], [across, LOS - 190]];
  },
  seam(x) {
    return [[x, LOS], [x, LOS - 300]];
  },
  go(x) {
    return [[x, LOS], [x, LOS - 320]];
  },
  wheel(x, dir) {
    return [[x, LOS], [x + dir * 70, LOS - 15], [x + dir * 100, LOS - 110], [x + dir * 88, LOS - 260]];
  },
  cross(x, dir) {
    const to = x + dir * -300;
    return [[x, LOS], [x, LOS - 70], [to, LOS - 70]];
  },
  seal(x, dir) {
    return [[x, LOS], [x + dir * 22, LOS - 6], [x + dir * 10, LOS - 22]];
  },
  loopFlat(x, dir) {
    return [[x, LOS + 30], [x + dir * -30, LOS + 10], [x + dir * 130, LOS + 6], [x + dir * 210, LOS - 44]];
  },
};

function buildFieldSVG(play) {
  const positions = POS_X[play.formation] || POS_X.normal;
  let markers = "";
  let lines = "";

  OL_X.forEach((x, i) => {
    if (i === 2) {
      markers += `<rect x="${x - 11}" y="${LOS - 11}" width="22" height="22" rx="3" fill="#f6ebd9" stroke="#2f1c10" stroke-width="2"/>`;
    } else {
      markers += `<circle cx="${x}" cy="${LOS}" r="11" fill="#f6ebd9" stroke="#2f1c10" stroke-width="2"/>`;
    }
  });

  markers += `<circle cx="${Q_POS[0]}" cy="${Q_POS[1]}" r="13" fill="#e3c9a3" stroke="#2f1c10" stroke-width="2"/>`;
  markers += `<text x="${Q_POS[0]}" y="${Q_POS[1] + 3.5}" font-size="9" text-anchor="middle" fill="#2f1c10" font-weight="800">${POS_ABBR.Q}</text>`;

  if (play.id !== "torch") {
    markers += `<circle cx="${F_POS[0]}" cy="${F_POS[1]}" r="13" fill="#e3c9a3" stroke="#2f1c10" stroke-width="2"/>`;
    markers += `<text x="${F_POS[0]}" y="${F_POS[1] + 3.5}" font-size="9" text-anchor="middle" fill="#2f1c10" font-weight="800">${POS_ABBR.F}</text>`;
  }

  (play.routes || []).forEach((r) => {
    const x = positions[r.pos];
    if (x === undefined) return;
    const builder = ROUTE_BUILDERS[r.type];
    if (!builder) return;
    const pts = builder(x, r.dir, r.depth, r.quick);
    const dAttr = pts.map((p, i) => (i === 0 ? `M${pt(p[0], p[1])}` : `L${pt(p[0], p[1])}`)).join(" ");
    lines += `<path d="${dAttr}" fill="none" stroke="#fff8f0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>`;
    markers += `<circle cx="${x}" cy="${LOS}" r="15" fill="#c68b59" stroke="#2f1c10" stroke-width="2"/>`;
    markers += `<text x="${x}" y="${LOS + 3.5}" font-size="9.5" text-anchor="middle" fill="#2f1c10" font-weight="800">${POS_ABBR[r.pos] || r.pos}</text>`;
  });

  // draw LOS line
  const losLine = `<line x1="10" y1="${LOS}" x2="${VB_W - 10}" y2="${LOS}" stroke="#c68b59" stroke-width="2" stroke-dasharray="6 6" opacity="0.6"/>`;

  return `<svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#fff8f0"/>
      </marker>
    </defs>
    ${losLine}
    ${lines}
    ${markers}
  </svg>`;
}

// ---------------- Progress / storage ----------------

const STORAGE_KEY = "huddleUpProgress";

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("none");
    return JSON.parse(raw);
  } catch {
    return { completed: [], xp: 0, streak: 0, lastVisit: null };
  }
}

function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function touchStreak(progress) {
  const today = new Date().toDateString();
  if (progress.lastVisit === today) return progress;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (progress.lastVisit === yesterday) {
    progress.streak += 1;
  } else {
    progress.streak = 1;
  }
  progress.lastVisit = today;
  saveProgress(progress);
  return progress;
}

let progress = touchStreak(loadProgress());

// ---------------- Screens ----------------

const app = document.getElementById("app");

function orderedPlays() {
  return PLAYS;
}

function isUnlocked() {
  // Every lesson is open from the start — jump in wherever you want.
  return true;
}

function renderHome() {
  const plays = orderedPlays();
  const units = [];
  let currentUnit = null;
  plays.forEach((p, i) => {
    if (!currentUnit || currentUnit.unit !== p.unit) {
      currentUnit = { unit: p.unit, unitName: p.unitName, items: [] };
      units.push(currentUnit);
    }
    currentUnit.items.push({ play: p, index: i });
  });

  let unitsHtml = "";
  units.forEach((u) => {
    unitsHtml += `<div class="unit-header"><span>${u.unitName}</span></div>`;
    unitsHtml += `<div class="path">`;
    u.items.forEach(({ play }, i) => {
      const unlocked = isUnlocked();
      const done = progress.completed.includes(play.id);
      const rowClass = i % 3 === 1 ? "offset-left" : i % 3 === 2 ? "offset-right" : "";
      const nodeClass = done ? "done" : unlocked ? "" : "locked";
      unitsHtml += `
        <div class="node-row ${rowClass}">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button class="node ${nodeClass}" data-play="${play.id}" ${unlocked ? "" : "disabled"}>
              ${play.icon}
              ${done ? '<span class="check">✓</span>' : ""}
            </button>
            <div class="node-label">${play.name}</div>
          </div>
        </div>`;
    });
    unitsHtml += `</div>`;
  });

  app.innerHTML = `
    <div class="topbar">
      <div class="brand"><span class="ball">🏈</span> Huddle Up</div>
      <div class="stats">
        <span class="stat-pill">🔥 ${progress.streak}</span>
        <span class="stat-pill">⭐ ${progress.xp}</span>
      </div>
    </div>
    <div class="path-wrap">
      <div class="intro-card">
        <h1>Learn the Passing Game</h1>
        <p>Work your way down the path. Every play, one bite-sized lesson at a time.</p>
      </div>
      ${unitsHtml}
    </div>
    <footer class="site-footer">Built from the real playbook. No forward passes were thrown in the making of this site.</footer>
  `;

  app.querySelectorAll(".node[data-play]").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => startLesson(btn.dataset.play));
  });
}

// ---------------- Lesson runner ----------------

let lessonState = null;

function buildCards(play) {
  const cards = [];

  cards.push({ type: "intro", play });

  if (play.category === "intro") {
    cards.push({ type: "facts", play });
  } else {
    cards.push({ type: "diagram", play });
    cards.push({ type: "assignments", play });
    cards.push({ type: "read", play });
  }

  play.quiz.forEach((q) => cards.push({ type: "quiz", play, q }));

  return cards;
}

function startLesson(playId) {
  const play = PLAYS.find((p) => p.id === playId);
  lessonState = {
    play,
    cards: buildCards(play),
    index: 0,
    hearts: 5,
    correctCount: 0,
    answered: false,
    selectedOption: null,
  };
  renderLesson();
}

function exitLesson() {
  lessonState = null;
  renderHome();
}

function renderProgressBar() {
  const pct = Math.round((lessonState.index / lessonState.cards.length) * 100);
  return `
    <div class="lesson-topbar">
      <button class="exit-btn" id="exitBtn">&times;</button>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="hearts">${"❤️".repeat(Math.max(lessonState.hearts, 0))}${"🤍".repeat(5 - Math.max(lessonState.hearts, 0))}</div>
    </div>`;
}

function cardHtml(card) {
  const { play } = card;

  if (card.type === "intro") {
    return `
      <div class="card">
        <div class="play-title">
          <div class="icon">${play.icon}</div>
          <div>
            <h2>${play.name}</h2>
            <p class="nickname">${play.nickname}</p>
          </div>
        </div>
        <div class="gist-box">${play.gist}</div>
      </div>`;
  }

  if (card.type === "diagram") {
    return `
      <div class="card">
        <div class="section-label">How it looks</div>
        <div class="field-wrap">${buildFieldSVG(play)}</div>
      </div>`;
  }

  if (card.type === "assignments") {
    const items = play.assignments
      .map((a) => `
        <div class="assign-item">
          <div class="pos-badge">${a.abbrev}</div>
          <div>
            <div class="role-label">${a.role}</div>
            <p>${a.text}</p>
          </div>
        </div>`)
      .join("");
    return `
      <div class="card">
        <div class="section-label">Who does what</div>
        <div class="assign-list">${items}</div>
      </div>`;
  }

  if (card.type === "read") {
    return `
      <div class="card">
        <div class="section-label">The read</div>
        <div class="read-box">${play.readKey}</div>
      </div>`;
  }

  if (card.type === "facts") {
    const items = play.facts.map((f) => `<div class="fact-item">${f}</div>`).join("");
    return `
      <div class="card">
        <div class="section-label">Ground rules</div>
        <div class="facts-list">${items}</div>
      </div>`;
  }

  if (card.type === "quiz") {
    const q = card.q;
    const opts = q.options
      .map((opt, i) => `<button class="option-btn" data-idx="${i}">${opt}</button>`)
      .join("");
    return `
      <div class="card">
        <p class="quiz-q">${q.q}</p>
        <div class="options">${opts}</div>
        <div id="feedbackSlot"></div>
      </div>`;
  }

  return "";
}

function renderLesson() {
  const card = lessonState.cards[lessonState.index];
  const isQuiz = card.type === "quiz";

  app.innerHTML = `
    <div class="lesson-screen">
      ${renderProgressBar()}
      <div class="card-area">${cardHtml(card)}</div>
      <div class="bottom-bar">
        <button class="primary-btn" id="mainActionBtn" ${isQuiz ? "disabled" : ""}>
          ${isQuiz ? "Check" : "Continue"}
        </button>
      </div>
    </div>`;

  document.getElementById("exitBtn").addEventListener("click", exitLesson);

  const actionBtn = document.getElementById("mainActionBtn");

  if (isQuiz) {
    lessonState.answered = false;
    lessonState.selectedOption = null;
    const optionBtns = app.querySelectorAll(".option-btn");
    optionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (lessonState.answered) return;
        optionBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        lessonState.selectedOption = parseInt(btn.dataset.idx, 10);
        actionBtn.disabled = false;
      });
    });

    actionBtn.addEventListener("click", () => {
      if (!lessonState.answered) {
        handleCheck(card, actionBtn);
      } else {
        advance();
      }
    });
  } else {
    actionBtn.addEventListener("click", advance);
  }
}

function handleCheck(card, actionBtn) {
  lessonState.answered = true;
  const q = card.q;
  const correct = lessonState.selectedOption === q.correct;
  const optionBtns = app.querySelectorAll(".option-btn");
  optionBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add("correct");
    else if (parseInt(b.dataset.idx, 10) === lessonState.selectedOption) b.classList.add("incorrect");
  });

  const slot = document.getElementById("feedbackSlot");
  if (correct) {
    lessonState.correctCount += 1;
    slot.innerHTML = `<div class="feedback-box good">Nailed it! ${q.why}</div>`;
  } else {
    lessonState.hearts -= 1;
    slot.innerHTML = `<div class="feedback-box bad">Not quite. ${q.why}</div>`;
  }

  actionBtn.disabled = false;
  actionBtn.textContent = "Continue";
}

function advance() {
  lessonState.index += 1;
  if (lessonState.index >= lessonState.cards.length) {
    finishLesson();
  } else {
    renderLesson();
  }
}

function finishLesson() {
  const { play, correctCount } = lessonState;
  const totalQuiz = play.quiz.length;
  const alreadyDone = progress.completed.includes(play.id);
  const xpEarned = alreadyDone ? Math.max(5, correctCount * 3) : 10 + correctCount * 5;

  if (!alreadyDone) progress.completed.push(play.id);
  progress.xp += xpEarned;
  saveProgress(progress);

  app.innerHTML = `
    <div class="lesson-screen">
      <div class="lesson-topbar">
        <button class="exit-btn" id="exitBtn2">&times;</button>
        <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
      </div>
      <div class="complete-wrap">
        <div class="big-emoji">🏆</div>
        <h2>${play.name} — in the books!</h2>
        <div class="result-stats">
          <div class="result-pill"><span class="num">${correctCount}/${totalQuiz}</span><span class="lbl">Correct</span></div>
          <div class="result-pill"><span class="num">+${xpEarned}</span><span class="lbl">XP</span></div>
        </div>
        <button class="primary-btn go" id="backToPathBtn">Back to the Path</button>
      </div>
    </div>`;

  document.getElementById("exitBtn2").addEventListener("click", exitLesson);
  document.getElementById("backToPathBtn").addEventListener("click", exitLesson);
}

renderHome();
