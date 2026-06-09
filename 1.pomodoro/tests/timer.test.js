import { test } from "node:test";
import assert from "node:assert/strict";

import { PomodoroTimer, DEFAULT_DURATIONS } from "../static/js/timer.js";

/** now を手動で進められる擬似クロックを作る。 */
function fakeClock(startMs = 0) {
    let nowMs = startMs;
    return {
        now: () => nowMs,
        advance: (seconds) => {
            nowMs += seconds * 1000;
        },
    };
}

test("初期状態は作業モードかつ idle で 25 分", () => {
    const t = new PomodoroTimer();
    assert.equal(t.mode, "work");
    assert.equal(t.state, "idle");
    assert.equal(t.durationSec, DEFAULT_DURATIONS.work);
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work);
});

test("開始後、経過時間に応じて残り時間が減る（now 注入で検証）", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    assert.equal(t.state, "running");

    clock.advance(60); // 1 分経過
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work - 60);
    assert.ok(Math.abs(t.progress() - 60 / DEFAULT_DURATIONS.work) < 1e-9);
});

test("一時停止すると経過時間を保持し、残り時間は止まる", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(30);
    t.pause();
    assert.equal(t.state, "paused");

    clock.advance(120); // 停止中は進まない
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work - 30);
});

test("リセットで idle に戻り経過が 0 になる", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(100);
    t.reset();

    assert.equal(t.state, "idle");
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work);
});

test("残り 0 で tick すると completed になり true を返す", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(DEFAULT_DURATIONS.work);

    assert.equal(t.tick(), true);
    assert.equal(t.state, "completed");
    assert.equal(t.remaining(), 0);
    assert.equal(t.progress(), 1);

    // 二度目の tick は false
    assert.equal(t.tick(), false);
});

test("作業→短い休憩→作業…と切り替わる", () => {
    const t = new PomodoroTimer();

    t.next(); // 作業1回目完了
    assert.equal(t.mode, "shortBreak");
    assert.equal(t.completedWorkSessions, 1);

    t.next(); // 休憩完了
    assert.equal(t.mode, "work");
});

test("4 回目の作業完了で長い休憩へ", () => {
    const t = new PomodoroTimer({ longBreakInterval: 4 });

    // 作業→休憩 を3セット
    for (let i = 0; i < 3; i++) {
        t.next(); // work -> shortBreak
        assert.equal(t.mode, "shortBreak");
        t.next(); // shortBreak -> work
        assert.equal(t.mode, "work");
    }

    // 4回目の作業完了
    t.next();
    assert.equal(t.mode, "longBreak");
    assert.equal(t.completedWorkSessions, 4);
});

test("一時停止後に再開すると経過時間が累積される", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(40);
    t.pause();

    clock.advance(600); // 停止中は進まない

    t.start(); // 再開
    clock.advance(20);

    // 40 + 20 = 60 秒経過
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work - 60);
});

test("実行中の start() は無視される（開始時刻が上書きされない）", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(30);
    t.start(); // 無視されるはず
    clock.advance(10);

    assert.equal(t.remaining(), DEFAULT_DURATIONS.work - 40);
});

test("実行中でないときの pause() は状態を変えない", () => {
    const t = new PomodoroTimer();

    t.pause(); // idle のまま
    assert.equal(t.state, "idle");
    assert.equal(t.remaining(), DEFAULT_DURATIONS.work);
});

test("remaining() は 0 未満にならず、progress() は 1 を超えない", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(DEFAULT_DURATIONS.work + 999); // 大幅に超過

    assert.equal(t.remaining(), 0);
    assert.equal(t.progress(), 1);
});

test("next() は状態を idle に戻し経過を 0 にする", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({ now: clock.now });

    t.start();
    clock.advance(DEFAULT_DURATIONS.work);
    t.tick(); // completed
    t.next(); // 次モードへ

    assert.equal(t.state, "idle");
    assert.equal(t.mode, "shortBreak");
    assert.equal(t.remaining(), DEFAULT_DURATIONS.shortBreak);
});

test("isWork() はモードに応じて真偽を返す", () => {
    const t = new PomodoroTimer();
    assert.equal(t.isWork(), true);

    t.next(); // shortBreak
    assert.equal(t.isWork(), false);

    t.next(); // work
    assert.equal(t.isWork(), true);
});

test("カスタム時間設定が反映される", () => {
    const clock = fakeClock();
    const t = new PomodoroTimer({
        now: clock.now,
        durations: { work: 10, shortBreak: 3, longBreak: 6 },
    });

    assert.equal(t.remaining(), 10);

    t.start();
    clock.advance(10);
    assert.equal(t.tick(), true);

    t.next();
    assert.equal(t.mode, "shortBreak");
    assert.equal(t.remaining(), 3);
});

test("longBreakInterval を変えると長い休憩のタイミングが変わる", () => {
    const t = new PomodoroTimer({ longBreakInterval: 2 });

    t.next(); // 作業1回目 -> shortBreak
    assert.equal(t.mode, "shortBreak");
    t.next(); // -> work
    t.next(); // 作業2回目 -> longBreak
    assert.equal(t.mode, "longBreak");
});
