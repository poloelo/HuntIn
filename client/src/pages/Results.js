import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CandidateCard from '../components/CandidateCard';
import { Download, RefreshCw, ArrowLeft, Users, CheckCircle, AlertCircle, Filter, SortAsc } from 'lucide-react';
import './Results.css';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState(null);
  const [progress, setProgress] = useState({ status: 'connecting...', done: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [filterScore, setFilterScore] = useState(0);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const eventSourceRef = useRef(null);

  useEffect(() => {
    loadSearch();
  }, [id]);

  async function loadSearch() {
    try {
      const { data } = await axios.get(`/api/searches/${id}`);
      setSearch(data);
      if (data.status === 'running') {
        setRunning(true);
        connectSSE();
      }
    } catch {
      setError('Search not found.');
    }
  }

  function connectSSE() {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`/api/searches/${id}/progress`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'status' || data.type === 'warning') {
        setProgress((p) => ({ ...p, status: data.message }));
      } else if (data.type === 'progress') {
        setProgress({ status: `Scoring candidates (${data.done}/${data.total})...`, done: data.done, total: data.total });
      } else if (data.type === 'complete') {
        setRunning(false);
        es.close();
        loadSearch();
      } else if (data.type === 'error') {
        setError(data.message);
        setRunning(false);
        es.close();
      }
    };

    es.onerror = () => {
      setRunning(false);
      es.close();
      loadSearch();
    };
  }

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  async function handleExport() {
    window.open(`/api/searches/${id}/export`, '_blank');
  }

  async function handleRerun() {
    try {
      const { data } = await axios.post(`/api/searches/${id}/rerun`, { demo_mode: true });
      navigate(`/results/${data.id}`);
      window.location.reload();
    } catch {
      setError('Failed to rerun search.');
    }
  }

  const candidates = search?.candidates || [];

  // All distinct locations & skills for filter dropdowns
  const locations = [...new Set(candidates.map((c) => c.location).filter(Boolean))];
  const allSkills = [...new Set(candidates.flatMap((c) => c.matching_skills || []).filter(Boolean))];

  let filtered = candidates.filter((c) => {
    if (filterScore > 0 && c.score < filterScore) return false;
    if (filterLocation && c.location !== filterLocation) return false;
    if (filterSkill && !(c.matching_skills || []).includes(filterSkill)) return false;
    return true;
  });

  if (sortBy === 'score') filtered = [...filtered].sort((a, b) => b.score - a.score);
  else if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'experience') filtered = [...filtered].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  if (error) {
    return (
      <div className="results-page">
        <button className="btn-back" onClick={() => navigate('/')}><ArrowLeft size={16} /> New Search</button>
        <div className="error-state"><AlertCircle size={40} /><p>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <button className="btn-back" onClick={() => navigate('/')}><ArrowLeft size={14} /> Back</button>
        {search && (
          <div className="search-meta">
            <h1>{search.job_title} <span className="at">at</span> {search.company_name}</h1>
            <div className="meta-pills">
              {search.location && <span className="pill">{search.is_remote ? 'Remote' : search.location}</span>}
              {search.min_experience > 0 && <span className="pill">{search.min_experience}–{search.max_experience}yr exp</span>}
              <span className="pill pill-status">
                {search.status === 'completed' ? <><CheckCircle size={12} /> Completed</> : search.status === 'running' ? 'Running...' : search.status}
              </span>
            </div>
          </div>
        )}
        <div className="results-actions">
          {search?.status === 'completed' && (
            <>
              <button className="btn-secondary" onClick={handleRerun}><RefreshCw size={14} /> Rerun</button>
              <button className="btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="progress-container">
          <div className="progress-status">
            <span className="spinner-sm" />
            <span>{progress.status}</span>
          </div>
          {progress.total > 0 && (
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progressPct}%` }} />
              <span className="progress-pct">{progressPct}%</span>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {!running && candidates.length > 0 && (
        <div className="stats-bar">
          <div className="stat"><Users size={16} />{candidates.length} candidates found</div>
          <div className="stat good">{candidates.filter((c) => c.score >= 70).length} strong matches</div>
          <div className="stat avg">{candidates.filter((c) => c.score >= 50 && c.score < 70).length} good fits</div>
          <div className="stat bad">{candidates.filter((c) => c.score < 50).length} weak matches</div>
        </div>
      )}

      {/* Filters */}
      {candidates.length > 0 && (
        <div className="filters-bar">
          <Filter size={14} className="filter-icon" />
          <select className="filter-select" value={filterScore} onChange={(e) => setFilterScore(Number(e.target.value))}>
            <option value={0}>All scores</option>
            <option value={70}>70+ (Strong)</option>
            <option value={50}>50+ (Good)</option>
            <option value={80}>80+ (Excellent)</option>
          </select>

          {locations.length > 1 && (
            <select className="filter-select" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          {allSkills.length > 0 && (
            <select className="filter-select" value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
              <option value="">All skills</option>
              {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <SortAsc size={14} style={{ marginLeft: 'auto', color: '#64748b' }} />
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Sort: Score</option>
            <option value="name">Sort: Name</option>
            <option value="experience">Sort: Experience</option>
          </select>

          {(filterScore > 0 || filterLocation || filterSkill) && (
            <button className="btn-clear-filters" onClick={() => { setFilterScore(0); setFilterLocation(''); setFilterSkill(''); }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Candidate cards */}
      {!running && filtered.length === 0 && candidates.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>No candidates found yet.</p>
        </div>
      )}

      {!running && filtered.length === 0 && candidates.length > 0 && (
        <div className="empty-state">
          <Filter size={48} />
          <p>No candidates match your current filters.</p>
        </div>
      )}

      <div className="candidates-grid">
        {filtered.map((c, i) => (
          <CandidateCard key={c.id} candidate={c} rank={candidates.indexOf(c) + 1} />
        ))}
      </div>
    </div>
  );
}
