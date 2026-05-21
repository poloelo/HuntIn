const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates optimized LinkedIn People Search URLs from job spec.
 * Returns an array of search URLs to try.
 */
function buildSearchUrls(jobSpec) {
  const keywords = [];

  // Core title keywords
  keywords.push(`"${jobSpec.job_title}"`);

  // Top required skills (up to 3)
  const skills = (jobSpec.required_skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  skills.slice(0, 3).forEach((s) => keywords.push(s));

  const query = keywords.join(' ');
  const locationParam = jobSpec.is_remote ? '' : jobSpec.location || '';

  const urls = [
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`,
  ];

  if (locationParam) {
    urls.push(
      `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&geoUrn=${encodeURIComponent(locationParam)}&origin=GLOBAL_SEARCH_HEADER`
    );
  }

  return urls;
}

/**
 * Launches Puppeteer and scrapes LinkedIn people search results.
 * Returns an array of raw candidate objects.
 */
async function scrapeLinkedIn(jobSpec, onProgress) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const searchUrls = buildSearchUrls(jobSpec);
    const candidates = [];

    for (const url of searchUrls) {
      if (onProgress) onProgress('Navigating to LinkedIn search...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Check if we got rate-limited or require login
      const pageTitle = await page.title();
      if (pageTitle.includes('Login') || pageTitle.includes('Sign In') || pageTitle.includes('Join')) {
        throw new Error(
          'LinkedIn requires login. Please provide LinkedIn session cookies in .env (LINKEDIN_COOKIE).'
        );
      }

      await page.waitForSelector('body', { timeout: 10000 });
      await sleep(2000);

      if (onProgress) onProgress('Extracting profiles...');

      const scraped = await page.evaluate(() => {
        const results = [];
        // LinkedIn search result cards
        const cards = document.querySelectorAll('.reusable-search__result-container, [data-chameleon-result-urn]');

        cards.forEach((card) => {
          const nameEl = card.querySelector('.actor-name, .entity-result__title-text a span[aria-hidden="true"]');
          const headlineEl = card.querySelector('.subline-level-1, .entity-result__primary-subtitle');
          const locationEl = card.querySelector('.subline-level-2, .entity-result__secondary-subtitle');
          const linkEl = card.querySelector('a[href*="/in/"]');

          if (!nameEl && !linkEl) return;

          results.push({
            name: nameEl ? nameEl.textContent.trim() : 'Unknown',
            headline: headlineEl ? headlineEl.textContent.trim() : '',
            location: locationEl ? locationEl.textContent.trim() : '',
            profile_url: linkEl ? linkEl.href.split('?')[0] : '',
          });
        });

        return results;
      });

      scraped.forEach((c) => {
        if (c.name !== 'Unknown' || c.profile_url) {
          candidates.push(c);
        }
      });

      if (candidates.length >= 10) break;
      await sleep(1500);
    }

    return candidates.slice(0, 15).map((c) => enrichCandidate(c, jobSpec));
  } finally {
    await browser.close();
  }
}

/**
 * Enrich a scraped candidate with inferred data from headline + job spec context.
 */
function enrichCandidate(candidate, jobSpec) {
  const headline = candidate.headline || '';
  const skills = [];

  // Extract skills mentioned in headline that match required skills
  const requiredSkills = (jobSpec.required_skills || '').split(',').map((s) => s.trim().toLowerCase());
  requiredSkills.forEach((skill) => {
    if (headline.toLowerCase().includes(skill)) skills.push(skill);
  });

  // Infer experience from headline patterns
  let experience_years = null;
  const expMatch = headline.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (expMatch) experience_years = parseInt(expMatch[1]);

  // Parse company from headline "Title at Company" or "Title | Company"
  let current_company = '';
  const atMatch = headline.match(/(?:at|@)\s+([^|·\n]+)/i);
  if (atMatch) current_company = atMatch[1].trim();

  return {
    id: uuidv4(),
    ...candidate,
    current_company,
    skills,
    experience_years,
    avatar_url: '',
  };
}

/**
 * Generate mock candidates when LinkedIn scraping is unavailable (demo mode).
 */
function generateMockCandidates(jobSpec) {
  const requiredSkills = (jobSpec.required_skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const title = jobSpec.job_title || 'Software Engineer';
  const location = jobSpec.location || 'San Francisco, CA';

  const mockProfiles = [
    { name: 'Alex Chen', headline: `Senior ${title} at Google`, location, experience_years: 7 },
    { name: 'Sarah Johnson', headline: `${title} Lead at Meta`, location, experience_years: 9 },
    { name: 'Marcus Williams', headline: `Staff ${title} | AWS`, location, experience_years: 11 },
    { name: 'Priya Patel', headline: `${title} at Stripe`, location, experience_years: 5 },
    { name: 'James Rodriguez', headline: `Principal ${title} at Netflix`, location, experience_years: 13 },
    { name: 'Emma Thompson', headline: `${title} at Airbnb`, location: 'Remote', experience_years: 4 },
    { name: 'David Kim', headline: `Senior ${title} | Uber`, location, experience_years: 8 },
    { name: 'Lisa Park', headline: `${title} Manager at Salesforce`, location, experience_years: 10 },
    { name: 'Tom Anderson', headline: `${title} at startup`, location: 'Remote', experience_years: 3 },
    { name: 'Nina Kapoor', headline: `Lead ${title} at Microsoft`, location, experience_years: 6 },
  ];

  return mockProfiles.map((p, i) => ({
    id: uuidv4(),
    ...p,
    current_company: p.headline.split(' at ').pop() || p.headline.split('| ').pop() || 'Unknown',
    skills: requiredSkills.slice(0, Math.floor(Math.random() * requiredSkills.length) + 1),
    profile_url: `https://www.linkedin.com/in/demo-profile-${i + 1}`,
    avatar_url: '',
  }));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scrapeLinkedIn, generateMockCandidates, buildSearchUrls };
