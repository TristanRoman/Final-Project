/****************************************************
 * SLIDE TOGGLE: Profiles ↔ Home
 ****************************************************/
const profileScreen = document.getElementById("profile-screen");
const homeScreen = document.getElementById("home-screen");
const continueBtn = document.getElementById("continue-btn");
const backToProfiles = document.getElementById("back-to-profiles");

continueBtn.addEventListener("click", () => {
  profileScreen.classList.remove("screen--active");
  homeScreen.classList.add("screen--active");
});

backToProfiles.addEventListener("click", () => {
  homeScreen.classList.remove("screen--active");
  profileScreen.classList.add("screen--active");
});

/****************************************************
 * TMDB CONFIG & HELPERS
 ****************************************************/

function normalizeTitleForTMDB(rawTitle) {
  let t = rawTitle;

  // 1) Remove trailing " (YYYY)"
  t = t.replace(/\s*\(\d{4}\)\s*$/, "");

  // 2) Drop anything after remaining "("
  if (t.includes("(")) {
    t = t.split("(")[0];
  }

  return t.trim();
}

// Put ONLY your TMDB v3 API key here
const TMDB_API_KEY = "10a13e01a5ebc4ed6f5e854db1d03e05";

// Image base URLs
const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

// Optional: local posters + generic fallback
const LOCAL_POSTERS = {
  // "Money Heist": "img/money-heist.jpg",
  // "Squid Game": "img/squid-game.jpg",
  // "Extraction": "img/extraction.jpg"
};

const FALLBACK_POSTER = "img/fallback-poster.jpg";

// --------- Core TMDB search helper ----------
async function fetchTMDBMovie(title) {
  try {
    const query = normalizeTitleForTMDB(title);

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error("TMDB HTTP error", res.status, title);
      return null;
    }

    const data = await res.json();
    if (!data.results || !data.results.length) {
      console.warn("TMDB: no results for", title, "(query:", query, ")");
      return null;
    }

    // Take the best match (first result)
    return data.results[0];
  } catch (err) {
    console.error("TMDB fetch failed for", title, err);
    return null;
  }
}

// --------- Poster helper with caching + fallback ----------
const posterCache = new Map();

async function applyPoster(cardEl, title) {
  const key = title.toLowerCase();

  // Cached decision?
  if (posterCache.has(key)) {
    const cached = posterCache.get(key);
    if (cached) {
      cardEl.style.backgroundImage = `url('${cached}')`;
    } else if (FALLBACK_POSTER) {
      cardEl.style.backgroundImage = `url('${FALLBACK_POSTER}')`;
    }
    return;
  }

  let posterUrl = null;

  // 1) Try TMDB
  const data = await fetchTMDBMovie(title);
  if (data && data.poster_path) {
    posterUrl = `${TMDB_POSTER_BASE}${data.poster_path}`;
  }

  // 2) Try local override
  if (!posterUrl && LOCAL_POSTERS[title]) {
    posterUrl = LOCAL_POSTERS[title];
  }

  // 3) Generic fallback
  if (!posterUrl && FALLBACK_POSTER) {
    posterUrl = FALLBACK_POSTER;
  }

  // Cache the choice (even if null so we don't hammer TMDB)
  posterCache.set(key, posterUrl);

  if (posterUrl) {
    cardEl.style.backgroundImage = `url('${posterUrl}')`;
  }
}

/****************************************************
 * HERO BANNER SLIDER (Hidden Trends + Matrix + TMDB)
 ****************************************************/

// Slide modes:
//  - "story"          -> Hidden Trends local hero
//  - "ratingsMatrix"  -> D3 heatmap + sliders
//  - "similarityVectors" -> cosine demo
//  - "tmdb"           -> TMDB-backed hero image
const heroSlides = [
  {
    id: "hidden-trends",
    mode: "story",
    title: "Hidden Trends",
    tag: "N SERIES",
    description:
      "In a city where every film is a living spell, a band of data mages dives through rating matrices and similarity graphs, revealing how hidden recommender algorithms quietly choose your next favorite movie.",
    customBackground: "img/hidden-trends-hero.png",
    yearOverride: "2025",
  },
  {
    id: "rating-matrix",
    mode: "ratingsMatrix",
    title: "The Rating Matrix (Data Foundation)",
    tag: "N SERIES",
    description:
      "Interactive heatmap of user–movie ratings. Use the sliders to reveal how sparse the data is and how patterns emerge as we add more users.",
  },
  {
    id: "similarity-part1",
    mode: "similarityVectors",
    title: "Similarity Calculations (Part 1)",
    tag: "N SERIES",
    description:
      "Genre-space playground: pick two movies to see their vectors in genre space and how the angle between them becomes cosine similarity—the math behind “these feel alike.”",
  },
  {
  id: "hero-panel-venn",
  mode: "jaccardVenn",          // or whatever your JS switch uses
  title: "Similarity Calculations (Part 2)",
  tag: "N SERIES",
  description:
    "Explore how users overlap across three movies. Move the rating slider and watch the Venn regions shift — a visual demo of Jaccard similarity in action."
}
/*,
  {
    id: "squid-game",
    mode: "tmdb",
    title: "Squid Game",
    tag: "N SERIES",
  },
  {
    id: "extraction",
    mode: "tmdb",
    title: "Extraction",
    tag: "FILM",
  },*/
];

let currentHeroIndex = 0;

/****************************************************
 * Rating matrix data + D3 helpers
 ****************************************************/

let ratingMatrixRaw = [];
let ratingMatrixByUser = [];
let ratingUsersMax = 0;
let ratingMoviesMax = 0;
let ratingHeatmapSvg = null;
let ratingMatrixReady = false;

async function ensureRatingMatrixDataLoaded() {
  if (ratingMatrixReady) return;

  try {
    const res = await fetch("data/ratings_matrix.json");
    ratingMatrixRaw = await res.json();

    ratingUsersMax = 1 + d3.max(ratingMatrixRaw, (d) => d.user_idx);
    ratingMoviesMax = 1 + d3.max(ratingMatrixRaw, (d) => d.movie_idx);

    ratingMatrixByUser = Array.from({ length: ratingUsersMax }, () =>
      Array(ratingMoviesMax).fill(null)
    );

    ratingMatrixRaw.forEach((d) => {
      ratingMatrixByUser[d.user_idx][d.movie_idx] = d.rating;
    });

    ratingMatrixReady = true;
  } catch (err) {
    console.error("Failed to load ratings_matrix.json", err);
  }
}

async function initRatingMatrixHero() {
  await ensureRatingMatrixDataLoaded();
  if (!ratingMatrixReady) return;

  const panel = document.getElementById("hero-matrix-panel");
  if (!panel) return;

  // Only fully wire up D3 + sliders once
  if (!ratingHeatmapSvg) {
    ratingHeatmapSvg = d3.select("#matrix-heatmap");

    const width = 520;
    const height = 260;
    ratingHeatmapSvg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    ratingHeatmapSvg.append("g").attr("class", "cells");

    const threshSlider = document.getElementById("threshold-slider");
    const usersSlider = document.getElementById("usercount-slider");
    const threshLabel = document.getElementById("threshold-value");
    const usersLabel = document.getElementById("usercount-value");

    usersSlider.max = ratingUsersMax;

    const defaultThreshold = 1.0;
    const defaultUsers = Math.min(40, ratingUsersMax);

    threshSlider.value = defaultThreshold;
    usersSlider.value = defaultUsers;

    function handleChange() {
      const threshold = parseFloat(threshSlider.value);
      const userCount = parseInt(usersSlider.value, 10);

      threshLabel.textContent = `≥ ${threshold.toFixed(1)}`;
      usersLabel.textContent = `${userCount} user${userCount > 1 ? "s" : ""}`;

      renderRatingMatrix(threshold, userCount, width, height);
    }

    threshSlider.addEventListener("input", handleChange);
    usersSlider.addEventListener("input", handleChange);

    handleChange();
  }
}

function renderRatingMatrix(threshold, userCount, width, height) {
  if (!ratingMatrixReady || !ratingHeatmapSvg) return;

  const nMovies = ratingMoviesMax;
  const cellWidth = width / nMovies;
  const cellHeight = height / userCount;

  const cells = [];
  for (let u = 0; u < userCount; u++) {
    const row = ratingMatrixByUser[u];
    if (!row) continue;
    for (let m = 0; m < nMovies; m++) {
      const r = row[m];
      if (r != null && r >= threshold) {
        cells.push({ u, m, rating: r });
      }
    }
  }

  const color = d3
    .scaleLinear()
    .domain([1, 5])
    .range(["#1f2937", "#e50914"]); // dark slate -> Netflix red

  const g = ratingHeatmapSvg.select("g.cells");

  const rects = g.selectAll("rect").data(cells, (d) => `${d.u}-${d.m}`);

  rects
    .enter()
    .append("rect")
    .attr("x", (d) => d.m * cellWidth)
    .attr("y", (d) => d.u * cellHeight)
    .attr("width", cellWidth - 1)
    .attr("height", cellHeight - 1)
    .attr("fill", (d) => color(d.rating))
    .attr("opacity", 0.9)
    .append("title")
    .text(
      (d) =>
        `User ${d.u + 1} · Movie ${d.m + 1} · Rating ${d.rating.toFixed(1)}`
    );

  rects
    .attr("x", (d) => d.m * cellWidth)
    .attr("y", (d) => d.u * cellHeight)
    .attr("width", cellWidth - 1)
    .attr("height", cellHeight - 1)
    .attr("fill", (d) => color(d.rating));

  rects.exit().remove();
}

/****************************************************
 * SLIDE 3: SIMILARITY VECTORS (cosine demo)
 ****************************************************/

// simple genre basis we’ll use for the vectors
const SIM_AXES = [
  { id: "Action", angle: (270 * Math.PI) / 180, color: "#f97316" }, // orange, down
  { id: "Comedy", angle: (330 * Math.PI) / 180, color: "#3b82f6" }, // blue, right-ish
  { id: "Romance", angle: (150 * Math.PI) / 180, color: "#ec4899" }, // pink, left-up
];

const SIM_MOVIES = [
  { id: "sudden-death", title: "Sudden Death", genres: ["Action"] },
  {
    id: "nine-months",
    title: "Nine Months",
    genres: ["Comedy", "Romance"],
  },
  {
    id: "the-mask",
    title: "The Mask",
    genres: ["Action", "Comedy"],
  },
  {
    id: "paris-i-love-you",
    title: "Paris, I Love You",
    genres: ["Romance"],
  },
];

let simInitialized = false;

function simMovieVector2D(movie) {
  let dx = 0;
  let dy = 0;
  movie.genres.forEach((g) => {
    const axis = SIM_AXES.find((a) => a.id === g);
    if (!axis) return;
    dx += Math.cos(axis.angle);
    dy += Math.sin(axis.angle);
  });
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

function simCosine(v1, v2) {
  const dot = v1.dx * v2.dx + v1.dy * v2.dy;
  return dot; // vectors are already normalized
}

function simAngleDeg(v1, v2) {
  const cos = Math.max(-1, Math.min(1, simCosine(v1, v2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

async function initSimilarityHero() {
  if (simInitialized) return;

  const panel = document.getElementById("hero-sim-panel");
  if (!panel) return;

  // ----- SVG setup -----
  const svg = d3.select("#sim-vectors");
  const width = 520;
  const height = 260;
  const origin = { x: width / 2, y: height * 0.65 };
  const radius = 140;

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const gAxes = svg.append("g").attr("class", "sim-axes");
  const gMovies = svg.append("g").attr("class", "sim-movie-vectors");
  const gArc = svg.append("g").attr("class", "sim-angle-arc");

  // draw genre axes
  SIM_AXES.forEach((axis) => {
    const x2 = origin.x + radius * Math.cos(axis.angle);
    const y2 = origin.y + radius * Math.sin(axis.angle);

    gAxes
      .append("line")
      .attr("x1", origin.x)
      .attr("y1", origin.y)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", axis.color)
      .attr("stroke-width", 3);

    gAxes
      .append("text")
      .attr("x", x2)
      .attr("y", y2)
      .attr("dy", axis.id === "Action" ? 18 : -8)
      .attr("text-anchor", "middle")
      .attr("fill", "#e5e7eb")
      .attr("font-size", 12)
      .text(axis.id);
  });

  // one vector per movie (we’ll recolor the selected two)
  const movieVecData = SIM_MOVIES.map((m) => {
    const v = simMovieVector2D(m);
    const angle = Math.atan2(v.dy, v.dx);
    const x2 = origin.x + radius * Math.cos(angle);
    const y2 = origin.y - radius * Math.sin(angle);
    return { movie: m, angle, x2, y2 };
  });

  const movieLines = gMovies
    .selectAll("line")
    .data(movieVecData)
    .enter()
    .append("line")
    .attr("x1", origin.x)
    .attr("y1", origin.y)
    .attr("x2", (d) => d.x2)
    .attr("y2", (d) => d.y2)
    .attr("stroke", "#6b7280")
    .attr("stroke-width", 2)
    .attr("opacity", 0.5);

  // angle arc
  const angleArcPath = gArc
    .append("path")
    .attr("fill", "none")
    .attr("stroke", "#a855f7")
    .attr("stroke-width", 2)
    .attr("opacity", 0);

  const angleArcLabel = gArc
    .append("text")
    .attr("fill", "#a855f7")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("opacity", 0);

  function updateAngleArc(d1, d2) {
    if (!d1 || !d2) {
      angleArcPath.attr("opacity", 0);
      angleArcLabel.attr("opacity", 0);
      return;
    }

    const v1 = simMovieVector2D(d1.movie);
    const v2 = simMovieVector2D(d2.movie);
    const angle1 = Math.atan2(v1.dy, v1.dx);
    const angle2 = Math.atan2(v2.dy, v2.dx);

    let start = angle1;
    let end = angle2;
    if (end < start) [start, end] = [end, start];

    const mid = (start + end) / 2;
    const arcR = 60;

    const arc = d3
      .arc()
      .innerRadius(arcR)
      .outerRadius(arcR + 1)
      .startAngle(start)
      .endAngle(end);

    angleArcPath
      .attr(
        "transform",
        `translate(${origin.x}, ${origin.y}) scale(1, -1)` // flip Y
      )
      .attr("d", arc())
      .attr("opacity", 1);

    const labelX = origin.x + (arcR + 15) * Math.cos(mid);
    const labelY = origin.y - (arcR + 15) * Math.sin(mid);

    const angleDeg = simAngleDeg(v1, v2).toFixed(1);
    angleArcLabel
      .attr("x", labelX)
      .attr("y", labelY)
      .text(`${angleDeg}°`)
      .attr("opacity", 1);
  }

  // ----- Movie list + interactions (no similarity slider) -----
  const listEl = document.getElementById("sim-movie-list");
  const resultTextEl = document.getElementById("sim-result-text");
  const calcBtn = document.getElementById("sim-calc-btn");

  SIM_MOVIES.forEach((m) => {
    const item = document.createElement("button");
    item.className = "sim-movie-item";
    item.type = "button";
    item.dataset.movieId = m.id;
    item.innerHTML = `
      <div class="sim-movie-title">${m.title}</div>
      <div class="sim-movie-genres">${m.genres.join(", ")}</div>`;
    listEl.appendChild(item);
  });

  function getSelectedMovieIds() {
    return Array.from(
      listEl.querySelectorAll(".sim-movie-item.selected")
    ).map((el) => el.dataset.movieId);
  }

  listEl.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".sim-movie-item");
    if (!btn) return;

    let selected = getSelectedMovieIds();

    if (btn.classList.contains("selected")) {
      btn.classList.remove("selected");
      selected = selected.filter((id) => id !== btn.dataset.movieId);
    } else {
      if (selected.length >= 2) {
        const last = selected[selected.length - 1];
        listEl
          .querySelectorAll(".sim-movie-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        const keep = listEl.querySelector(
          `.sim-movie-item[data-movie-id="${last}"]`
        );
        if (keep) keep.classList.add("selected");
      }
      btn.classList.add("selected");
    }

    resultTextEl.textContent =
      "Select exactly two movies above, then hit “Calculate”.";
  });

  calcBtn.addEventListener("click", () => {
    const ids = getSelectedMovieIds();
    if (ids.length !== 2) {
      resultTextEl.textContent =
        "Select exactly two movies above to calculate similarity.";
      return;
    }

    const mA = SIM_MOVIES.find((m) => m.id === ids[0]);
    const mB = SIM_MOVIES.find((m) => m.id === ids[1]);

    const vA = simMovieVector2D(mA);
    const vB = simMovieVector2D(mB);

    const cos = simCosine(vA, vB);
    const angleDeg = simAngleDeg(vA, vB);

    // highlight selected vectors
    movieLines
      .attr("stroke", (d) => (ids.includes(d.movie.id) ? "#ffffff" : "#4b5563"))
      .attr("stroke-width", (d) => (ids.includes(d.movie.id) ? 3 : 2))
      .attr("opacity", (d) => (ids.includes(d.movie.id) ? 1 : 0.35));

    const d1 = movieVecData.find((d) => d.movie.id === ids[0]);
    const d2 = movieVecData.find((d) => d.movie.id === ids[1]);
    updateAngleArc(d1, d2);

    resultTextEl.textContent = `${mA.title} and ${mB.title} have cosine similarity ${cos.toFixed(
      3
    )} (≈ ${angleDeg.toFixed(
      1
    )}°). Smaller angles mean the movies “live” closer together in genre space.`;
  });

  simInitialized = true;
}

/****************************************************
 * Main hero renderer
 ****************************************************/
async function renderHero(index) {
  const slide = heroSlides[index];

  const banner = document.querySelector(".hero-banner");
  const titleEl = document.getElementById("hero-title");
  const descEl = document.getElementById("hero-description");
  const metaEl = document.getElementById("hero-meta");
  const tagEl = document.querySelector(".hero-tag");
  const matrixPanel = document.getElementById("hero-matrix-panel");
  const simPanel = document.getElementById("hero-sim-panel");
  const vennPanel = document.getElementById("hero-panel-venn");  

  // Reset meta + hide both interactive panels by default
  metaEl.innerHTML = "";
  if (matrixPanel) matrixPanel.classList.add("hero-matrix-panel--hidden");
  if (simPanel) simPanel.classList.add("hero-panel--hidden");
  if (vennPanel) vennPanel.classList.add("hero-panel--hidden");

  const metaParts = [];
  tagEl.textContent = slide.tag || "";

  /* MODE: ratingsMatrix  (Section 2 heatmap hero) */
  if (slide.mode === "ratingsMatrix") {
    banner.style.backgroundImage = "none";
    banner.style.backgroundColor = "#020617";

    titleEl.textContent = slide.title;
    descEl.textContent = slide.description;

    metaParts.push("User–Movie Ratings Matrix");
    metaParts.push("Try the sliders →");
    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });

    if (matrixPanel) {
      matrixPanel.classList.remove("hero-matrix-panel--hidden");
    }

    await initRatingMatrixHero();
    return;
  }

  /* MODE: similarityVectors  (Section 3 cosine demo) */
  if (slide.mode === "similarityVectors") {
    banner.style.backgroundImage = "none";
    banner.style.backgroundColor = "#020617";

    titleEl.textContent = slide.title;
    descEl.textContent = slide.description;

    metaParts.push("Movie Vectors · Cosine Similarity");
    metaParts.push("Try the buttons →");
    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });

    if (simPanel) {
      simPanel.classList.remove("hero-panel--hidden");
    }

    await initSimilarityHero();
    return;
  }
    /* MODE: jaccardVenn  (Section 4 Venn / Jaccard demo) */
  if (slide.mode === "jaccardVenn") {
    banner.style.backgroundImage = "none";
    banner.style.backgroundColor = "#020617";

    titleEl.textContent = slide.title;
    descEl.textContent = slide.description;

    metaParts.push("Audience Overlap · Jaccard");
    metaParts.push("Try the slider →");
    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });

    if (vennPanel) {
      vennPanel.classList.remove("hero-panel--hidden");
    }

    // Venn JS already wired up to #venn-4 + thresholdSlider-4,
    // no extra init needed here.
    return;
  }

  /* MODE: story  (Hidden Trends hero with local image) */
  if (slide.mode === "story" && slide.customBackground) {
    banner.style.backgroundImage = `url('${slide.customBackground}')`;
    banner.style.backgroundColor = "#000";

    titleEl.textContent = slide.title || "";
    descEl.textContent = slide.description || "";

    if (slide.yearOverride) {
      metaParts.push(slide.yearOverride);
    }
    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });

    return;
  }

  /* MODE: tmdb  (default Netflix-style hero) */
  const data = await fetchTMDBMovie(slide.title);
  if (!data) return;

  if (data.backdrop_path) {
    banner.style.backgroundImage = `url('${TMDB_BACKDROP_BASE}${data.backdrop_path}')`;
  } else if (data.poster_path) {
    banner.style.backgroundImage = `url('${TMDB_POSTER_BASE}${data.poster_path}')`;
  }

  titleEl.textContent = data.title || slide.title;
  descEl.textContent = data.overview || "";

  if (data.release_date) {
    metaParts.push(data.release_date.slice(0, 4));
  }
  if (typeof data.vote_average === "number" && data.vote_average > 0) {
    metaParts.push(`TMDB ${data.vote_average.toFixed(1)}`);
  }

  metaParts.forEach((txt) => {
    const span = document.createElement("span");
    span.textContent = txt;
    metaEl.appendChild(span);
  });
}

const heroArrowLeft = document.querySelector(".hero-arrow--left");
const heroArrowRight = document.querySelector(".hero-arrow--right");

heroArrowLeft.addEventListener("click", () => {
  currentHeroIndex =
    (currentHeroIndex - 1 + heroSlides.length) % heroSlides.length;
  renderHero(currentHeroIndex);
});

heroArrowRight.addEventListener("click", () => {
  currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
  renderHero(currentHeroIndex);
});

// Initial hero
renderHero(currentHeroIndex);

/****************************************************
 * ROW ARROW SCROLLING (both rows)
 ****************************************************/

const ROW_SCROLL_AMOUNT = 320; // px per click

document.querySelectorAll(".row-arrow").forEach((btn) => {
  const targetId = btn.dataset.target;
  const direction = btn.classList.contains("row-arrow--left") ? -1 : 1;

  btn.addEventListener("click", () => {
    const scroller = document.getElementById(targetId);
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * ROW_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  });
});

/****************************************************
 * RECOMMENDER DATA (movies_meta + demo_recs)
 ****************************************************/

let moviesDS = []; // from movies_meta.json
let demoRecsDS = {}; // from demo_recs.json (not used in logic, just available)
let moviesById = new Map(); // movieId -> movie meta

async function loadRecommenderData() {
  try {
    const [movRes, recRes] = await Promise.all([
      fetch("data/movies_meta.json"),
      fetch("data/demo_recs.json"),
    ]);

    moviesDS = await movRes.json();
    demoRecsDS = await recRes.json(); // kept for reference

    moviesById = new Map(moviesDS.map((m) => [String(m.movieId), m]));

    initFavoritesAndRecs();
  } catch (err) {
    console.error("Error loading recommender data:", err);
  }
}

loadRecommenderData();

/****************************************************
 * FAVORITES ROW + RECOMMENDATIONS ROW
 ****************************************************/

function initFavoritesAndRecs() {
  const favRow = document.getElementById("row-new");
  const recRow = document.getElementById("row-trending");

  if (!favRow || !recRow || !moviesDS.length) {
    console.warn("Missing DOM nodes or movie data for recommender.");
    return;
  }

  favRow.innerHTML = "";
  recRow.innerHTML = "";

  const favoriteSlice = moviesDS.slice(0, 14);

  favoriteSlice.forEach((m) => {
    const card = document.createElement("div");
    card.className = "movie-card fav-card";
    card.dataset.movieId = m.movieId;
    card.dataset.title = m.title;

    if (m.posterUrl) {
      card.style.backgroundImage = `url('${m.posterUrl}')`;
    }

    applyPoster(card, m.title);

    card.addEventListener("click", () => {
      card.classList.toggle("selected");
      updateRecommendations();
    });

    favRow.appendChild(card);
  });

  showRecHint("Pick at least 3 favorites above to unlock recommendations.");
}

function getSelectedMovieIds() {
  return Array.from(
    document.querySelectorAll("#row-new .movie-card.selected")
  ).map((c) => String(c.dataset.movieId));
}

function showRecHint(message) {
  const recRow = document.getElementById("row-trending");
  recRow.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "rec-hint";
  msg.textContent = message;
  recRow.appendChild(msg);
}

/****************************************************
 * SIMPLE GENRE-BASED RECOMMENDER
 ****************************************************/

function getGenres(movieId) {
  const meta = moviesById.get(String(movieId));
  if (!meta || !meta.genres) return [];

  if (Array.isArray(meta.genres)) return meta.genres;
  return meta.genres
    .split("|")
    .map((g) => g.trim())
    .filter(Boolean);
}

function jaccard(aArr, bArr) {
  const a = new Set(aArr);
  const b = new Set(bArr);
  if (!a.size && !b.size) return 0;

  let inter = 0;
  for (const v of a) {
    if (b.has(v)) inter++;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

async function updateRecommendations() {
  const recRow = document.getElementById("row-trending");
  if (!recRow) return;

  const selectedIds = getSelectedMovieIds();
  recRow.innerHTML = "";

  if (selectedIds.length < 3) {
    showRecHint("Pick at least 3 favorites above to unlock recommendations.");
    return;
  }

  const selectedMeta = selectedIds
    .map((id) => ({
      id,
      genres: getGenres(id),
    }))
    .filter((m) => m.genres.length);

  if (!selectedMeta.length) {
    showRecHint("No genre info for selected movies.");
    return;
  }

  const scores = [];

  for (const m of moviesDS) {
    const id = String(m.movieId);

    if (selectedIds.includes(id)) continue;

    const g = getGenres(id);
    if (!g.length) continue;

    let best = 0;
    for (const fav of selectedMeta) {
      const sim = jaccard(g, fav.genres);
      if (sim > best) best = sim;
    }

    if (best > 0) {
      scores.push({ movieId: id, title: m.title, score: best });
    }
  }

  if (!scores.length) {
    showRecHint("No recommendations found for these favorites.");
    return;
  }

  scores.sort((a, b) => b.score - a.score);
  const topRecs = scores.slice(0, 14);

  for (const rec of topRecs) {
    const card = document.createElement("div");
    card.className = "movie-card rec-card";
    card.title = `${rec.title} (similarity: ${rec.score.toFixed(2)})`;

    const meta = moviesById.get(rec.movieId);
    if (meta && meta.posterUrl) {
      card.style.backgroundImage = `url('${meta.posterUrl}')`;
    }

    applyPoster(card, rec.title);

    recRow.appendChild(card);
  }
}


/****************************************************
 * SLIDE 4: Venn / Jaccard Similarity
 ****************************************************/

// Movies for the Venn diagram
const VENN_MOVIES = [
  "Toy Story (1995)",
  "Willy Wonka & the Chocolate Factory (1971)",
  "Aladdin (1992)"
];

const VENN_MAX_EXAMPLES = 10;

let vennAllData4 = [];
let vennChart4 = null;

// DOM bindings (note the -4 suffix)
const tooltip4 = d3.select("#tooltip-4");
const vennContainer4 = d3.select("#venn-4");
const statusMessage4 = d3.select("#statusMessage-4");
const thresholdSlider4 = document.getElementById("thresholdSlider-4");
const thresholdValue4 = document.getElementById("thresholdValue-4");

d3.csv("data/venn.csv", function row(d) {
  return {
    userId: +d.userId,
    movieId: +d.movieId,
    movie: d.movie,
    rating: +d.rating
  };
})
  .then(function (rows) {
    // Only keep rows for our 3 movies
    vennAllData4 = rows.filter(r => VENN_MOVIES.indexOf(r.movie) !== -1);

    if (vennAllData4.length === 0) {
      statusMessage4.text("No rows found.");
      return;
    }

    const initialThreshold = parseFloat(thresholdSlider4.value);
    renderVennForThreshold4(initialThreshold);
  })
  .catch(function (err) {
    console.error("Error loading venn.csv:", err);
    statusMessage4.text("Error loading csv");
  });


// Build Venn data for given threshold
function buildVennData4(threshold) {
  const filtered = vennAllData4.filter(d => d.rating >= threshold);

  // Build user sets per movie
  const userSets = {};
  VENN_MOVIES.forEach(movieName => {
    userSets[movieName] = new Set(
      filtered
        .filter(d => d.movie === movieName)
        .map(d => d.userId)
    );
  });

  function usersInRegion(movieNames) {
    if (movieNames.length === 0) return new Set();
    const [first, ...rest] = movieNames;
    let inter = new Set(userSets[first]);
    rest.forEach(name => {
      const next = userSets[name];
      inter = new Set([...inter].filter(u => next.has(u)));
    });
    return inter;
  }

  const vennData = [];

  // Single-movie circles
  VENN_MOVIES.forEach(movieName => {
    const users = userSets[movieName];
    const size = users.size;
    if (size === 0) return;

    vennData.push({
      sets: [movieName],
      size: size,
      label: `${movieName} (${size})`
    });
  });

  // Pair overlaps
  const pairCombos = [
    [VENN_MOVIES[0], VENN_MOVIES[1]],
    [VENN_MOVIES[0], VENN_MOVIES[2]],
    [VENN_MOVIES[1], VENN_MOVIES[2]]
  ];

  pairCombos.forEach(combo => {
    const users = usersInRegion(combo);
    const size = users.size;
    if (size === 0) return;

    const examples = Array.from(users)
      .sort((a, b) => a - b)
      .slice(0, VENN_MAX_EXAMPLES);

    vennData.push({
      sets: combo,
      size: size,
      label: String(size),
      examples: examples
    });
  });

  // Triple overlap
  const tripleUsers = usersInRegion(VENN_MOVIES);
  if (tripleUsers.size > 0) {
    const examples = Array.from(tripleUsers)
      .sort((a, b) => a - b)
      .slice(0, VENN_MAX_EXAMPLES);

    vennData.push({
      sets: VENN_MOVIES.slice(),
      size: tripleUsers.size,
      label: String(tripleUsers.size),
      examples: examples
    });
  }

  return vennData;
}

function renderVennForThreshold4(threshold) {
  const vennData = buildVennData4(threshold);

  vennContainer4.selectAll("*").remove();

  statusMessage4.text(
    `Showing users with rating ≥ ${threshold.toFixed(1)}.`
  );

  vennChart4 = venn.VennDiagram()
    .width(600)
    .height(450);

  vennContainer4.datum(vennData).call(vennChart4);

  // Hover behaviour
  vennContainer4.selectAll("g.venn-area")
    .on("mouseover", function(d) {
      venn.sortAreas(vennContainer4, d);

      const total = d.size;
      const movieNames = d.sets;
      const examples = d.examples || [];
      const hasMore = total > examples.length;

      tooltip4.style("display", "block").html("");

      let titleText = "";
      if (movieNames.length === 1) {
        titleText = `Users who rated "${movieNames[0]}" ≥ ${threshold.toFixed(1)}`;
      } else {
        titleText = `Users who rated all of: ${movieNames
          .map(name => `"${name}"`)
          .join(", ")} ≥ ${threshold.toFixed(1)}`;
      }

      tooltip4.append("div")
        .attr("class", "tooltip-title")
        .text(titleText);

      tooltip4.append("div")
        .attr("class", "tooltip-count")
        .text(`Total users: ${total}`);

      tooltip4.append("div")
        .attr("class", "tooltip-threshold")
        .text(`Current threshold: rating ≥ ${threshold.toFixed(1)}`);

      if (examples.length > 0) {
        tooltip4.append("div")
          .attr("class", "tooltip-examples")
          .html(
            "Example userIds (max 10): " +
            "<span>" + examples.join(", ") + "</span>" +
            (hasMore ? " (+ more)" : "")
          );
      }
    })
    .on("mousemove", function() {
      const e = d3.event;
      tooltip4
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY + 10) + "px");
    })
    .on("mouseout", function() {
      tooltip4.style("display", "none");
    });
}

// Slider listener for slide 4
thresholdSlider4.addEventListener("input", function() {
  const t = parseFloat(thresholdSlider4.value);
  thresholdValue4.textContent = t.toFixed(1);
  renderVennForThreshold4(t);
});



/****************************************************
 * PROTOTYPE WRITEUP TOOLTIP (click to toggle)
 ****************************************************/
const writeupBtn = document.getElementById("prototype-writeup-btn");
const writeupTooltip = document.getElementById("prototype-writeup-tooltip");
const writeupClose = document.getElementById("prototype-writeup-close");

if (writeupBtn && writeupTooltip) {
  function setWriteupVisible(show) {
    if (show) {
      writeupTooltip.removeAttribute("hidden");
    } else {
      writeupTooltip.setAttribute("hidden", "");
    }
  }

  // toggle on button click
  writeupBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = writeupTooltip.hasAttribute("hidden");
    setWriteupVisible(isHidden);
  });

  // close button in tooltip
  if (writeupClose) {
    writeupClose.addEventListener("click", (e) => {
      e.stopPropagation();
      setWriteupVisible(false);
    });
  }

  // click outside to close
  document.addEventListener("click", (e) => {
    if (
      !writeupTooltip.hasAttribute("hidden") &&
      !writeupTooltip.contains(e.target) &&
      e.target !== writeupBtn
    ) {
      setWriteupVisible(false);
    }
  });
}
