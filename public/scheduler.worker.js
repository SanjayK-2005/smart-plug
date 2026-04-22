// Scheduler Web Worker — runs every 30s independent of main thread throttling

function getISTTime() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return {
    hhmm: `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`,
    dayOfWeek: ist.getUTCDay(), // 0=Sun, 6=Sat
    dateKey: ist.toISOString().slice(0, 10), // YYYY-MM-DD
    weekKey: `${ist.getUTCFullYear()}-W${String(Math.ceil((ist.getUTCDate()) / 7)).padStart(2, '0')}-${ist.getUTCDay()}`,
    epochMin: Math.floor((now.getTime()) / 60000), // current minute epoch
  };
}

function check(schedules, lastFired) {
  const { hhmm, dayOfWeek, dateKey, weekKey, epochMin } = getISTTime();
  const toFire = [];

  for (const s of schedules) {
    if (!s.enabled || s.time !== hhmm) continue;

    // Build a unique fire key based on repeat type
    let fireKey;
    if (s.repeat === 'once') {
      fireKey = `${s.id}-once`;
    } else if (s.repeat === 'weekly') {
      // Only fire on the same day of week the schedule was created
      if (s.dayOfWeek !== dayOfWeek) continue;
      fireKey = `${s.id}-${weekKey}`;
    } else {
      // daily (default)
      fireKey = `${s.id}-${dateKey}`;
    }

    // Already fired this period?
    if (lastFired[fireKey]) continue;

    toFire.push({ id: s.id, action: s.action, fireKey });
  }

  return toFire;
}

let schedules = [];
let lastFired = {};

self.onmessage = (e) => {
  if (e.data.type === 'INIT') {
    schedules = e.data.schedules;
    lastFired = e.data.lastFired || {};
  }
  if (e.data.type === 'UPDATE_SCHEDULES') {
    schedules = e.data.schedules;
  }
  if (e.data.type === 'MARK_FIRED') {
    lastFired[e.data.fireKey] = true;
  }
  if (e.data.type === 'TICK') {
    const toFire = check(schedules, lastFired);
    if (toFire.length > 0) {
      self.postMessage({ type: 'FIRE', toFire });
    }
  }
};

// Internal tick every 30 seconds
setInterval(() => {
  const toFire = check(schedules, lastFired);
  if (toFire.length > 0) {
    self.postMessage({ type: 'FIRE', toFire });
  }
}, 30000);
