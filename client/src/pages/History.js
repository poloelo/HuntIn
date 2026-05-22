import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, ChevronRight, Trash2, RefreshCw, Users, AlertCircle } from 'lucide-react';
import './History.css';

export default function History() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSearches();
  }, []);

  async function loadSearches() {
    try {
      const { data } = await axios.get('/api/searches');
      setSearches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this search?')) return;
    await axios.delete(`/api/searches/${id}`);
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleRerun(e, search) {
    e.stopPropagation();
    try {
      const { data } = await axios.post(`/api/searches/${search.id}/rerun`, { demo_mode: true });
      navigate(`/results/${data.id}`);
    } catch {
      alert('Failed to rerun.');
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    if (status === 'completed') return <span className="badge badge-green">Completed</span>;
    if (status === 'running') return <span className="badge badge-blue">Running</span>;
    if (status === 'failed') return <span className="badge badge-red">Failed</span>;
    return <span className="badge badge-gray">{status}</span>;
  }

  if (loading) {
    return (
      <div className="history-page">
        <div className="page-header"><h1>Search History</h1></div>
        <div className="loading-state"><span className="spinner-sm" /> Loading...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>Search History</h1>
        <p className="subtitle">{searches.length} past searches</p>
      </div>

      {searches.length === 0 ? (
        <div className="empty-history">
          <Clock size={48} />
          <p>No searches yet. <button className="link-btn" onClick={() => navigate('/')}>Start your first search</button></p>
        </div>
      ) : (
        <div className="history-list">
          {searches.map((s) => (
            <div key={s.id} className="history-item" onClick={() => navigate(`/results/${s.id}`)}>
              <div className="history-main">
                <div className="history-title">
                  <span className="job-title">{s.job_title}</span>
                  <span className="at-company"> at {s.company_name}</span>
                </div>
                <div className="history-meta">
                  {s.location && <span className="history-location">{s.is_remote ? 'Remote' : s.location}</span>}
                  <span className="history-skills">{s.required_skills?.split(',').slice(0, 3).join(', ')}</span>
                </div>
              </div>

              <div className="history-stats">
                <span className="candidate-count"><Users size={13} />{s.candidate_count || 0}</span>
                {statusBadge(s.status)}
              </div>

              <div className="history-date">
                <Clock size={12} /> {formatDate(s.created_at)}
              </div>

              <div className="history-actions">
                <button className="icon-btn" title="Rerun search" onClick={(e) => handleRerun(e, s)}>
                  <RefreshCw size={14} />
                </button>
                <button className="icon-btn icon-btn-danger" title="Delete" onClick={(e) => handleDelete(e, s.id)}>
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="chevron" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
