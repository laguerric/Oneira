import React, { useState, useEffect } from 'react';

function getNextDreamTime(): Date {
  const now = new Date();

  // Get current hour in Eastern time using Intl API
  const easternHour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(now),
    10
  );
  const easternMinute = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', minute: 'numeric' }).format(now),
    10
  );
  const easternSecond = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', second: 'numeric' }).format(now),
    10
  );

  // Calculate seconds until 8 PM EST (20:00)
  const currentSecondsInDay = easternHour * 3600 + easternMinute * 60 + easternSecond;
  const targetSecondsInDay = 20 * 3600;

  let secondsUntil = targetSecondsInDay - currentSecondsInDay;
  if (secondsUntil <= 0) {
    secondsUntil += 24 * 3600; // Next day
  }

  return new Date(now.getTime() + secondsUntil * 1000);
}

function fmt(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function Countdown() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(fmt(getNextDreamTime().getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="countdown">
      <span>Next dream</span>
      <span className="countdown-time">{time}</span>
    </div>
  );
}
