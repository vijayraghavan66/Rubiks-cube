const STORAGE_KEY = "rubiks-platform-times-v1";

function now() {
  return performance.now();
}

function formatMs(ms) {
  const seconds = ms / 1000;
  return seconds.toFixed(2);
}

function average(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export class SpeedTimer {
  constructor() {
    this.phase = "idle";
    this.startTime = 0;
    this.currentElapsed = 0;
    this.times = this.loadTimes();
  }

  loadTimes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => Number.isFinite(v));
    } catch (err) {
      return [];
    }
  }

  saveTimes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.times.slice(-50)));
  }

  beginInspection() {
    this.phase = "inspection";
    this.currentElapsed = 0;
  }

  start() {
    this.phase = "running";
    this.startTime = now();
    this.currentElapsed = 0;
  }

  stop() {
    if (this.phase !== "running") {
      return null;
    }

    const elapsed = now() - this.startTime;
    this.phase = "idle";
    this.currentElapsed = 0;
    this.times.push(elapsed);
    this.saveTimes();
    return elapsed;
  }

  tick() {
    if (this.phase !== "running") {
      return null;
    }
    this.currentElapsed = now() - this.startTime;
    return this.currentElapsed;
  }

  reset() {
    this.phase = "idle";
    this.currentElapsed = 0;
  }

  clear() {
    this.times = [];
    this.saveTimes();
  }

  getStats() {
    const recent = this.times.slice(-5).reverse();
    const best = this.times.length ? Math.min(...this.times) : null;
    const avg = average(this.times);

    return {
      phase: this.phase,
      current: this.currentElapsed,
      best,
      average: avg,
      recent,
      formatted: {
        current: this.phase === "running" ? formatMs(this.currentElapsed) : "0.00",
        best: best == null ? "-" : formatMs(best),
        average: avg == null ? "-" : formatMs(avg),
        recent: recent.map((time) => formatMs(time)),
      },
    };
  }
}
