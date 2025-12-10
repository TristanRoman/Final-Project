


/****************************************************
 * SLIDE TOGGLE: Profiles ↔ Home
 ****************************************************/
const profileScreen = document.getElementById("profile-screen");
const homeScreen = document.getElementById("home-screen");
const continueBtn = document.getElementById("continue-btn");
const backToProfiles = document.getElementById("back-to-profiles");
let tourSlide = 1; // 1 = profile tour, 2 = home tour

// CLICK: Go from Profile → Home
continueBtn.addEventListener("click", () => {
    profileScreen.classList.remove("screen--active");
    homeScreen.classList.add("screen--active");

    

    // If we are in tour AND coming from Slide 1 → start Slide 2 (Hero Intro)
    if (tourSlide === 1) {
        tourSlide = 2;

        // Ensure hero 0 builds first
        setTimeout(() => {
            currentHeroIndex = 0;
            renderHero(0);

            // 🔥 NEW: Wait until the DOM elements truly exist
            const waitForHero = setInterval(() => {
                const hero = document.querySelector(".hero-banner");
                const row = document.querySelector("#row-new");

                if (hero && row) {
                    clearInterval(waitForHero);
                    startSlide2Tour();
                }
            }, 50);

        }, 300);

        return;
    }
    // Not in tour → just hide start button and exit
    if (!tourMode) {
        document.getElementById("start-tour-btn").style.display = "none";
        return;
    }
});




// CLICK: Go back Home → Profile
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
      "A movie recommender system stores how users rate movies in a ''big grid''. When you raise the rating threshold, the grid looks emptier because only high ratings remain. Since most people rate only a few movies, the system uses ratings from many users to fill in the gaps. When you increase the number of users, the grid fills up again, showing how more data helps the system make better recommendations.",
  },
  {
    id: "similarity-part1",
    mode: "similarityVectors",
    title: "Similarity Calculations (Part 1)",
    tag: "N SERIES",
    description:
      "Cosine similarity shows how close two people’s movie tastes are by turning their preferences into ''arrows'' (vectors) on a graph. If two arrows point in almost the same direction, the users enjoy movies in a similar way; if the arrows point in very different directions, their tastes differ. By measuring the angle between each pair of arrows, the system can quickly figure out which users are most alike and use that information to suggest movies they might like.",
  },
  {
  id: "hero-panel-venn",
  mode: "jaccardVenn",          // or whatever your JS switch uses
  title: "Similarity Calculations (Part 2)",
  tag: "N SERIES",
  description:
    "This visualization uses Jaccard similarity, which is just a way to measure how much two groups overlap. If many of the same people liked both movies, their tastes are more alike. By seeing where these groups overlap, we can guess which movies someone might enjoy next."
},
{
  id: "hero-panel-5",
  mode: "collab",          // or whatever your JS switch uses
  title: "Collaborative Filtering",
  tag: "N SERIES",
  description:
    "Collaborative filtering recommends movies by finding people who like similar things to you. If someone with similar tastes enjoyed a movie you haven’t seen yet, the system guesses you might like it too. This lets you discover surprising new movies—even if they’re not your usual genre."
},
{
    id: "hidden-trends2",
    mode: "story",
    title: "Hidden Trends (Part 2)",
    tag: "N SERIES",
    description:
      "After trekking through spellbound rating grids, glowing similarity paths, and the overlap rings of Jaccard, our data-mages finally reach the core: a living collaborative engine that weaves every viewer’s taste into real recommendations. No illusions now — this is the full spellbook, the true recommender awakened and ready to reveal the next movie you were always meant to find.",
    customBackground: "img/hidden-trends-2.png",
    yearOverride: "2025",
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
    // NEW: axis + legend groups
    ratingHeatmapSvg.append("g").attr("class", "x-axis");
    ratingHeatmapSvg.append("g").attr("class", "y-axis");
    ratingHeatmapSvg.append("g").attr("class", "legend-scale");

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

  // margins inside the SVG so we have space for labels + legend
  const margin = { top: 10, right: 50, bottom: 26, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const cellWidth = innerWidth / nMovies;
  const cellHeight = innerHeight / userCount;

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
    .attr("x", (d) => margin.left + d.m * cellWidth)
    .attr("y", (d) => margin.top + d.u * cellHeight)
    .attr("width", cellWidth - 1)
    .attr("height", cellHeight - 1)
    .attr("fill", (d) => color(d.rating))   // 👈 add fill on first draw
    .attr("opacity", 0.9); 

  rects
    .attr("x", (d) => margin.left + d.m * cellWidth)
    .attr("y", (d) => margin.top + d.u * cellHeight)
    .attr("width", cellWidth - 1)
    .attr("height", cellHeight - 1)
    .attr("fill", (d) => color(d.rating)); 

  rects.exit().remove();

  // ====== AXIS TITLES + COLOR LEGEND (VISIBLE) ======

  const xAxisGroup = ratingHeatmapSvg.select("g.x-axis");
  const yAxisGroup = ratingHeatmapSvg.select("g.y-axis");
  const legendGroup = ratingHeatmapSvg.select("g.legend-scale");

  xAxisGroup.selectAll("*").remove();
  yAxisGroup.selectAll("*").remove();
  legendGroup.selectAll("*").remove();

  // X label just below the heatmap, centered
  xAxisGroup
    .append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 6)
    .attr("fill", "#e5e7eb")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Movies");

  // Y label to the left of the heatmap
  yAxisGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 16)
    .attr("fill", "#e5e7eb")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Users");

  // --- Color legend: darker = lower, brighter = higher rating ---
  const legendHeight = 140;
  const legendWidth = 10;

  // sit to the right of the heatmap, on background area
  const legendX = width - margin.right + 6;
  const legendY = margin.top + (innerHeight - legendHeight) / 2;

  let defs = ratingHeatmapSvg.select("defs");
  if (defs.empty()) {
    defs = ratingHeatmapSvg.append("defs");
  }

  let gradient = defs.select("#ratingLegend");
  if (gradient.empty()) {
    gradient = defs
      .append("linearGradient")
      .attr("id", "ratingLegend")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");
  }

  gradient.selectAll("stop").remove();
  gradient.append("stop").attr("offset", "0%").attr("stop-color", color(1));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", color(5));

  legendGroup.attr("transform", `translate(${legendX}, ${legendY})`);

  legendGroup
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#ratingLegend)");

  const legendScale = d3.scaleLinear()
    .domain([1, 5])
    .range([legendHeight, 0]);

  const legendAxis = d3.axisRight(legendScale)
    .ticks(5)
    .tickFormat(d => d.toFixed(0));

  const legendAxisGroup = legendGroup
    .append("g")
    .attr("transform", `translate(${legendWidth + 4}, 0)`)
    .call(legendAxis);

  legendAxisGroup.selectAll("text")
    .attr("fill", "#e5e7eb")
    .attr("font-size", 10);

  legendAxisGroup.selectAll("line, path")
    .attr("stroke", "#9ca3af");

  // 🔹 vertical label tied to the legend
  legendGroup
    .append("text")
    .attr("transform", `translate(${legendWidth + 26}, ${legendHeight / 2}) rotate(-90)`)
    .attr("fill", "#e5e7eb")
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .text("Rating");
}


/****************************************************
 * SLIDE 3: COSINE SIMILARITY DEMO (3 USERS)
 ****************************************************/

// hard-coded example users
const COS_USERS = [
  {
    id: 1,
    name: "User 1",
    comedy: 10,
    romance: 1,
    labelOffsetX: 12,
    labelOffsetY: 8,
  },
  {
    id: 474,
    name: "User 474",
    comedy: 8,
    romance: 3,
    labelOffsetX: 6,
    labelOffsetY: 8,
  },
  {
    id: 606,
    name: "User 606",
    comedy: 2,
    romance: 8,
    labelOffsetX: -10,
    labelOffsetY: -10,
  },
];

let simInitialized = false;

function cosineFromComponents(a, b) {
  const dot = a.comedy * b.comedy + a.romance * b.romance;
  const magA = Math.hypot(a.comedy, a.romance);
  const magB = Math.hypot(b.comedy, b.romance);
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

function angleFromCos(c) {
  const clamped = Math.max(-1, Math.min(1, c));
  return (Math.acos(clamped) * 180) / Math.PI;
}

async function initSimilarityHero() {
  if (simInitialized) return;

  const panel = document.getElementById("hero-sim-panel");
  if (!panel) return;

  const svg = d3.select("#sim-vectors");
  if (svg.empty()) return;

  const width = 520;
  const height = 260;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr(
    "transform",
    `translate(${margin.left},${margin.top})`
  );

  const xScale = d3.scaleLinear().domain([0, 10]).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([0, 10]).range([innerHeight, 0]);

  // axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .call((axis) =>
      axis
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 32)
        .attr("fill", "#e5e7eb")
        .attr("text-anchor", "middle")
        .text("Comedy preference")
    );

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(5))
    .call((axis) =>
      axis
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -32)
        .attr("fill", "#e5e7eb")
        .attr("text-anchor", "middle")
        .text("Romance preference")
    );

  // group for vectors and labels
  const vecGroup = g.append("g").attr("class", "cos-vectors");
  const angleGroup = g.append("g").attr("class", "cos-angle-group");

  function drawVectors(bestPairIds) {
    vecGroup.selectAll("*").remove();
    angleGroup.selectAll("*").remove();

    const bestSet = new Set(bestPairIds);

    COS_USERS.forEach((u) => {
      const x2 = xScale(u.comedy);
      const y2 = yScale(u.romance);

      vecGroup
        .append("line")
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", bestSet.has(u.id) ? "#e50914" : "#4b5563")
        .attr("stroke-width", bestSet.has(u.id) ? 3 : 2)
        .attr("opacity", bestSet.has(u.id) ? 1 : 0.5);

      vecGroup
        .append("circle")
        .attr("cx", x2)
        .attr("cy", y2)
        .attr("r", 4)
        .attr("fill", bestSet.has(u.id) ? "#e50914" : "#e5e7eb");

      vecGroup
        .append("text")
        .attr("x", x2 + u.labelOffsetX)
        .attr("y", y2 + u.labelOffsetY)
        .attr("fill", "#e5e7eb")
        .attr("font-size", 11)
        .text(`User ${u.id}`);
    });

    // draw angle arc for best pair
    const uA = COS_USERS.find((u) => u.id === bestPairIds[0]);
    const uB = COS_USERS.find((u) => u.id === bestPairIds[1]);
    if (!uA || !uB) return;

    const angleA = Math.atan2(uA.romance, uA.comedy);
    const angleB = Math.atan2(uB.romance, uB.comedy);
    let start = Math.min(angleA, angleB);
    let end = Math.max(angleA, angleB);

    const arcR = 45;
    const arc = d3
      .arc()
      .innerRadius(arcR)
      .outerRadius(arcR + 1)
      .startAngle(start)
      .endAngle(end);

    angleGroup
      .append("path")
      .attr(
        "transform",
        `translate(${xScale(0)},${yScale(0)}) scale(1,-1)`
      )
      .attr("d", arc())
      .attr("stroke", "#ffffff")
      .attr("fill", "none")
      .attr("stroke-width", 2);

    const mid = (start + end) / 2;
    const labelX = xScale(0) + (arcR + 12) * Math.cos(mid);
    const labelY = yScale(0) - (arcR + 12) * Math.sin(mid);

    const cos = cosineFromComponents(uA, uB);
    const angleDeg = angleFromCos(cos).toFixed(1);

    angleGroup
      .append("text")
      .attr("x", labelX)
      .attr("y", labelY)
      .attr("fill", "#ffffff")
      .attr("font-size", 11)
      .attr("text-anchor", "middle")
      .text(`${angleDeg}°`);
  }

  function updateSummary() {
    const pairs = [
      [COS_USERS[0], COS_USERS[1]],
      [COS_USERS[0], COS_USERS[2]],
      [COS_USERS[1], COS_USERS[2]],
    ];

    const results = pairs.map(([a, b]) => {
      const cos = cosineFromComponents(a, b);
      const angle = angleFromCos(cos);
      return { a, b, cos, angle };
    });

    results.sort((x, y) => y.cos - x.cos);
    const best = results[0];

    const summaryEl = document.getElementById("sim-summary");
    if (!summaryEl) return;

    summaryEl.innerHTML = `
      <p><strong>Most similar pair:</strong> User ${best.a.id} &amp; User ${
      best.b.id
    }</p>
      <p>Cosine similarity: <strong>${best.cos.toFixed(
        3
      )}</strong> (angle ≈ ${best.angle.toFixed(1)}°)</p>
      <p><strong>All pairs:</strong></p>
      <ul>
        ${results
          .map(
            (r) =>
              `<li>User ${r.a.id} vs User ${r.b.id}: cos = <strong>${r.cos.toFixed(
                3
              )}</strong>, angle ≈ ${r.angle.toFixed(1)}°</li>`
          )
          .join("")}
      </ul>
      <p class="sim-footnote">
        Smaller angle → higher cosine → more similar taste.
        The system would recommend movies from the most similar user.
      </p>
    `;

    // update the chart to highlight the best pair
    drawVectors([best.a.id, best.b.id]);
  }

  // fill little data table under the chart
  const tableBody = document.getElementById("sim-table-body");
  if (tableBody) {
    tableBody.innerHTML = COS_USERS.map(
      (u) => `
        <tr>
          <td>${u.id}</td>
          <td>${u.comedy}</td>
          <td>${u.romance}</td>
        </tr>`
    ).join("");
  }
  
  updateSummary();
  // do NOT call updateSummary() here – wait for the button
  simInitialized = true;
  
}




/****************************************************
 * Main hero renderer
 ****************************************************/
async function renderHero(index) {
  const slide = heroSlides[index];
  const globalPlayBtn = document.getElementById("global-play-btn");

  const banner = document.querySelector(".hero-banner");
  const titleEl = document.getElementById("hero-title");
  const descEl = document.getElementById("hero-description");
  const metaEl = document.getElementById("hero-meta");
  const tagEl = document.querySelector(".hero-tag");
  const matrixPanel = document.getElementById("hero-matrix-panel");
  const simPanel = document.getElementById("hero-sim-panel");
  const vennPanel = document.getElementById("hero-panel-venn");  
  const collabPanel = document.getElementById("hero-panel-5");


  // Reset meta + hide both interactive panels by default
  metaEl.innerHTML = "";
  if (matrixPanel) matrixPanel.classList.add("hero-panel--hidden");
  if (simPanel) simPanel.classList.add("hero-panel--hidden");
  if (vennPanel) vennPanel.classList.add("hero-panel--hidden");
  if (collabPanel) collabPanel.classList.add("hero-panel--hidden");
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
      matrixPanel.classList.remove("hero-panel--hidden");
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
  if (slide.mode === "collab") {
    banner.style.backgroundImage = "none";
    banner.style.backgroundColor = "#020617";
    

    // UPDATE LEFT HERO TEXT
    titleEl.textContent = slide.title;
    descEl.textContent = slide.description;

    // UPDATE META TAGS
    metaParts.push("Collaborative Filtering · Recommendations");
    metaParts.push("Play the animation →");

    metaParts.forEach((txt) => {
      const span = document.createElement("span");
      span.textContent = txt;
      metaEl.appendChild(span);
    });
    

    // SHOW ONLY SLIDE 5 PANEL
    const collabPanel = document.getElementById("hero-panel-5");
    if (collabPanel) collabPanel.classList.remove("hero-panel--hidden");
    // Attach play button → runs animation
    const playBtn = document.getElementById("collab-play-btn");
    if (playBtn) {
      playBtn.onclick = () => {
        if (window.playCollabAnimation) {
          window.playCollabAnimation(); // defined below
        }
      };
    }

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

function handleHeroSlideChange() {
    renderHero(currentHeroIndex);

    if (!tourMode) return;

    const slide = heroSlides[currentHeroIndex];

    switch (slide.mode) {
        case "ratingsMatrix":
            tourSlide = 3;
            startRatingMatrixTour();
            break;

        case "similarityVectors":
            tourSlide = 4;
            startSimilarityVectorTour();
            break;

        case "jaccardVenn":
            tourSlide = 5;
            startVennTour();
            break;

        case "collab":
            tourSlide = 6;
            startCollabTour();
            break;

        default:
            // Story slides (Hidden Trends 1 & 2)
            if (slide.id === "hidden-trends2") {
                // final big-picture callout
                tourSlide = 7;
                startHiddenTrends2Tour();
            } else {
                // first Hidden Trends hero: no extra mini-tour
                tourSlide = 2;
            }
            break;
    }
}


heroArrowLeft.addEventListener("click", () => {
    currentHeroIndex = (currentHeroIndex - 1 + heroSlides.length) % heroSlides.length;
    handleHeroSlideChange();
});

heroArrowRight.addEventListener("click", () => {
    currentHeroIndex = (currentHeroIndex + 1) % heroSlides.length;
    handleHeroSlideChange();
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

// 1) Load the CSV and keep only the 3 movies we care about
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


// 2) Build Venn data for a given threshold
function buildVennData4(threshold) {
  // Keep only ratings ≥ threshold
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

  // Helper: intersection of users across a list of movies
  function usersInRegion(movieNames) {
    if (!movieNames.length) return new Set();
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
      // strip the year for label: "Toy Story (1995)" → "Toy Story"
      label: `${movieName.replace(/\s*\(\d{4}\)/, "")} (${size})`
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

  // Triple overlap (center region)
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


// 3) Render for a particular threshold
function renderVennForThreshold4(threshold) {
  const vennData = buildVennData4(threshold);

  // Clear whatever was there
  vennContainer4.selectAll("*").remove();

  statusMessage4.text(
    `Showing users with rating ≥ ${threshold.toFixed(1)}.`
  );

  // Create a fresh Venn diagram for this threshold
  vennChart4 = venn.VennDiagram()
    .width(600)
    .height(450);

  vennContainer4.datum(vennData).call(vennChart4);

  // Hover behaviour for venn areas
  vennContainer4.selectAll("g.venn-area")
    .on("mouseover", function (d) {
      // bring hovered region to the front
      venn.sortAreas(vennContainer4, d);

      const total = d.size;
      const movieNames = d.sets;
      const examples = d.examples || [];
      const hasMore = total > examples.length;

      tooltip4
        .style("display", "block")
        .html("");

      let titleText = "";
      if (movieNames.length === 1) {
        titleText = `Users who rated "${movieNames[0]}" ≥ ${threshold.toFixed(1)}`;
      } else {
        titleText = `Users who rated all of: ${
          movieNames.map(name => `"${name}"`).join(", ")
        } ≥ ${threshold.toFixed(1)}`;
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
    .on("mousemove", function () {
      const e = d3.event;
      tooltip4
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY + 10) + "px");
    })
    .on("mouseout", function () {
      tooltip4.style("display", "none");
    });
}

// 4) Slider listener for slide 4
thresholdSlider4.addEventListener("input", function () {
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


const globalPlayBtn = document.getElementById("global-play-btn");

globalPlayBtn.addEventListener("click", () => {
    const slide = heroSlides[currentHeroIndex];

    switch (slide.mode) {
        case "collab":
            if (window.playCollabAnimation) {
                window.playCollabAnimation();
            }
            break;

        case "similarityVectors":
            if (window.playCosineAnimation) {
                window.playCosineAnimation();
            }
            break;

        case "ratingsMatrix":
            if (window.playMatrixAnimation) {
                window.playMatrixAnimation();
            }
            break;

        case "jaccardVenn":
            if (window.playVennAnimation) {
                window.playVennAnimation();
            }
            break;

        default:
            console.log("No animation defined for this slide.");
    }
});


/*Tour guide nifo afcter this */


/**********************************************
 * GUIDED TOUR (Safe, isolated)
 **********************************************/
let tourMode = false;
let tourStep = 0;

let tourSteps = [
  {
    highlight: ".profile-avatar:first-child",
    text: "Welcome to visualizing movie reccomender systems! These avatars represent the core engines of your recommender system. Hover each one to learn what it does."
  },
  {
    highlight: "#continue-btn",
    text: "When you're ready, click START WATCHING to begin the experience."
  }
];

function startSlide2Tour() {

  tourSteps = [
    {
      highlight: ".hero-banner",
      text: "Welcome to the main dashboard — everything you see here is powered by reccomender systems."
    },
  
    {
      highlight: "#row-new", // <-- existing, safe selector
      text: "These movie rows adjust based on your preferences and similarity calculations."
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}
/* -------------------------------
   SLIDE 3 — Rating Matrix Hero
--------------------------------*/
function startRatingMatrixTour() {
  tourSteps = [
    {
      highlight: "#hero-matrix-panel",
      text: "This heatmap forms the data foundation — it shows how users rate movies in a giant grid."
    },
    {
      highlight: ".matrix-explainer",
      text: "Changing thresholds and user counts reveals patterns the system uses to predict ratings."
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}

/* -------------------------------
   SLIDE 4 — Cosine Similarity Hero
--------------------------------*/
function startSimilarityVectorTour() {
  tourSteps = [
    {
      highlight: "#hero-sim-panel",
      text: "Here user preferences become vectors — arrows showing how they lean toward genres."
    },
    {
      highlight: "#sim-summary",
      text: "Comparing angles tells the system which users have the most similar taste."
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}

/* -------------------------------
   SLIDE 5 — Jaccard Venn Hero
--------------------------------*/
function startVennTour() {
  tourSteps = [
    {
      highlight: "#hero-panel-venn",
      text: "This Venn diagram shows how audiences overlap between movies."
    },
    {
      highlight: "#statusMessage-4",
      text: "More overlap = more shared taste = stronger evidence for recommendations."
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}

/* -------------------------------
   SLIDE 6 — Collaborative Filtering Hero
--------------------------------*/
function startCollabTour() {
  tourSteps = [
    {
      highlight: "#hero-panel-5",
      text: "To start the animation, click play on the left. Collaborative filtering finds people with similar taste and borrows their ratings. "
    },
    {
      highlight: "#row-trending",
      text: "Your recommendations are generated by all previous stages working together."
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}
/* -------------------------------
   FINAL SLIDE — Hidden Trends Part 2
   (Big-picture summary)
--------------------------------*/
/* -------------------------------
   FINAL SLIDE — Hidden Trends Part 2
   (Big-picture summary + favorites)
--------------------------------*/
function startHiddenTrends2Tour() {
  tourSteps = [
    {
      // 1) Big-picture hero callout
      highlight: ".hero-banner",
      text:
        "All the pieces you just saw — the big rating grid, the arrows, and the overlap circles — now work together behind the scenes in this final Hidden Trends view."
    },
    {
      // 2) Select your favorite movies row
      highlight: "#row-new",
      text:
        "Now you can click a few of your favorite movies here. In simple terms: you’re telling the system, “Please show me more like this.”"
    },
    {
      // 3) You might also like row
      highlight: "#row-trending",
      text:
        "Now this row shows movies you might like by looking at lots of people who picked the same favorites you did. If they liked these movies, you might like them too!"
    }
  ];

  tourStep = 0;
  showStep(tourStep);
}



const overlay = document.getElementById("tour-overlay");
const highlight = document.getElementById("tour-highlight");
const box = document.getElementById("tour-box");
const boxText = document.getElementById("tour-text");
const boxNext = document.getElementById("tour-next-btn");

document.getElementById("start-tour-btn").addEventListener("click", () => {
    tourMode = true;
    tourSlide = 1;   // starting on slide 1 tour
    tourStep = 0;
    
    document.getElementById("start-tour-btn").style.display = "none";

    startTour(); // runs slide 1 tour steps
});


function startTour() {
  overlay.classList.add("active");
  showStep(tourStep);
}

function showStep(i) {
  const step = tourSteps[i];
  const el = document.querySelector(step.highlight);

  if (!el) return console.warn("Tour target not found:", step.highlight);

  const rect = el.getBoundingClientRect();

  // Position the highlight box
  highlight.style.left = rect.left - 8 + "px";
  highlight.style.top = rect.top - 8 + "px";
  highlight.style.width = rect.width + 16 + "px";
  highlight.style.height = rect.height + 16 + "px";
  highlight.classList.add("active");


  // ----- Position tooltip (box) -----
box.style.display = "block";

// Default placement: below element
let boxLeft = rect.left;
let boxTop = rect.bottom + 20;

const boxWidth = box.offsetWidth;
const boxHeight = box.offsetHeight;
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

// If box would go off bottom, move it above
if (boxTop + boxHeight > viewportHeight - 20) {
    boxTop = rect.top - boxHeight - 20;
}

// Prevent right overflow
if (boxLeft + boxWidth > viewportWidth - 20) {
    boxLeft = rect.right - boxWidth;
}

// Prevent left overflow
if (boxLeft < 20) {
    boxLeft = 20;
}

box.style.left = boxLeft + "px";
box.style.top = boxTop + "px";
boxText.textContent = step.text;

}

function updateHighlightPosition() {
  // Only update if highlight is visible + a valid step exists
  if (!highlight.classList.contains("active")) return;
  if (tourStep == null || !tourSteps[tourStep]) return;

  const step = tourSteps[tourStep];
  const el = document.querySelector(step.highlight);
  if (!el) return;

  const rect = el.getBoundingClientRect();

  highlight.style.left = rect.left - 8 + "px";
  highlight.style.top = rect.top - 8 + "px";
  highlight.style.width = rect.width + 16 + "px";
  highlight.style.height = rect.height + 16 + "px";
}

window.addEventListener("scroll", () => {
  requestAnimationFrame(updateHighlightPosition);
});

window.addEventListener("resize", () => {
  requestAnimationFrame(updateHighlightPosition);
});




boxNext.addEventListener("click", () => {
  tourStep++;
  if (tourStep >= tourSteps.length) {
    endTour();
  } else {
    showStep(tourStep);
  }
});

function endTour() {
  overlay.classList.remove("active");
  highlight.classList.remove("active");
  box.style.display = "none";

  // Only fully end the tour after Hidden Trends Part 2 summary
  if (tourSlide >= 7) {
    tourMode = false;
  }
}



