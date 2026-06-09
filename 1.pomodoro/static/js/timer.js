/**
 * ポモドーロタイマーの純粋な状態機械。
 *
 * DOM 操作・通信・タイマー(setInterval) を一切含まない。
 * 時刻取得は `now` を注入できるため、テストで自由に制御できる。
 */

export const DEFAULT_DURATIONS = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};

export class PomodoroTimer {
    /**
     * @param {object} [options]
     * @param {() => number} [options.now] 現在時刻(ミリ秒)を返す関数
     * @param {{work:number, shortBreak:number, longBreak:number}} [options.durations] 各モードの秒数
     * @param {number} [options.longBreakInterval] 長い休憩までの作業回数
     */
    constructor({ now = () => Date.now(), durations = DEFAULT_DURATIONS, longBreakInterval = 4 } = {}) {
        this.now = now;
        this.durations = { ...durations };
        this.longBreakInterval = longBreakInterval;

        this.mode = "work"; // "work" | "shortBreak" | "longBreak"
        this.state = "idle"; // "idle" | "running" | "paused" | "completed"
        this.completedWorkSessions = 0;

        this._startEpoch = null;
        this._elapsedBeforePause = 0;
    }

    /** 現在モードの設定秒数。 */
    get durationSec() {
        return this.durations[this.mode];
    }

    /** 作業モードかどうか。 */
    isWork() {
        return this.mode === "work";
    }

    /** タイマーを開始する。実行中なら何もしない。 */
    start() {
        if (this.state === "running") return;
        this._startEpoch = this.now();
        this.state = "running";
    }

    /** 一時停止する。経過時間を保持する。 */
    pause() {
        if (this.state !== "running") return;
        this._elapsedBeforePause = this.elapsed();
        this._startEpoch = null;
        this.state = "paused";
    }

    /** 現在モードを最初からやり直す（経過時間を0に戻す）。 */
    reset() {
        this.state = "idle";
        this._startEpoch = null;
        this._elapsedBeforePause = 0;
    }

    /** 経過秒数（開始時刻基準で算出するためタブ非アクティブでもズレない）。 */
    elapsed() {
        if (this.state === "running") {
            return this._elapsedBeforePause + (this.now() - this._startEpoch) / 1000;
        }
        return this._elapsedBeforePause;
    }

    /** 残り秒数（0未満にはならない）。 */
    remaining() {
        const r = this.durationSec - this.elapsed();
        return r > 0 ? r : 0;
    }

    /** 進捗割合 0.0〜1.0（経過 / 設定時間）。 */
    progress() {
        const p = this.elapsed() / this.durationSec;
        if (p < 0) return 0;
        if (p > 1) return 1;
        return p;
    }

    /**
     * 1tick 進める。残り0になった瞬間に completed へ遷移し true を返す。
     * @returns {boolean} このtickで完了したか
     */
    tick() {
        if (this.state === "running" && this.remaining() <= 0) {
            this._elapsedBeforePause = this.durationSec;
            this._startEpoch = null;
            this.state = "completed";
            return true;
        }
        return false;
    }

    /** 完了済みか。 */
    isCompleted() {
        return this.state === "completed";
    }

    /**
     * 次のモードへ進める。
     * 作業完了なら休憩へ（longBreakInterval 回ごとに長い休憩）、
     * 休憩完了なら作業へ。リセットして idle 状態にする。
     */
    next() {
        if (this.mode === "work") {
            this.completedWorkSessions += 1;
            if (this.completedWorkSessions % this.longBreakInterval === 0) {
                this.mode = "longBreak";
            } else {
                this.mode = "shortBreak";
            }
        } else {
            this.mode = "work";
        }
        this.reset();
    }
}
