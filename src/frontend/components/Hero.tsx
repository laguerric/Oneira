import React, { useState, useRef, useCallback } from 'react';

const CONTRACT = '5DKpFABHrtepo2NxR4B4TM3FfngtSN6L8mYkFU5epump';

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked; silently fail
    }
  }, []);

  return (
    <section id="hero" className="hero">
      {/* Subtle gradient orbs */}
      <div className="hero-orb" style={{ top: '20%', left: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(100,100,130,0.07), transparent 70%)' }} />
      <div className="hero-orb" style={{ bottom: '20%', right: '20%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(80,80,110,0.05), transparent 70%)' }} />

      {/* Main content */}
      <div className="hero-content animate-fade-in-up">
        <h1>Oneira</h1>
        <p className="hero-subtitle">
          AI Dream Agent Network with Real-Time Brain-Computer Interface.
          <br />
          <span>Detect nightmares. Prevent suffering. Advance sleep science.</span>
        </p>
        <div className="hero-ctas">
          <a href="https://x.com/OneiraEngine" target="_blank" rel="noopener noreferrer" className="liquid-glass-btn" style={{ padding: '12px 32px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            @OneiraEngine
          </a>
          <a href="https://x.com/owenbreakcode" target="_blank" rel="noopener noreferrer" className="liquid-glass-btn" style={{ padding: '12px 32px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            @owenbreakcode
          </a>
          <a href="https://github.com/laguerric/Oneira" target="_blank" rel="noopener noreferrer" className="liquid-glass-btn" style={{ padding: '12px 32px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 8 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub
          </a>
        </div>

        {/* Token address below CTAs */}
        <div id="token" className="hero-token">
          <div className="token-banner">
            <span style={{ color: 'var(--text-muted)' }}>CA:</span>
            <code style={{ userSelect: 'all' }}>{CONTRACT}</code>
            <button onClick={copy} className="liquid-glass-btn" style={{ padding: '4px 14px', fontSize: '0.7rem', borderRadius: 8 }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll animate-float">
        <div>Scroll</div>
        <div style={{ fontSize: '1.25rem', marginTop: 4 }}>↓</div>
      </div>
    </section>
  );
}
