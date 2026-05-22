import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, MapPin, Briefcase, Star } from 'lucide-react';
import './CandidateCard.css';

function scoreColor(score) {
  if (score >= 70) return 'score-green';
  if (score >= 50) return 'score-orange';
  return 'score-red';
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Good';
  if (score >= 30) return 'Weak';
  return 'Poor';
}

function getInitials(name) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[hash];
}

export default function CandidateCard({ candidate: c, rank }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = scoreColor(c.score);
  const matchSkills = Array.isArray(c.matching_skills) ? c.matching_skills : [];

  return (
    <div className={`candidate-card ${colorClass}-border`}>
      <div className="card-header">
        <div className="rank-badge">#{rank}</div>
        <div className="avatar" style={{ background: avatarColor(c.name) }}>
          {getInitials(c.name)}
        </div>
        <div className="candidate-info">
          <div className="candidate-name">{c.name}</div>
          {c.headline && <div className="candidate-headline">{c.headline}</div>}
        </div>
        <div className={`score-badge ${colorClass}`}>
          <span className="score-number">{c.score}</span>
          <span className="score-label">{scoreLabel(c.score)}</span>
        </div>
      </div>

      <div className="card-meta">
        {c.location && (
          <span className="meta-item"><MapPin size={12} />{c.location}</span>
        )}
        {c.current_company && (
          <span className="meta-item"><Briefcase size={12} />{c.current_company}</span>
        )}
        {c.experience_years > 0 && (
          <span className="meta-item"><Star size={12} />{c.experience_years}yr exp</span>
        )}
      </div>

      {matchSkills.length > 0 && (
        <div className="skill-tags">
          {matchSkills.slice(0, 5).map((s) => (
            <span key={s} className="skill-tag">{s}</span>
          ))}
          {matchSkills.length > 5 && <span className="skill-tag skill-tag-more">+{matchSkills.length - 5}</span>}
        </div>
      )}

      {c.explanation && (
        <div className="explanation-section">
          <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
            AI Analysis {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {expanded && <p className="explanation-text">{c.explanation}</p>}
        </div>
      )}

      <div className="card-footer">
        {c.profile_url && c.profile_url.startsWith('https://www.linkedin.com/in/') && !c.profile_url.includes('demo-profile') ? (
          <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="profile-link">
            <ExternalLink size={13} /> View LinkedIn Profile
          </a>
        ) : (
          <span className="profile-link-demo">Demo profile</span>
        )}
        <div className={`score-bar-wrap`}>
          <div className={`score-bar ${colorClass}-bar`} style={{ width: `${c.score}%` }} />
        </div>
      </div>
    </div>
  );
}
