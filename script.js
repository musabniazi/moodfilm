/* ============================================================
   FILE: script.js — MoodFilm Pro
   All API calls go to /api/gemini (our Vercel backend).
   No API keys are stored here — keys are hidden on the server.
   Anyone can use this site without entering any keys.
============================================================ */

const TMDB_IMG    = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_LG = "https://image.tmdb.org/t/p/w1280";
const MOVIES_PER_BATCH = 6;

const MOODS = [
  { id:"happy",      label:"Happy",      emoji:"😄", color:"#F59E0B", desc:"Feel-good & uplifting",  prompt:"uplifting, feel-good, comedy, heartwarming" },
  { id:"sad",        label:"Sad",        emoji:"😢", color:"#6366F1", desc:"Emotional & moving",     prompt:"emotional, tearjerker, drama, melancholy" },
  { id:"romantic",   label:"Romantic",   emoji:"❤️", color:"#EC4899", desc:"Love & passion",         prompt:"romantic, love story, passionate, relationship" },
  { id:"thriller",   label:"Thriller",   emoji:"🔍", color:"#0EA5E9", desc:"Mystery & suspense",     prompt:"mystery, detective, thriller, suspense, crime" },
  { id:"scifi",      label:"Sci-Fi",     emoji:"🤖", color:"#10B981", desc:"Sci-fi & innovation",    prompt:"science fiction, futuristic, space, technology" },
  { id:"action",     label:"Action",     emoji:"⚔️", color:"#EF4444", desc:"Intense & adrenaline",   prompt:"action, adventure, adrenaline, intense, fight" },
  { id:"horror",     label:"Horror",     emoji:"👻", color:"#7C3AED", desc:"Scary & suspenseful",    prompt:"horror, scary, psychological thriller, dark" },
  { id:"animation",  label:"Animation",  emoji:"🎨", color:"#F97316", desc:"Fun for all ages",       prompt:"animated, family, Pixar, Disney, Studio Ghibli" },
];

const LOCAL_MOVIES = {
  happy:     ["Inside Out","Home Alone","Coco","Jumanji","The Mask","Paddington","Wonka","Luca"],
  sad:       ["The Pursuit of Happyness","A Beautiful Mind","Life of Pi","The Green Mile","A Star Is Born","Manchester by the Sea"],
  romantic:  ["The Notebook","Titanic","La La Land","Pride and Prejudice","Notting Hill","Silver Linings Playbook"],
  thriller:  ["Knives Out","Shutter Island","Se7en","Gone Girl","Glass Onion","Zodiac","Murder on the Orient Express"],
  scifi:     ["Interstellar","The Matrix","Ex Machina","Arrival","Her","The Imitation Game","Ready Player One"],
  action:    ["Mad Max Fury Road","John Wick","Top Gun Maverick","Gladiator","The Raid","300","Avengers Infinity War"],
  horror:    ["Get Out","Hereditary","A Quiet Place","The Conjuring","Midsommar","It","The Shining"],
  animation: ["Spirited Away","Spider-Man Into the Spider-Verse","Princess Mononoke","Wall-E","Up","Toy Story","Your Name"],
};

const CONFETTI_COLORS = ["#e50914","#f5c518","#3b82f6","#10b981","#f97316","#ec4899","#8b5cf6"];

let state = {
  selectedMood: null,
  seen:         [],
  currentMovie: null,
  lastAction:   null,
  favorites:    [],
  searchQuery:  "",
};

/* ── CALL OUR BACKEND ──────────────────────────────────────
   All requests go to /api/gemini on our Vercel server.
   The server holds the real API keys and forwards the request.
   The browser never sees any API key.
*/
async function callBackend(type, payload) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

/* ── CALL GEMINI THROUGH BACKEND ── */
async function callAI(prompt) {
  const result = await callBackend('gemini', { prompt });
  return result.text || '';
}

/* ── TMDB THROUGH BACKEND ── */
async function tmdbSearch(title, year) {
  return callBackend('tmdb_search', { title, year });
}
async function tmdbDetail(id) {
  return callBackend('tmdb_detail', { id });
}
async function tmdbTrending() {
  return callBackend('tmdb_trending', {});
}


/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
  renderMoodCards();
  renderHeroParticles();
  setupSearch();
  loadTrending();
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 60);
  });
});


/* ══════════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════════ */
function toggleMobileMenu() {
  document.getElementById('nav-links')?.classList.toggle('open');
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}


/* ══════════════════════════════════════════════════════════
   HERO PARTICLES
══════════════════════════════════════════════════════════ */
function renderHeroParticles() {
  const c = document.getElementById('hero-particles');
  if (!c) return;
  for (let i = 0; i < 22; i++) {
    const d = document.createElement('div');
    d.className = 'hero-particle';
    d.style.cssText = `
      width:${3+Math.random()*7}px; height:${3+Math.random()*7}px;
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      opacity:${(.15+Math.random()*.5).toFixed(2)};
      animation-duration:${(5+Math.random()*10).toFixed(2)}s;
      animation-delay:${(Math.random()*8).toFixed(2)}s;
    `;
    c.appendChild(d);
  }
}


/* ══════════════════════════════════════════════════════════
   MOOD CARDS
══════════════════════════════════════════════════════════ */
function renderMoodCards() {
  const grid = document.getElementById('mood-grid');
  if (!grid) return;
  MOODS.forEach(mood => {
    const card = document.createElement('div');
    card.className = 'mood-card';
    card.id = `mood-${mood.id}`;
    card.style.setProperty('--mood-color', mood.color);
    card.innerHTML = `
      <div class="mood-card-emoji">${mood.emoji}</div>
      <div class="mood-card-label">${mood.label}</div>
      <div class="mood-card-desc">${mood.desc}</div>
      <div class="mood-dot"></div>
    `;
    card.addEventListener('click', () => pickMood(mood.id));
    grid.appendChild(card);
  });
}

function pickMood(moodId) {
  state.selectedMood = moodId;
  state.seen = [];
  const mood = MOODS.find(m => m.id === moodId);
  document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`mood-${moodId}`)?.classList.add('active');
  document.getElementById('results-title').textContent    = `${mood.emoji} ${mood.label} Movies`;
  document.getElementById('results-subtitle').textContent = mood.desc;
  state.lastAction = () => pickMood(moodId);
  showResults();
  fetchMovies(mood.prompt);
  setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
}


/* ══════════════════════════════════════════════════════════
   FETCH MOVIES FROM AI
══════════════════════════════════════════════════════════ */
async function fetchMovies(prompt) {
  showLoading(true);
  clearGrid();
  state.seen = [];

  try {
    const seenNote = '';
    const aiPrompt = `You are a professional movie curator.
Suggest exactly ${MOVIES_PER_BATCH} great ${prompt} movies.
Mix well-known classics with hidden gems. Include movies from different decades and countries.
${seenNote}

IMPORTANT: Return ONLY a raw JSON array. No markdown fences. No explanation. Nothing else.
Use this exact format:
[{"title":"Movie Title","year":2010,"why":"One sentence why it fits in max 12 words"}]`;

    const text   = await callAI(aiPrompt);
    const clean  = text.replace(/```json|```/g,'').trim();
    const movies = JSON.parse(clean);

    movies.forEach(m => state.seen.push(m.title));
    showLoading(false);

    const enriched = await enrichWithTMDb(movies, true);
    renderGrid(enriched, 'movies-grid');
    triggerConfetti();

  } catch (err) {
    console.error('fetchMovies error:', err);
    showLoading(false);
    fallbackMovies(state.selectedMood);
    showToast('Using curated picks', 'info');
  }
}

async function loadMoreMovies() {
  if (!state.selectedMood && !state.searchQuery) { showToast('Pick a mood first!','info'); return; }
  showToast('Loading more...','info');

  const mood     = MOODS.find(m => m.id === state.selectedMood);
  const promptTx = mood ? mood.prompt : state.searchQuery;
  const seenNote = state.seen.length > 0
    ? `Do NOT suggest: ${state.seen.slice(-8).join(', ')}.`
    : '';

  try {
    const aiPrompt = `You are a professional movie curator.
Suggest exactly ${MOVIES_PER_BATCH} more ${promptTx} movies. ${seenNote}
Include underrated gems, foreign films, and different decades.

IMPORTANT: Return ONLY a raw JSON array. No markdown. No explanation. Nothing else.
[{"title":"Movie Title","year":2010,"why":"One sentence why it fits in max 12 words"}]`;

    const text   = await callAI(aiPrompt);
    const clean  = text.replace(/```json|```/g,'').trim();
    const movies = JSON.parse(clean);

    movies.forEach(m => state.seen.push(m.title));
    const enriched = await enrichWithTMDb(movies, true);
    appendGrid(enriched, 'movies-grid');
    showToast(`✅ ${movies.length} more movies loaded!`, 'success');

  } catch (err) {
    console.error('loadMore error:', err);
    showToast('Could not load more. Try again.', 'error');
  }
}

async function fallbackMovies(moodId) {
  const local    = LOCAL_MOVIES[moodId] || LOCAL_MOVIES.action;
  const movies   = local.map(title => ({ title, year:'', why:'A great pick for this mood.' }));
  const enriched = await enrichWithTMDb(movies, true);
  renderGrid(enriched, 'movies-grid');
}


/* ══════════════════════════════════════════════════════════
   TMDb ENRICHMENT
══════════════════════════════════════════════════════════ */
async function enrichWithTMDb(movies, isAI = false) {
  return Promise.all(movies.map(async movie => {
    try {
      const searchData = await tmdbSearch(movie.title, movie.year);
      const result     = searchData.results?.[0];
      if (!result) throw new Error('not found');

      const detail = await tmdbDetail(result.id);
      const genres = detail.genres?.slice(0,2).map(g=>g.name).join(', ') || '';

      return {
        ...movie,
        title:    detail.title || movie.title,
        year:     detail.release_date?.slice(0,4) || movie.year || '',
        poster:   detail.poster_path   ? TMDB_IMG    + detail.poster_path   : null,
        backdrop: detail.backdrop_path ? TMDB_IMG_LG + detail.backdrop_path : null,
        rating:   detail.vote_average  ? detail.vote_average.toFixed(1)     : null,
        plot:     detail.overview || '',
        genres,
        tmdbId:   detail.id,
        isAI,
      };
    } catch {
      return { ...movie, poster:null, backdrop:null, rating:null, genres:'', tmdbId:null, plot:'', isAI };
    }
  }));
}

async function loadTrending() {
  const grid    = document.getElementById('trending-grid');
  const loading = document.getElementById('trending-loading');
  try {
    const data    = await tmdbTrending();
    const results = data.results?.slice(0,12) || [];
    if (loading) loading.style.display = 'none';

    const movies = results.map(r => ({
      title:    r.title,
      year:     r.release_date?.slice(0,4) || '',
      poster:   r.poster_path   ? TMDB_IMG    + r.poster_path   : null,
      backdrop: r.backdrop_path ? TMDB_IMG_LG + r.backdrop_path : null,
      rating:   r.vote_average  ? r.vote_average.toFixed(1)     : null,
      plot:     r.overview || '',
      genres:   '',
      tmdbId:   r.id,
      isAI:     false,
    }));

    const enriched = await Promise.all(movies.map(async m => {
      if (!m.tmdbId) return m;
      try {
        const d  = await tmdbDetail(m.tmdbId);
        m.genres = d.genres?.slice(0,2).map(g=>g.name).join(', ') || '';
      } catch {}
      return m;
    }));

    renderGrid(enriched, 'trending-grid');
  } catch (err) {
    console.error('Trending error:', err);
    if (loading) loading.textContent = '⚠️ Could not load trending movies.';
  }
}


/* ══════════════════════════════════════════════════════════
   MOVIE CARD RENDERING
══════════════════════════════════════════════════════════ */
function renderGrid(movies, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  if (!movies?.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎬</div><h3>No movies found</h3><p>Try a different mood or search</p></div>`;
    return;
  }
  movies.forEach((m, i) => grid.appendChild(buildCard(m, i)));
}

function appendGrid(movies, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.querySelector('.empty-state')?.remove();
  movies.forEach((m, i) => grid.appendChild(buildCard(m, i)));
}

function buildCard(movie, index) {
  const card    = document.createElement('div');
  card.className = 'movie-card';
  card.style.animationDelay = `${index * 0.06}s`;

  const isFav   = state.favorites.some(f => f.title === movie.title);
  const favIcon = isFav ? '❤️' : '🤍';
  const aiBadge = movie.isAI ? '<div class="ai-badge">AI PICK</div>' : '';

  const posterHTML = movie.poster
    ? `<img src="${movie.poster}" alt="${esc(movie.title)}" loading="lazy"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
       <div class="poster-fallback" style="display:none;"><div class="poster-fallback-icon">🎬</div><span>${esc(movie.title)}</span></div>`
    : `<div class="poster-fallback"><div class="poster-fallback-icon">🎬</div><span>${esc(movie.title)}</span></div>`;

  card.innerHTML = `
    <div class="movie-poster">
      ${posterHTML}
      <div class="poster-overlay">
        <div class="quick-btns">
          <button class="qbtn" title="Details" onclick="openModalBtn(event)">👁</button>
          <button class="qbtn" title="${isFav?'Remove':'Save'}" onclick="toggleFav(event,'${esc2(movie.title)}')">${favIcon}</button>
        </div>
      </div>
      ${aiBadge}
      <div class="fav-badge" onclick="toggleFav(event,'${esc2(movie.title)}')">${favIcon}</div>
    </div>
    <div class="movie-info">
      <div class="movie-title">${esc(movie.title)}</div>
      <div class="movie-meta">
        <span class="movie-year">${movie.year||'—'}</span>
        ${movie.rating?`<div class="movie-rating">⭐ ${movie.rating}</div>`:''}
      </div>
      ${movie.genres?`<span class="movie-genre">${movie.genres}</span>`:''}
    </div>
  `;

  card.addEventListener('click', e => {
    if (!e.target.closest('.qbtn') && !e.target.closest('.fav-badge')) openModal(movie);
  });
  card._data = movie;
  return card;
}

function openModalBtn(e) {
  e.stopPropagation();
  const card = e.target.closest('.movie-card');
  if (card?._data) openModal(card._data);
}


/* ══════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════ */
async function openModal(movie) {
  state.currentMovie = movie;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const isFav   = state.favorites.some(f => f.title === movie.title);

  content.innerHTML = `
    ${movie.backdrop ? `<div class="modal-hero"><img src="${movie.backdrop}" alt="${esc(movie.title)}" loading="lazy" /><div class="modal-hero-overlay"></div></div>` : ''}
    <div class="modal-body">
      <div class="modal-badges">
        ${movie.genres ? `<span class="mbadge mbadge-genre">${movie.genres}</span>` : ''}
        ${movie.year   ? `<span class="mbadge mbadge-year">${movie.year}</span>`    : ''}
        ${movie.rating ? `<span class="mbadge mbadge-rating">⭐ ${movie.rating}</span>` : ''}
      </div>
      <h2 class="modal-title">${esc(movie.title)}</h2>
      ${movie.why  ? `<div class="modal-why"><span>💡</span><span>${movie.why}</span></div>` : ''}
      ${movie.plot ? `<div class="modal-plot"><label>Plot</label>${movie.plot}</div>`        : ''}
      <div id="modal-extra">
        <button class="btn-secondary" onclick="loadModalExtra()" style="font-size:13px;padding:10px 20px;margin-bottom:20px;">
          🎞️ Get Cast, Director & Fun Fact
        </button>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" onclick="toggleFavModal()">
          ${isFav ? '❤️ Remove Favorite' : '🤍 Save to Favorites'}
        </button>
        <button class="btn-secondary" onclick="closeModalBtn()">Close</button>
      </div>
    </div>
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function loadModalExtra() {
  const section = document.getElementById('modal-extra');
  if (!section || !state.currentMovie) return;

  section.innerHTML = `<div class="loading-text" style="margin-bottom:20px;"><span class="spinner-sm"></span> Fetching details…</div>`;

  try {
    const aiPrompt = `You are a film expert. Tell me about the movie "${state.currentMovie.title}" (${state.currentMovie.year || 'unknown year'}).
IMPORTANT: Return ONLY a raw JSON object. No markdown. No explanation. Nothing else.
{"cast":"Top 3 actors comma separated","director":"Full director name","funFact":"One surprising fun fact about this film","watchOn":"Streaming platforms comma separated e.g. Netflix, Prime Video, Disney+"}`;

    const text  = await callAI(aiPrompt);
    const clean = text.replace(/```json|```/g,'').trim();
    const info  = JSON.parse(clean);

    const chips = info.watchOn
      ? info.watchOn.split(',').map(p=>`<span class="schip">${p.trim()}</span>`).join('')
      : '<span style="color:var(--text3);font-size:13px;">Check your streaming apps</span>';

    section.innerHTML = `
      <div class="modal-info-grid" style="margin-bottom:16px;">
        <div class="modal-info-item"><label>Director</label><span>${info.director}</span></div>
        <div class="modal-info-item"><label>Cast</label><span>${info.cast}</span></div>
      </div>
      <div class="fun-fact-box"><strong>⚡ Fun Fact:</strong> ${info.funFact}</div>
      <div class="streaming-row" style="margin-top:14px;"><label>Watch On:</label>${chips}</div>
    `;
  } catch {
    section.innerHTML = `<p style="color:var(--text3);font-size:13px;margin-bottom:20px;">Could not load details. Try again.</p>`;
  }
}

function closeModalBtn() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  state.currentMovie = null;
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalBtn();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const o = document.getElementById('modal-overlay');
    if (o?.classList.contains('active')) closeModalBtn();
  }
});


/* ══════════════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════════════ */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (input) input.addEventListener('keydown', e => { if (e.key==='Enter') handleSearch(); });
}

async function handleSearch() {
  const input = document.getElementById('search-input');
  const query = input?.value?.trim();
  if (!query) { showToast('Type something to search!', 'info'); return; }

  state.searchQuery  = query;
  state.selectedMood = null;
  state.seen         = [];

  document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
  document.getElementById('results-title').textContent    = `🔍 "${query}"`;
  document.getElementById('results-subtitle').textContent = 'AI search results';

  state.lastAction = () => handleSearch();
  showResults();
  clearGrid();
  showLoading(true);

  setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior:'smooth', block:'start' }), 120);

  try {
    const aiPrompt = `You are a professional movie curator.
The user wants to watch: "${query}"
Suggest exactly ${MOVIES_PER_BATCH} perfect matching movies.

IMPORTANT: Return ONLY a raw JSON array. No markdown. No explanation. Nothing else.
[{"title":"Movie Title","year":2010,"why":"One sentence why it matches in max 12 words"}]`;

    const text   = await callAI(aiPrompt);
    const clean  = text.replace(/```json|```/g,'').trim();
    const movies = JSON.parse(clean);

    movies.forEach(m => state.seen.push(m.title));
    showLoading(false);

    const enriched = await enrichWithTMDb(movies, true);
    renderGrid(enriched, 'movies-grid');
    triggerConfetti();
    showToast(`Found ${movies.length} movies!`, 'success');

  } catch (err) {
    console.error('Search error:', err);
    showLoading(false);
    showError('Search failed. Please try again.');
  }
}

function clearResults() {
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('search-input').value = '';
  state.searchQuery  = '';
  state.selectedMood = null;
  document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
}

function retryLastAction() {
  document.getElementById('error-state').style.display = 'none';
  if (state.lastAction) state.lastAction();
}


/* ══════════════════════════════════════════════════════════
   FAVORITES
══════════════════════════════════════════════════════════ */
function loadFavorites() {
  try {
    state.favorites = JSON.parse(localStorage.getItem('mf_favs') || '[]');
  } catch { state.favorites = []; }
  updateFavCount();
  if (state.favorites.length > 0) renderFavsSection();
}

function saveFavorites() {
  localStorage.setItem('mf_favs', JSON.stringify(state.favorites));
  updateFavCount();
  renderFavsSection();
}

function toggleFav(e, title) {
  e.stopPropagation();
  const card = e.target.closest('.movie-card');
  if (!card?._data) return;
  doToggleFav(card._data);
  const isFav = state.favorites.some(f => f.title === title);
  const icon  = isFav ? '❤️' : '🤍';
  card.querySelector('.fav-badge').textContent             = icon;
  card.querySelector('.qbtn:nth-child(2)').textContent     = icon;
}

function toggleFavModal() {
  if (!state.currentMovie) return;
  doToggleFav(state.currentMovie);
  openModal(state.currentMovie);
}

function doToggleFav(movie) {
  const idx = state.favorites.findIndex(f => f.title === movie.title);
  if (idx === -1) {
    state.favorites.push(movie);
    showToast(`❤️ "${movie.title}" saved!`, 'success');
  } else {
    state.favorites.splice(idx, 1);
    showToast(`Removed "${movie.title}"`, 'info');
  }
  saveFavorites();
}

function updateFavCount() {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = state.favorites.length;
}

function renderFavsSection() {
  const section = document.getElementById('favorites-section');
  if (!section) return;
  if (state.favorites.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  renderGrid(state.favorites, 'favorites-grid');
}

function scrollToFavorites() {
  if (state.favorites.length === 0) { showToast('No favorites yet! Click 🤍 to save movies.','info'); return; }
  document.getElementById('favorites-section')?.scrollIntoView({ behavior:'smooth' });
}


/* ══════════════════════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════════════════════ */
function triggerConfetti() {
  const c = document.getElementById('confetti-container');
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = `
      left:${5+Math.random()*90}%;
      width:${7+Math.random()*9}px;
      height:${7+Math.random()*9}px;
      border-radius:${Math.random()>.5?'50%':'3px'};
      background:${CONFETTI_COLORS[i%CONFETTI_COLORS.length]};
      animation:confetti ${(1.1+Math.random()*1.5).toFixed(2)}s ${(Math.random()*.7).toFixed(2)}s ease-in both;
    `;
    c.appendChild(p);
  }
  setTimeout(() => { c.innerHTML = ''; }, 2800);
}


/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
let toastT = null;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  if (toastT) clearTimeout(toastT);
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  toastT = setTimeout(() => {
    t.classList.add('hide');
    setTimeout(() => { t.className = 'toast'; }, 320);
  }, 3200);
}


/* ══════════════════════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════════════════════ */
function showLoading(v) {
  const l = document.getElementById('loading-state');
  const e = document.getElementById('error-state');
  if (l) l.style.display = v ? 'block' : 'none';
  if (e) e.style.display = 'none';
}

function showError(msg) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display   = 'block';
  document.getElementById('error-message').textContent   = msg;
}

function showResults() {
  document.getElementById('results-section').style.display = 'block';
}

function clearGrid() {
  const g = document.getElementById('movies-grid');
  if (g) g.innerHTML = '';
}

function esc(str)  { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function esc2(str) { return (str||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
