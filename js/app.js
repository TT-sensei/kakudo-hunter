/* =========================================================================
   ANGLE HUNTER - MVP (HUNTモードのみ)
   設計方針: 「分度器で答えを出す」のではなく「まず角度を感じて分度器で確かめる」
   後で拡張しやすいように CONFIG / STATE / 描画関数 / ロジック関数を分離している。
   将来の拡張ポイント:
     - MONSTER_RENDERERS にキーを増やせば見た目を差し替え可能（今はプレースホルダ絵文字）
     - CONFIG.levels に難易度を追加すれば LEVEL 3以降(10°/5°/自由角度)にも対応可能
     - MEASURE / CHALLENGE モードは同じ STATE.center / STATE.radius を使って追加できる
   ========================================================================= */

(function () {
  "use strict";

  /* ---------------- CONFIG ---------------- */
  const CONFIG = {
    center: { x: 200, y: 200 },
    fieldRadius: 150,      // モンスターや目盛りの外側半径
    tickOuter: 150,
    tickInnerMajor: 132,
    tickInnerMinor: 141,
    labelRadius: 118,
    monsterRadius: 150,
    netTravelMs: 380,
    revealDelayMs: 550,
    levels: {
      30: { step: 30, label: "かんたん(30°)" },
      15: { step: 15, label: "ふつう(15°)" }
    },
    storageKey: "angleHunter.stats.v1"
  };

  /* ---------------- STATE ---------------- */
  const STATE = {
    step: 30,
    currentAngle: null,   // 出題中の正解角度
    answered: false,
    stats: loadStats()
  };

  /* ---------------- DOM参照 ---------------- */
  const svg = document.getElementById("fieldSvg");
  const angleButtonsEl = document.getElementById("angleButtons");
  const nextBtn = document.getElementById("nextBtn");
  const messageEl = document.getElementById("message");
  const levelSwitchEl = document.getElementById("levelSwitch");

  /* ============================================================
     初期化
     ============================================================ */
  function init() {
    drawStarfield();
    buildField();
    bindLevelSwitch();
    buildAngleButtons();
    const sidebar = document.querySelector('.stat-sidebar');
    sidebar.appendChild(angleButtonsEl);
    sidebar.appendChild(nextBtn);
    updateStatsPanel();
    spawnMonster();

    nextBtn.addEventListener("click", () => {
      resetForNextQuestion();
      spawnMonster();
    });
  }

  /* ============================================================
     背景の星（装飾。ロジックとは無関係）
     ============================================================ */
  function drawStarfield() {
    const canvas = document.getElementById("stars");
    const ctx = canvas.getContext("2d");
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    }
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      // シード的に固定感を出すため毎回ランダムでOK（装飾のみ）
      for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.3;
        ctx.globalAlpha = Math.random() * 0.8 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    window.addEventListener("resize", resize);
    resize();
  }

  /* ============================================================
     SVGフィールド（円・目盛り・分度器）の構築
     ============================================================ */
  function buildField() {
    const { x: cx, y: cy } = CONFIG.center;
    svg.innerHTML = ""; // クリア

    // 外側の円（フィールド）
    addSvg("circle", {
      cx, cy, r: CONFIG.fieldRadius + 14,
      class: "field-ring-outer"
    });
    addSvg("circle", {
      cx, cy, r: CONFIG.fieldRadius,
      class: "field-ring"
    });

    // 分度器の目盛り（常時表示）: 15°刻みで目盛り、30°刻みで数字ラベル
    for (let deg = 0; deg < 360; deg += 15) {
      const isMajor = deg % 30 === 0;
      const rad = degToRad(deg);
      const outer = polarPoint(cx, cy, CONFIG.tickOuter, rad);
      const inner = polarPoint(cx, cy, isMajor ? CONFIG.tickInnerMajor : CONFIG.tickInnerMinor, rad);
      addSvg("line", {
        x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y,
        class: isMajor ? "tick-major" : "tick-minor"
      });
      if (isMajor) {
        const labelPos = polarPoint(cx, cy, CONFIG.labelRadius, rad);
        addSvg("text", {
          x: labelPos.x, y: labelPos.y,
          class: "tick-label",
          "text-anchor": "middle",
          "dominant-baseline": "middle"
        }, String(deg));
      }
    }

    // 中心点
    addSvg("circle", { cx, cy, r: 5, class: "center-dot" });

    // 正解角度を後で示す点線（初期は非表示）
    const cLine = addSvg("line", {
      x1: cx, y1: cy, x2: cx, y2: cy,
      class: "correct-line", id: "correctLine"
    });

    // ねらいの矢印（モンスター方向）
    addSvg("line", { x1: cx, y1: cy, x2: cx, y2: cy, class: "aim-arrow", id: "aimArrow" });
    addSvg("polygon", { points: "0,0 0,0 0,0", class: "aim-arrow-head", id: "aimArrowHead" });

    // 網のライン（アニメーション用）
    addSvg("line", { x1: cx, y1: cy, x2: cx, y2: cy, class: "net-line", id: "netLine" });

    // モンスター（プレースホルダ絵文字。将来は edu-assets の画像に差し替え可能）
    const monsterG = addSvg("g", { class: "monster-group", id: "monsterGroup" });
    const monsterText = document.createElementNS(svgNS(), "text");
    monsterText.setAttribute("id", "monsterEmoji");
    monsterText.setAttribute("font-size", "34");
    monsterText.setAttribute("text-anchor", "middle");
    monsterText.setAttribute("dominant-baseline", "middle");
    monsterText.textContent = "👾";
    monsterG.appendChild(monsterText);
  }

  /* ============================================================
     モンスター出現
     ============================================================ */
  function spawnMonster() {
    const steps = 360 / STATE.step;
    const angle = Math.floor(Math.random() * steps) * STATE.step;
    STATE.currentAngle = angle;
    STATE.answered = false;

    const { x: cx, y: cy } = CONFIG.center;
    const rad = degToRad(angle);
    const pos = polarPoint(cx, cy, CONFIG.monsterRadius, rad);

    document.getElementById("monsterGroup").setAttribute("transform", `translate(${pos.x},${pos.y})`);
    document.getElementById("monsterGroup").classList.remove("caught");

    // ねらいの矢印をモンスター方向へ
    const arrowTip = polarPoint(cx, cy, CONFIG.monsterRadius - 26, rad);
    const arrow = document.getElementById("aimArrow");
    arrow.setAttribute("x2", arrowTip.x);
    arrow.setAttribute("y2", arrowTip.y);
    setArrowHead(arrowTip, rad);

    // 前の結果表示をクリア
    hideMessage();
    document.getElementById("correctLine").style.opacity = 0;
    document.getElementById("netLine").style.opacity = 0;
    nextBtn.style.display = "none";
    clearButtonHighlights();
    setButtonsDisabled(false);
  }

  function setArrowHead(tip, rad) {
    const size = 9;
    const left = polarPoint(tip.x, tip.y, size, rad + Math.PI * 0.8);
    const right = polarPoint(tip.x, tip.y, size, rad - Math.PI * 0.8);
    document.getElementById("aimArrowHead").setAttribute(
      "points",
      `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`
    );
  }

  /* ============================================================
     角度選択ボタン
     ============================================================ */
  function buildAngleButtons() {
    angleButtonsEl.innerHTML = "";
    const steps = 360 / STATE.step;
    for (let i = 0; i < steps; i++) {
      const deg = i * STATE.step;
      const btn = document.createElement("button");
      btn.className = "angle-btn";
      btn.textContent = deg + "°";
      btn.dataset.angle = deg;
      btn.addEventListener("click", () => onAngleSelected(deg, btn));
      angleButtonsEl.appendChild(btn);
    }
  }

  function clearButtonHighlights() {
    document.querySelectorAll(".angle-btn").forEach(b => {
      b.classList.remove("correct-reveal", "wrong-pick");
    });
  }

  function setButtonsDisabled(disabled) {
    document.querySelectorAll(".angle-btn").forEach(b => { b.disabled = disabled; });
  }

  /* ============================================================
     回答処理: 選んだ角度の方向へ実際に網を飛ばし、
     はずれの場合は「何もない場所」に着地させてズレに気づかせる
     ============================================================ */
  function onAngleSelected(chosenAngle, btnEl) {
    if (STATE.answered) return;
    STATE.answered = true;
    setButtonsDisabled(true);

    const correct = chosenAngle === STATE.currentAngle;
    const { x: cx, y: cy } = CONFIG.center;
    const rad = degToRad(chosenAngle);
    const netEndOuter = polarPoint(cx, cy, CONFIG.monsterRadius - 10, rad);

    const netLine = document.getElementById("netLine");
    netLine.classList.toggle("wrong", !correct);
    netLine.classList.toggle("right", correct);
    netLine.setAttribute("x1", cx);
    netLine.setAttribute("y1", cy);
    netLine.setAttribute("x2", cx);
    netLine.setAttribute("y2", cy);
    netLine.style.opacity = 1;

    // 網を選んだ角度の方向へ伸ばすアニメーション
    animateLine(netLine, cx, cy, netEndOuter.x, netEndOuter.y, CONFIG.netTravelMs, () => {
      if (correct) {
        onHit(btnEl);
      } else {
        onMiss(chosenAngle, btnEl);
      }
    });
  }

  function onHit(btnEl) {
    btnEl.classList.add("correct-reveal");
    document.getElementById("monsterGroup").classList.add("caught");
    showMessage("GET！ 大せいかい！", "hit");
    recordResult(true, STATE.currentAngle, 0);
    finishQuestion();
  }

  function onMiss(chosenAngle, btnEl) {
    btnEl.classList.add("wrong-pick");
    const diff = angleDiff(chosenAngle, STATE.currentAngle);

    // 少し間（ま）を置いてから正解を明かす -> 「あっこっちか」に気づく時間
    setTimeout(() => {
      revealCorrectAngle();
      showMessage(`はずれ… 正解は${STATE.currentAngle}°／${diff}°ずれてたよ`, "miss");
      recordResult(false, STATE.currentAngle, diff);
      finishQuestion();
    }, CONFIG.revealDelayMs);
  }

  function revealCorrectAngle() {
    const { x: cx, y: cy } = CONFIG.center;
    const rad = degToRad(STATE.currentAngle);
    const end = polarPoint(cx, cy, CONFIG.monsterRadius - 10, rad);
    const line = document.getElementById("correctLine");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", cy);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.style.opacity = 1;

    // 正解ボタンもハイライト
    const correctBtn = document.querySelector(`.angle-btn[data-angle="${STATE.currentAngle}"]`);
    if (correctBtn) correctBtn.classList.add("correct-reveal");
  }

  function finishQuestion() {
    nextBtn.style.display = "inline-block";
  }

  /* ============================================================
     ライン伸縮アニメーション（依存ライブラリなし）
     ============================================================ */
  function animateLine(el, x1, y1, x2, y2, duration, onDone) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out
      el.setAttribute("x2", x1 + (x2 - x1) * ease);
      el.setAttribute("y2", y1 + (y2 - y1) * ease);
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  /* ============================================================
     レベル切り替え
     ============================================================ */
  function bindLevelSwitch() {
    levelSwitchEl.querySelectorAll(".level-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        levelSwitchEl.querySelectorAll(".level-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        STATE.step = Number(btn.dataset.step);
        buildAngleButtons();
        resetForNextQuestion();
        spawnMonster();
      });
    });
  }

  function resetForNextQuestion() {
    hideMessage();
  }

  /* ============================================================
     メッセージ表示
     ============================================================ */
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = type;
    messageEl.style.display = "block";
  }
  function hideMessage() {
    messageEl.style.display = "none";
  }

  /* ============================================================
     記録・統計（localStorageのみ。サーバー/API/アカウント無し）
     ============================================================ */
  function loadStats() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 読み込み失敗時は初期値にフォールバック */ }
    return {
      attempts: 0,
      correct: 0,
      streakCurrent: 0,
      streakMax: 0,
      angleStats: {} // { "60": { attempts: n, correct: n } }
    };
  }

  function saveStats() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(STATE.stats));
    } catch (e) { /* 保存失敗は致命的ではないため無視 */ }
  }

  function recordResult(isCorrect, angle, diff) {
    const s = STATE.stats;
    s.attempts += 1;
    if (isCorrect) {
      s.correct += 1;
      s.streakCurrent += 1;
      s.streakMax = Math.max(s.streakMax, s.streakCurrent);
    } else {
      s.streakCurrent = 0;
    }
    const key = String(angle);
    if (!s.angleStats[key]) s.angleStats[key] = { attempts: 0, correct: 0 };
    s.angleStats[key].attempts += 1;
    if (isCorrect) s.angleStats[key].correct += 1;

    saveStats();
    updateStatsPanel();
  }

  function updateStatsPanel() {
    const s = STATE.stats;
    document.getElementById("statAttempts").textContent = s.attempts;
    document.getElementById("statCorrect").textContent = s.correct;
    document.getElementById("statRate").textContent =
      s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) + "%" : "0%";
    document.getElementById("statStreak").textContent = s.streakMax;

    renderWeakAngles();
  }

  function renderWeakAngles() {
    const s = STATE.stats;
    const entries = Object.entries(s.angleStats)
      .map(([angle, v]) => ({
        angle,
        attempts: v.attempts,
        rate: v.attempts ? v.correct / v.attempts : 1
      }))
      .filter(e => e.attempts >= 2 && e.rate < 0.6)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 4);

    const el = document.getElementById("weakAngles");
    if (entries.length === 0) {
      el.textContent = "まだデータなし";
      return;
    }
    el.innerHTML = entries
      .map(e => `<span class="weak-angle-tag">${e.angle}°</span>`)
      .join("");
  }

  /* ============================================================
     幾何ユーティリティ
     ============================================================ */
  function degToRad(deg) {
    // 画面上は「右(3時の位置)=0°」「反時計回り」を採用（実物の分度器の使い方に合わせる）
    return -deg * (Math.PI / 180);
  }
  function polarPoint(cx, cy, r, rad) {
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function angleDiff(a, b) {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  }
  function svgNS() { return "http://www.w3.org/2000/svg"; }
  function addSvg(tag, attrs, text) {
    const el = document.createElementNS(svgNS(), tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text !== undefined) el.textContent = text;
    svg.appendChild(el);
    return el;
  }

  /* ---------------- 起動 ---------------- */
  init();
})();
