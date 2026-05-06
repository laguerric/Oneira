import React from 'react';

const sections = [
  {
    title: 'NIH Grant & Clinical Validation',
    text: 'Oneira is pursuing NIH funding to scale dream data collection across research communities. We are building an FDA-compliant clinical trial framework to treat PTSD nightmares — one of the most debilitating sleep disorders affecting 2-8% of the general population.',
  },
  {
    title: 'Multi-Platform Dream Collection',
    text: '5 parallel AI agents continuously monitor Reddit dream communities, Discord mental health spaces, academic RSS feeds, and direct X engagement to collect authentic dream reports. Every night, thousands of dreams are analyzed for biomarkers of trauma, anxiety, and sleep disorders.',
  },
  {
    title: 'Real-Time Brain-Computer Interface',
    text: 'EEG headsets stream 256 Hz neural data directly to our AI. We detect REM sleep, predict nightmare onset, and deliver closed-loop interventions — haptic feedback and binaural beats — to prevent nightmares before they devastate sleep quality.',
  },
  {
    title: 'Applications of Oneira',
    text: 'Beyond PTSD treatment, Oneira enables lucid dreaming research, sleep quality optimization, dream journaling at scale, and novel therapeutic interventions. The dream dataset we are building will be the largest of its kind — a public good for neuroscience.',
  },
];

const stats = [
  { value: '5', label: 'AI Agents in Parallel', detail: 'Twitter, Reddit, Discord, RSS, Orchestrator' },
  { value: '256 Hz', label: 'Real-Time EEG Sampling', detail: 'Muse & OpenBCI headset integration' },
  { value: '98%', label: 'REM Detection Accuracy', detail: 'ML model on sawtooth wave patterns' },
  { value: 'FDA', label: 'Clinical Trial Ready', detail: 'RCT framework for PTSD treatment' },
];

export default function ProjectVision() {
  return (
    <section id="vision" className="section" style={{ background: 'var(--bg-primary)' }}>
      <div className="container">
        <h2 className="section-title font-serif">Research & Vision</h2>
        <p className="section-subtitle">Building the future of sleep science and dream research.</p>

        <div className="vision-grid">
          <div className="vision-items">
            {sections.map((s, i) => (
              <div key={i} className="vision-item">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
            <div className="vision-item vision-creator">
              <h3>Creator</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Built by{' '}
                <a href="https://x.com/owenbreakcode" target="_blank" rel="noopener noreferrer">
                  Owen (@owenbreakcode)
                </a>
              </p>
            </div>
          </div>

          <div className="liquid-glass-card vision-stats">
            {stats.map((s, i) => (
              <div key={i} className={i < stats.length - 1 ? 'vision-stat' : ''}>
                <div className="vision-stat-value">{s.value}</div>
                <div className="vision-stat-label">{s.label}</div>
                <div className="vision-stat-detail">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
