import React from 'react';

export default function Footer() {
  return (
    <footer className="footer" style={{ background: 'var(--bg-surface)' }}>
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3 className="font-serif">Oneira</h3>
            <p>AI Dream Network with Real-Time Brain-Computer Interface. Preventing nightmares. Advancing sleep science.</p>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li><a href="https://x.com/OneiraEngine" target="_blank" rel="noopener noreferrer">@OneiraEngine</a></li>
              <li><a href="https://x.com/owenbreakcode" target="_blank" rel="noopener noreferrer">@owenbreakcode (Creator)</a></li>
              <li><a href="https://github.com/laguerric/Oneira" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
            </ul>
          </div>
          <div>
            <h4>Token</h4>
            <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              5DKpFABHrtepo2NxR4B4TM3FfngtSN6L8mYkFU5epump
            </code>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Oneira. All rights reserved.</p>
          <p>Advancing sleep science through AI and neurotechnology.</p>
        </div>
      </div>
    </footer>
  );
}
