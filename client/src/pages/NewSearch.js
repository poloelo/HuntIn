import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TagInput from '../components/TagInput';
import { Search, Briefcase, MapPin, Clock, FileText, Zap, Info } from 'lucide-react';
import './NewSearch.css';

const DEFAULT_FORM = {
  company_name: '',
  job_title: '',
  required_skills: [],
  nice_to_have_skills: [],
  min_experience: '',
  max_experience: '',
  location: '',
  is_remote: false,
  job_description: '',
  demo_mode: true,
};

export default function NewSearch() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.job_title.trim() || form.required_skills.length === 0) {
      setError('Company name, job title, and at least one required skill are needed.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills.join(','),
        nice_to_have_skills: form.nice_to_have_skills.join(','),
        min_experience: form.min_experience ? parseInt(form.min_experience) : 0,
        max_experience: form.max_experience ? parseInt(form.max_experience) : 20,
      };
      const { data } = await axios.post('/api/searches', payload);
      navigate(`/results/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start search. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="new-search">
      <div className="page-header">
        <h1>Find Top Talent</h1>
        <p className="subtitle">Describe the role and let AI find and rank the best candidates on LinkedIn.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="search-form" onSubmit={handleSubmit}>
        {/* Company & Title */}
        <div className="form-section">
          <h3 className="section-title"><Briefcase size={16} /> Job Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Job Title *</label>
              <input
                type="text"
                placeholder="e.g. Senior React Engineer"
                value={form.job_title}
                onChange={(e) => set('job_title', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="form-section">
          <h3 className="section-title"><Zap size={16} /> Skills</h3>
          <div className="form-group">
            <label>Required Skills * <span className="label-hint">Press Enter or comma to add</span></label>
            <TagInput
              tags={form.required_skills}
              onChange={(tags) => set('required_skills', tags)}
              placeholder="React, TypeScript, Node.js..."
            />
          </div>
          <div className="form-group">
            <label>Nice-to-Have Skills <span className="label-hint">Optional</span></label>
            <TagInput
              tags={form.nice_to_have_skills}
              onChange={(tags) => set('nice_to_have_skills', tags)}
              placeholder="GraphQL, AWS, Docker..."
            />
          </div>
        </div>

        {/* Experience & Location */}
        <div className="form-section">
          <h3 className="section-title"><MapPin size={16} /> Experience & Location</h3>
          <div className="form-row">
            <div className="form-group">
              <label><Clock size={13} style={{ marginRight: 4 }} />Min Years Experience</label>
              <input
                type="number"
                placeholder="e.g. 3"
                min="0" max="30"
                value={form.min_experience}
                onChange={(e) => set('min_experience', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Max Years Experience</label>
              <input
                type="number"
                placeholder="e.g. 10"
                min="0" max="30"
                value={form.max_experience}
                onChange={(e) => set('max_experience', e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                disabled={form.is_remote}
                className="input"
              />
            </div>
            <div className="form-group form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_remote}
                  onChange={(e) => set('is_remote', e.target.checked)}
                  className="checkbox"
                />
                <span>Remote OK</span>
              </label>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="form-section">
          <h3 className="section-title"><FileText size={16} /> Job Description</h3>
          <div className="form-group">
            <label>Full Job Description <span className="label-hint">Helps AI score candidates more accurately</span></label>
            <textarea
              placeholder="Paste your full job description here..."
              value={form.job_description}
              onChange={(e) => set('job_description', e.target.value)}
              className="textarea"
              rows={5}
            />
          </div>
        </div>

        {/* Demo mode toggle */}
        <div className="demo-banner">
          <Info size={15} />
          <div>
            <strong>Demo Mode {form.demo_mode ? 'ON' : 'OFF'}</strong>
            <span> — {form.demo_mode
              ? 'Uses generated profiles instead of live LinkedIn scraping (no login needed).'
              : 'Attempts live LinkedIn scraping via Puppeteer (requires valid LinkedIn session).'
            }</span>
          </div>
          <button type="button" className="btn-toggle" onClick={() => set('demo_mode', !form.demo_mode)}>
            {form.demo_mode ? 'Switch to Live' : 'Switch to Demo'}
          </button>
        </div>

        <button type="submit" className="btn-primary btn-large" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Starting search...
            </>
          ) : (
            <>
              <Search size={18} /> Search LinkedIn
            </>
          )}
        </button>
      </form>
    </div>
  );
}
