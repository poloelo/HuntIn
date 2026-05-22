const Anthropic = require('@anthropic-ai/sdk');

let client;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function scoreCandidate(candidate, jobSpec) {
  const prompt = `You are an expert recruiter AI. Analyze this candidate profile against the job requirements and provide a match score.

JOB REQUIREMENTS:
- Company: ${jobSpec.company_name}
- Title: ${jobSpec.job_title}
- Required Skills: ${jobSpec.required_skills}
- Nice-to-Have Skills: ${jobSpec.nice_to_have_skills || 'None specified'}
- Experience Required: ${jobSpec.min_experience || 0}–${jobSpec.max_experience || 20}+ years
- Location: ${jobSpec.is_remote ? 'Remote' : jobSpec.location || 'Flexible'}
- Job Description: ${jobSpec.job_description || 'Not provided'}

CANDIDATE PROFILE:
- Name: ${candidate.name}
- Current Title: ${candidate.headline || 'Unknown'}
- Current Company: ${candidate.current_company || 'Unknown'}
- Location: ${candidate.location || 'Unknown'}
- Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills || 'Not listed'}
- Years of Experience: ${candidate.experience_years || 'Unknown'}
- Profile URL: ${candidate.profile_url}

Respond ONLY with valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "explanation": "<2-3 sentence explanation of why this candidate matches or doesn't match>",
  "matching_skills": ["skill1", "skill2"],
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"]
}`;

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');

  return JSON.parse(jsonMatch[0]);
}

async function scoreCandidates(candidates, jobSpec, onProgress) {
  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    try {
      const scoring = await scoreCandidate(candidates[i], jobSpec);
      results.push({ ...candidates[i], ...scoring });
    } catch (err) {
      results.push({
        ...candidates[i],
        score: 0,
        explanation: 'Could not analyze this profile.',
        matching_skills: [],
        strengths: [],
        gaps: [],
      });
    }
    if (onProgress) onProgress(i + 1, candidates.length);
    // Respect rate limits
    if (i < candidates.length - 1) await sleep(300);
  }
  return results.sort((a, b) => b.score - a.score);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scoreCandidate, scoreCandidates };
