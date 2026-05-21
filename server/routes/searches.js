const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { scoreCandidates } = require('../ai/scorer');
const { scrapeLinkedIn, generateMockCandidates } = require('../scraper/linkedin');

// Server-Sent Events progress map: searchId -> res
const progressStreams = new Map();

// POST /api/searches - create and run a new search
router.post('/', async (req, res) => {
  const {
    company_name,
    job_title,
    required_skills,
    nice_to_have_skills,
    min_experience,
    max_experience,
    location,
    is_remote,
    job_description,
    demo_mode,
  } = req.body;

  if (!company_name || !job_title || !required_skills) {
    return res.status(400).json({ error: 'company_name, job_title, and required_skills are required' });
  }

  const id = uuidv4();
  const db = getDb();

  db.prepare(`
    INSERT INTO searches (id, company_name, job_title, required_skills, nice_to_have_skills, min_experience, max_experience, location, is_remote, job_description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running')
  `).run(
    id, company_name, job_title, required_skills,
    nice_to_have_skills || '', min_experience || 0, max_experience || 20,
    location || '', is_remote ? 1 : 0, job_description || ''
  );

  res.json({ id, status: 'running' });

  // Run search async
  runSearch(id, req.body).catch((err) => {
    console.error('Search failed:', err.message);
    getDb().prepare("UPDATE searches SET status='failed', updated_at=datetime('now') WHERE id=?").run(id);
    sendProgress(id, { type: 'error', message: err.message });
  });
});

async function runSearch(searchId, jobSpec) {
  const db = getDb();
  sendProgress(searchId, { type: 'status', message: 'Starting LinkedIn search...' });

  let candidates;
  if (jobSpec.demo_mode) {
    sendProgress(searchId, { type: 'status', message: 'Generating demo candidates...' });
    candidates = generateMockCandidates(jobSpec);
  } else {
    try {
      candidates = await scrapeLinkedIn(jobSpec, (msg) => {
        sendProgress(searchId, { type: 'status', message: msg });
      });
    } catch (err) {
      sendProgress(searchId, { type: 'warning', message: `LinkedIn scraping failed: ${err.message}. Using demo data.` });
      candidates = generateMockCandidates(jobSpec);
    }
  }

  sendProgress(searchId, { type: 'status', message: `Found ${candidates.length} profiles. Scoring with AI...` });

  const scored = await scoreCandidates(candidates, jobSpec, (done, total) => {
    sendProgress(searchId, { type: 'progress', done, total });
  });

  // Persist candidates
  const insert = db.prepare(`
    INSERT INTO candidates (id, search_id, name, headline, current_company, location, skills, experience_years, profile_url, avatar_url, score, explanation, matching_skills)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((candidates) => {
    for (const c of candidates) {
      insert.run(
        c.id || uuidv4(), searchId,
        c.name, c.headline || '', c.current_company || '',
        c.location || '',
        JSON.stringify(Array.isArray(c.skills) ? c.skills : []),
        c.experience_years || 0,
        c.profile_url || '',
        c.avatar_url || '',
        c.score || 0,
        c.explanation || '',
        JSON.stringify(Array.isArray(c.matching_skills) ? c.matching_skills : [])
      );
    }
  });

  insertMany(scored);

  db.prepare("UPDATE searches SET status='completed', updated_at=datetime('now') WHERE id=?").run(searchId);
  sendProgress(searchId, { type: 'complete', message: 'Search complete!' });
}

function sendProgress(searchId, data) {
  const stream = progressStreams.get(searchId);
  if (stream) {
    stream.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.type === 'complete' || data.type === 'error') {
      stream.end();
      progressStreams.delete(searchId);
    }
  }
}

// GET /api/searches/:id/progress - SSE stream
router.get('/:id/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  progressStreams.set(req.params.id, res);

  req.on('close', () => {
    progressStreams.delete(req.params.id);
  });
});

// GET /api/searches - list all searches
router.get('/', (req, res) => {
  const db = getDb();
  const searches = db.prepare(`
    SELECT s.*, COUNT(c.id) as candidate_count
    FROM searches s
    LEFT JOIN candidates c ON c.search_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all();
  res.json(searches);
});

// GET /api/searches/:id - get search with candidates
router.get('/:id', (req, res) => {
  const db = getDb();
  const search = db.prepare('SELECT * FROM searches WHERE id=?').get(req.params.id);
  if (!search) return res.status(404).json({ error: 'Search not found' });

  const candidates = db.prepare('SELECT * FROM candidates WHERE search_id=? ORDER BY score DESC').all(req.params.id);

  const parsed = candidates.map((c) => ({
    ...c,
    skills: tryParseJSON(c.skills, []),
    matching_skills: tryParseJSON(c.matching_skills, []),
  }));

  res.json({ ...search, candidates: parsed });
});

// DELETE /api/searches/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM searches WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/searches/:id/rerun - rerun a search
router.post('/:id/rerun', async (req, res) => {
  const db = getDb();
  const search = db.prepare('SELECT * FROM searches WHERE id=?').get(req.params.id);
  if (!search) return res.status(404).json({ error: 'Search not found' });

  const newId = uuidv4();
  db.prepare(`
    INSERT INTO searches (id, company_name, job_title, required_skills, nice_to_have_skills, min_experience, max_experience, location, is_remote, job_description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running')
  `).run(
    newId, search.company_name, search.job_title, search.required_skills,
    search.nice_to_have_skills, search.min_experience, search.max_experience,
    search.location, search.is_remote, search.job_description
  );

  res.json({ id: newId, status: 'running' });
  runSearch(newId, { ...search, is_remote: !!search.is_remote, demo_mode: req.body.demo_mode }).catch(console.error);
});

// GET /api/searches/:id/export - CSV export
router.get('/:id/export', (req, res) => {
  const db = getDb();
  const search = db.prepare('SELECT * FROM searches WHERE id=?').get(req.params.id);
  if (!search) return res.status(404).json({ error: 'Search not found' });

  const candidates = db.prepare('SELECT * FROM candidates WHERE search_id=? ORDER BY score DESC').all(req.params.id);

  const header = 'Rank,Name,Headline,Company,Location,Score,Matching Skills,Profile URL,AI Explanation\n';
  const rows = candidates.map((c, i) => {
    const skills = tryParseJSON(c.matching_skills, []).join(' | ');
    const explanation = (c.explanation || '').replace(/"/g, '""');
    return `${i + 1},"${c.name}","${c.headline}","${c.current_company}","${c.location}",${c.score},"${skills}","${c.profile_url}","${explanation}"`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="talentradar-${search.job_title.replace(/\s+/g, '-')}.csv"`);
  res.send(header + rows.join('\n'));
});

function tryParseJSON(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

module.exports = router;
