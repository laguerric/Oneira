import React, { useState, useEffect, useRef, useCallback } from 'react';

const TWEET_IDS = [
  '2051814862108414218',
  '2051090088256258546',
  '2050728058760405021',
  '2050365329675608539',
  '2050002932427300955',
  '2049640584999002170',
  '2049278199016689934',
  '2049126490105692483',
];

const DATES = [
  'May 5, 2026', 'May 3, 2026', 'May 2, 2026', 'May 1, 2026',
  'April 30, 2026', 'April 29, 2026', 'April 28, 2026', 'April 27, 2026',
];

export default function DreamCarousel() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(current);
  const scriptLoaded = useRef(false);

  currentRef.current = current;

  const loadTweet = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    const twttr = (window as any).twttr;
    if (twttr?.widgets) {
      twttr.widgets.createTweet(TWEET_IDS[index], el, { theme: 'dark', width: 500, dnt: true });
    } else {
      const a = document.createElement('a');
      a.href = `https://twitter.com/OneiraEngine/status/${TWEET_IDS[index]}`;
      a.textContent = `Dream — ${DATES[index]}`;
      a.target = '_blank';
      a.style.color = 'var(--text-secondary)';
      el.appendChild(a);
    }
  }, []);

  useEffect(() => {
    if (scriptLoaded.current) return;
    if ((window as any).twttr) {
      scriptLoaded.current = true;
      loadTweet(currentRef.current);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = () => {
      scriptLoaded.current = true;
      loadTweet(currentRef.current);
    };
    s.onerror = () => {
      console.error('Failed to load Twitter widget script');
    };
    document.head.appendChild(s);
  }, [loadTweet]);

  useEffect(() => { loadTweet(current); }, [current, loadTweet]);

  const prev = () => setCurrent(c => (c === 0 ? TWEET_IDS.length - 1 : c - 1));
  const next = () => setCurrent(c => (c === TWEET_IDS.length - 1 ? 0 : c + 1));

  return (
    <section id="dreams" className="section" style={{ background: 'var(--bg-surface)' }}>
      <div className="container">
        <h2 className="section-title">Oneira's Dreams</h2>
        <p className="section-subtitle">Every night at 8 PM EST, Oneira dreams.</p>

        <div className="carousel-wrap">
          <button onClick={prev} className="carousel-arrow" aria-label="Previous dream">&#8249;</button>
          <div className="carousel-embed liquid-glass-card">
            <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>
          <button onClick={next} className="carousel-arrow" aria-label="Next dream">&#8250;</button>
        </div>

        <p className="carousel-date">{DATES[current]}</p>

        <div className="carousel-dots">
          {TWEET_IDS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="carousel-dot"
              style={{
                width: i === current ? 24 : 8,
                background: i === current ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
              }}
              aria-label={`Dream ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
