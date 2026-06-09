/**
 * DOM 描画とタイマー制御の結線。
 * ロジックは timer.js に閉じ込め、ここでは表示と setInterval を担う。
 */
import { PomodoroTimer } from "./timer.js";

const MODE_LABELS = {
    work: "作業中",
    shortBreak: "休憩中",
    longBreak: "長い休憩",
};

const RADIUS = 96;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const els = {
    modeLabel: document.getElementById("mode-label"),
    time: document.getElementById("timer-time"),
    progressRing: document.getElementById("timer-progress"),
    startBtn: document.getElementById("start-btn"),
    resetBtn: document.getElementById("reset-btn"),
    completedCount: document.getElementById("completed-count"),
    focusTime: document.getElementById("focus-time"),
};

const timer = new PomodoroTimer();

// 今日の進捗（Phase 5 でサーバー永続化する。今はメモリ上で集計）。
let completedCount = 0;
let focusSeconds = 0;

let intervalId = null;

function formatTime(totalSeconds) {
    const s = Math.ceil(totalSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatFocus(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}分`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

function renderProgressStats() {
    els.completedCount.textContent = String(completedCount);
    els.focusTime.textContent = formatFocus(focusSeconds);
}

function render() {
    els.modeLabel.textContent = MODE_LABELS[timer.mode];
    els.time.textContent = formatTime(timer.remaining());

    const offset = CIRCUMFERENCE * timer.progress();
    els.progressRing.style.strokeDasharray = `${CIRCUMFERENCE}`;
    els.progressRing.style.strokeDashoffset = `${offset}`;

    els.startBtn.textContent = timer.state === "running" ? "一時停止" : "開始";
}

function startTicking() {
    if (intervalId !== null) return;
    intervalId = setInterval(onTick, 250);
}

function stopTicking() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function onTick() {
    const justCompleted = timer.tick();
    if (justCompleted) {
        handleCompletion();
    }
    render();
}

function handleCompletion() {
    // 作業セッションを完了したら進捗に加算する。
    if (timer.isWork()) {
        completedCount += 1;
        focusSeconds += timer.durations.work;
        renderProgressStats();
    }
    // 次のモードへ自動で切り替え、続けて開始する（作業⇄休憩の自動切替）。
    timer.next();
    timer.start();
}

els.startBtn.addEventListener("click", () => {
    if (timer.state === "running") {
        timer.pause();
        stopTicking();
    } else {
        timer.start();
        startTicking();
    }
    render();
});

els.resetBtn.addEventListener("click", () => {
    timer.reset();
    stopTicking();
    render();
});

renderProgressStats();
render();
