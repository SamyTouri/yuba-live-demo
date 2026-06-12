/* ============================================================
   Yuba Live — moteur de la démo
   Valeurs déterministes dérivées de l'horloge réelle :
   à chaque ouverture, les chiffres « ont continué de tourner ».
   ============================================================ */

(function () {
  "use strict";

  /* ---------- utilitaires ---------- */

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOUCH = window.matchMedia("(pointer: coarse)").matches;

  const fmtCache = {};
  function fmt(v, d = 0) {
    const k = "d" + d;
    if (!fmtCache[k]) {
      fmtCache[k] = new Intl.NumberFormat("fr-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    return fmtCache[k].format(v);
  }

  const timeFmt = new Intl.DateTimeFormat("fr-BE", { hour: "2-digit", minute: "2-digit" });
  const dayFmt = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long" });
  const dayFmtFull = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const weekdayFmt = new Intl.DateTimeFormat("fr-BE", { weekday: "short", day: "numeric" });

  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const localDayKey = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD local
  const dayKey = localDayKey();

  /* ---------- horloge simulée (jamais de dashboard mort) ---------- */

  let frozenSteps = 0; // hors heures terrain : timestamps qui avancent quand même un peu
  let lastLive = 0;    // plancher : simNow ne recule jamais sous la dernière heure « live »

  function isFrozen() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 8 || h >= 20;
  }

  function simNow() {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 8 && h < 20) { lastLive = d.getTime(); return d; }
    d.setHours(17, 45, 0, 0);
    d.setTime(Math.max(d.getTime() + Math.min(frozenSteps, 80) * 45000, lastLive));
    return d;
  }

  /* progression de la journée selon la courbe d'activité (8h → 19h) */
  function dayProgress(weights, d) {
    const total = weights.reduce((a, b) => a + b, 0);
    const h = d.getHours();
    const frac = (d.getMinutes() + d.getSeconds() / 60) / 60;
    if (h < 8) return 0;
    if (h >= 20) return 1;
    let done = 0;
    for (let i = 0; i < weights.length; i++) {
      const slotHour = 8 + i;
      if (slotHour < h) done += weights[i];
      else if (slotHour === h) done += weights[i] * frac;
    }
    return Math.min(1, done / total);
  }

  /* ---------- icônes SVG ---------- */

  const I = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

  const ICONS = {
    taxi:  I('<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l3.5-7.5H14l4 7.5"/><path d="M9.5 9.5H8m6 0V7h-2.5"/>'),
    flyer: I('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/>'),
    chat:  I('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.7-.3-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z"/>'),
    road:  I('<path d="M5 21L9.5 3M19 21L14.5 3"/><path d="M12 7v2M12 13v2M12 19v1.5"/>'),
    eye:   I('<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>'),
    screen:I('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 21h6M12 16.5V21"/>'),
    qr:    I('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v6h-6"/>'),
    spray: I('<path d="M9.5 8.5h5L13.5 21h-3z"/><path d="M10.5 8.5V5.5h3v3"/><path d="M16.5 3h.01M19.5 5h.01M19.5 2h.01"/>'),
    scan:  I('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/>')
  };

  /* ---------- état ---------- */

  const DATA = window.YUBA_DATA;
  const els = {
    updatedAgo: document.getElementById("updatedAgo"),
    segmented: document.getElementById("segmented"),
    select: document.getElementById("campaignSelect"),
    bClient: document.getElementById("bClient"),
    bName: document.getElementById("bName"),
    bDates: document.getElementById("bDates"),
    bStory: document.getElementById("bStory"),
    bDayLabel: document.getElementById("bDayLabel"),
    bDayFill: document.getElementById("bDayFill"),
    bZones: document.getElementById("bZones"),
    bSupports: document.getElementById("bSupports"),
    kpiGrid: document.getElementById("kpiGrid"),
    dailyMetricLabel: document.getElementById("dailyMetricLabel"),
    teamCount: document.getElementById("teamCount"),
    feed: document.getElementById("feed"),
    mapOverlay: document.getElementById("mapOverlay")
  };

  let current = null;          // campagne active
  let rng = Math.random;       // RNG seedé par jour + campagne
  let bumps = {};              // incréments visuels venus du feed (campagne active)
  let bumpsStore = {};         // bumps conservés par campagne (pas de recul au switch)
  let displayed = {};          // dernière valeur affichée par KPI
  let lastUpdate = Date.now();
  let bootTime = Date.now();   // départ du « rythme d'ouverture » (page vivante immédiatement)
  let firstFeedDone = false;   // le tout premier vocal arrive en quelques secondes
  let feedIndex = 0;
  let lastVoiceByTeam = {};
  let markers = {};
  let map = null;
  let charts = { hourly: null, donut: null, daily: null };
  let timers = [];

  /* ---------- valeurs des KPIs ---------- */

  function kpiValue(kpi) {
    const prog = dayProgress(current.hourly, simNow());
    const raw = kpi.base + kpi.today * prog + (bumps[kpi.id] || 0);
    const f = Math.pow(10, kpi.decimals);
    return Math.round(raw * f) / f;
  }

  function animateValue(el, from, to, decimals, duration) {
    if (REDUCED || duration === 0) { el.textContent = fmt(to, decimals); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(from + (to - from) * e, decimals);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- bandeau campagne ---------- */

  function campaignDates() {
    const m = current.meta;
    const start = new Date(); start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - (m.currentDay - 1));
    const end = new Date(start); end.setDate(end.getDate() + m.totalDays - 1);
    return { start, end };
  }

  function renderBanner() {
    const m = current.meta;
    const { start, end } = campaignDates();
    els.bClient.textContent = m.client;
    els.bName.textContent = m.name;
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = sameMonth ? String(start.getDate()) : dayFmt.format(start);
    els.bDates.textContent = `${startLabel} – ${dayFmtFull.format(end)}`;
    els.bDayLabel.textContent = `Jour ${m.currentDay} / ${m.totalDays}`;
    const prog = dayProgress(current.hourly, simNow());
    els.bDayFill.style.width = `${(((m.currentDay - 1) + prog) / m.totalDays) * 100}%`;
    els.bZones.innerHTML = m.zones.map((z) => `<span class="chip zone">${z}</span>`).join("");
    els.bSupports.innerHTML = m.supports.map((s) => `<span class="chip">${s}</span>`).join("");
    els.teamCount.textContent = `${current.teams.length} équipes`;
    els.dailyMetricLabel.textContent = current.primary.label;
    renderStory();
  }

  function renderStory() {
    const story = current.meta.story;
    if (!story) { els.bStory.hidden = true; els.bStory.innerHTML = ""; return; }
    const kpi = current.kpis.find((k) => k.id === story.kpi);
    const n = Math.round((displayed[story.kpi] != null ? displayed[story.kpi] : kpiValue(kpi)) * story.mult);
    els.bStory.innerHTML = `≈ <strong>${fmt(n)}</strong> ${story.label}<span class="story-note"> — ${story.note}</span>`;
    els.bStory.hidden = false;
  }

  /* ---------- KPIs ---------- */

  function renderKpis() {
    els.kpiGrid.innerHTML = "";
    displayed = {};
    current.kpis.forEach((kpi) => {
      const v = kpiValue(kpi);
      const card = document.createElement("div");
      card.className = "kpi";
      card.dataset.kpi = kpi.id;
      const deltaCls = kpi.delta > 0 ? "up" : kpi.delta < 0 ? "down" : "flat";
      const deltaTxt = kpi.delta > 0 ? `↑ ${kpi.delta} % vs J-1` : kpi.delta < 0 ? `↓ ${Math.abs(kpi.delta)} % vs J-1` : "= vs J-1";
      card.innerHTML =
        `<div class="kpi-top"><span class="kpi-label">${kpi.label}</span><span class="kpi-icon">${ICONS[kpi.icon] || ""}</span></div>` +
        `<div class="kpi-value"><span class="num">0</span>${kpi.unit ? `<span class="kpi-unit">${kpi.unit}</span>` : ""}</div>` +
        `<div class="kpi-delta ${deltaCls}">${deltaTxt}</div>` +
        `<div class="kpi-spark"><canvas></canvas></div>`;
      els.kpiGrid.appendChild(card);
      displayed[kpi.id] = v;
      animateValue(card.querySelector(".num"), 0, v, kpi.decimals, 900);
      drawSpark(card.querySelector("canvas"), kpi.spark);
    });
  }

  function refreshKpis(animate = true) {
    let changed = false;
    current.kpis.forEach((kpi) => {
      const v = kpiValue(kpi);
      const prev = displayed[kpi.id];
      if (v > prev) {
        const card = els.kpiGrid.querySelector(`[data-kpi="${kpi.id}"]`);
        if (card) {
          animateValue(card.querySelector(".num"), prev, v, kpi.decimals, animate ? 800 : 0);
          card.classList.remove("bump");
          void card.offsetWidth;
          card.classList.add("bump");
        }
        displayed[kpi.id] = v;
        changed = true;
      }
    });
    if (changed) {
      touchUpdated();
      renderStory();
      const prog = dayProgress(current.hourly, simNow());
      els.bDayFill.style.width = `${(((current.meta.currentDay - 1) + prog) / current.meta.totalDays) * 100}%`;
    }
    return changed;
  }

  function drawSpark(canvas, values) {
    if (!canvas || !values || values.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || 120;
    const h = 28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const px = (i) => 2 + (i / (values.length - 1)) * (w - 6);
    const py = (v) => h - 4 - ((v - min) / span) * (h - 9);
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.strokeStyle = "rgba(255, 222, 85, 0.55)";
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.stroke();
    const li = values.length - 1;
    ctx.beginPath();
    ctx.arc(px(li), py(values[li]), 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffde55";
    ctx.fill();
  }

  function redrawSparks() {
    els.kpiGrid.querySelectorAll(".kpi").forEach((card) => {
      const kpi = current.kpis.find((k) => k.id === card.dataset.kpi);
      if (kpi) drawSpark(card.querySelector("canvas"), kpi.spark);
    });
  }

  /* ---------- graphiques ---------- */

  function activityTotal() {
    // index d'activité du jour, défini par campagne (data.js → activity.kpiIds)
    return current.kpis
      .filter((k) => current.activity.kpiIds.includes(k.id))
      .reduce((a, k) => a + k.today, 0);
  }

  function hourlySeries() {
    const weights = current.hourly;
    const total = weights.reduce((a, b) => a + b, 0);
    const act = activityTotal();
    const d = simNow();
    const h = d.getHours();
    const frac = (d.getMinutes() + d.getSeconds() / 60) / 60;
    return weights.map((wgt, i) => {
      const slot = 8 + i;
      if (slot < h) return Math.round((wgt / total) * act);
      // l'heure entamée n'est tracée qu'une fois assez avancée (évite la fausse « chute »)
      if (slot === h && frac >= 0.35) return Math.round((wgt / total) * act * frac);
      return null;
    });
  }

  function nowIndex() {
    const d = simNow();
    return d.getHours() - 8 + (d.getMinutes() + d.getSeconds() / 60) / 60;
  }

  const nowLinePlugin = {
    id: "nowLine",
    afterDatasetsDraw(chart, _args, opts) {
      if (opts.x == null) return;
      const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
      const i0 = Math.max(0, Math.min(Math.floor(opts.x), chart.data.labels.length - 1));
      const i1 = Math.min(i0 + 1, chart.data.labels.length - 1);
      const p0 = x.getPixelForValue(i0);
      const p1 = x.getPixelForValue(i1);
      const xpos = p0 + (p1 - p0) * (opts.x - i0);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xpos, top + 12);
      ctx.lineTo(xpos, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "10px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("maintenant", Math.min(Math.max(xpos, 30), chart.width - 34), top + 6);
      ctx.restore();
    }
  };

  function dayLabels() {
    const { start } = campaignDates();
    const out = [];
    for (let i = 0; i < current.meta.totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      out.push(weekdayFmt.format(d).replace(".", ""));
    }
    return out;
  }

  function dailySeries() {
    const m = current.meta;
    const primary = current.kpis.find((k) => k.id === current.primary.kpiId);
    const out = [];
    for (let i = 0; i < m.totalDays; i++) {
      if (i < m.currentDay - 1) out.push(current.dailyPast[i] != null ? current.dailyPast[i] : null);
      else if (i === m.currentDay - 1) out.push(displayed[primary.id] != null ? Math.max(0, displayed[primary.id] - primary.base) : 0);
      else out.push(null);
    }
    return out;
  }

  function dailyColors() {
    const m = current.meta;
    const out = [];
    for (let i = 0; i < m.totalDays; i++) {
      out.push(i === m.currentDay - 1 ? "#ffde55" : "rgba(255,255,255,0.16)");
    }
    return out;
  }

  function initCharts() {
    if (!window.Chart) {
      document.querySelector(".charts").style.display = "none";
      return;
    }
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.color = "rgba(255,255,255,0.5)";
    Chart.defaults.borderColor = "rgba(255,255,255,0.06)";

    const hourLabels = Array.from({ length: 12 }, (_, i) => `${8 + i}h`);

    charts.hourly = new Chart(document.getElementById("hourlyChart"), {
      type: "line",
      data: {
        labels: hourLabels,
        datasets: [{
          data: hourlySeries(),
          borderColor: "#ffde55",
          backgroundColor: "rgba(255,222,85,0.10)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: "#ffde55",
          spanGaps: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4 } },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { displayColors: false, callbacks: { label: (c) => `${fmt(c.parsed.y)} ${current.activity.tooltipLabel}` } },
          nowLine: { x: nowIndex() }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { maxTicksLimit: 5 } }
        }
      },
      plugins: [nowLinePlugin]
    });

    charts.donut = new Chart(document.getElementById("repartitionChart"), {
      type: "doughnut",
      data: {
        labels: current.repartition.labels,
        datasets: [{
          data: current.repartition.values,
          backgroundColor: ["#ffde55", "#5b8def", "#e0ead7", "#d4cb4e"],
          borderWidth: 0,
          spacing: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
          tooltip: { displayColors: false, callbacks: { label: (c) => ` ${c.label} : ${c.parsed} %` } }
        }
      }
    });

    charts.daily = new Chart(document.getElementById("dailyChart"), {
      type: "bar",
      data: {
        labels: dayLabels(),
        datasets: [{
          data: dailySeries(),
          backgroundColor: dailyColors(),
          borderRadius: 5,
          maxBarThickness: 42
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { displayColors: false, callbacks: { label: (c) => ` ${fmt(c.parsed.y, current.kpis.find(k => k.id === current.primary.kpiId).decimals)} ${current.primary.label.split("/")[0].trim()}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { maxTicksLimit: 5 } }
        }
      }
    });
  }

  function updateChartsLive() {
    if (!charts.hourly) return;
    charts.hourly.data.datasets[0].data = hourlySeries();
    charts.hourly.options.plugins.nowLine.x = nowIndex();
    charts.hourly.update();
    charts.daily.data.datasets[0].data = dailySeries();
    charts.daily.update("none");
  }

  function updateChartsCampaign() {
    if (!charts.hourly) return;
    charts.hourly.data.datasets[0].data = hourlySeries();
    charts.hourly.options.plugins.nowLine.x = nowIndex();
    charts.hourly.update();
    charts.donut.data.labels = current.repartition.labels;
    charts.donut.data.datasets[0].data = current.repartition.values;
    charts.donut.update();
    charts.daily.data.labels = dayLabels();
    charts.daily.data.datasets[0].data = dailySeries();
    charts.daily.data.datasets[0].backgroundColor = dailyColors();
    charts.daily.update();
  }

  /* ---------- carte ---------- */

  function initMap() {
    if (!window.L) {
      document.querySelector(".map-card").style.display = "none";
      document.querySelector(".ground").style.gridTemplateColumns = "1fr";
      return;
    }
    map = L.map("map", {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: !TOUCH,
      attributionControl: true
    });
    L.tileLayer("https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19
    }).addTo(map);
    if (TOUCH) els.mapOverlay.classList.add("visible");
    els.mapOverlay.addEventListener("click", () => {
      els.mapOverlay.classList.remove("visible");
      if (map) map.dragging.enable();
    });
    // re-verrouille la carte dès qu'on touche ailleurs (anti scroll-trap durable)
    if (TOUCH) {
      document.addEventListener("touchstart", (e) => {
        if (map && e.target instanceof Element && !e.target.closest(".map-wrap")) {
          els.mapOverlay.classList.add("visible");
          map.dragging.disable();
        }
      }, { passive: true });
    }
    renderMarkers();
  }

  function renderMarkers() {
    if (!map) return;
    Object.values(markers).forEach((mk) => map.removeLayer(mk));
    markers = {};
    const bounds = [];
    current.teams.forEach((team) => {
      const icon = L.divIcon({ className: "", html: '<div class="team-marker"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      const mk = L.marker([team.lat, team.lng], { icon }).addTo(map);
      mk._home = [team.lat, team.lng];
      mk.bindPopup(popupHtml(team));
      mk.on("click", () => highlightTeamFeed(team.id));
      markers[team.id] = mk;
      bounds.push([team.lat, team.lng]);
    });
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }

  function popupHtml(team) {
    const last = lastVoiceByTeam[team.id];
    return `<b>${team.name}</b><br>${team.members} · ${team.support}<br>${team.statLabel}` +
      (last ? `<br><span style="opacity:.6">Dernier vocal à ${last}</span>` : "");
  }

  function driftMarker() {
    if (!map) return;
    const ids = Object.keys(markers);
    if (!ids.length) return;
    const id = ids[Math.floor(Math.random() * ids.length)];
    const mk = markers[id];
    const pos = mk.getLatLng();
    const nlat = Math.max(mk._home[0] - 0.004, Math.min(mk._home[0] + 0.004, pos.lat + (Math.random() - 0.5) * 0.0012));
    const nlng = Math.max(mk._home[1] - 0.005, Math.min(mk._home[1] + 0.005, pos.lng + (Math.random() - 0.5) * 0.0016));
    mk.setLatLng([nlat, nlng]);
  }

  /* ---------- feed ---------- */

  function initials(name) {
    return name.slice(0, 2).toUpperCase();
  }

  function waveformSvg(seed) {
    const r = mulberry32(seed);
    let bars = "";
    const n = 22;
    for (let i = 0; i < n; i++) {
      const amp = 5 + r() * 13 * (0.55 + 0.45 * Math.sin((i / n) * Math.PI));
      bars += `<i style="height:${amp.toFixed(1)}px"></i>`;
    }
    return bars;
  }

  function chipHtml(msg) {
    const out = [];
    if (msg.chips) {
      Object.entries(msg.chips).forEach(([k, v]) => {
        const f = DATA.chipFormats[k];
        out.push(`<span class="data-chip">${f ? f(v) : `${v} ${k}`}</span>`);
      });
    }
    if (msg.place) out.push(`<span class="data-chip place">📍 ${msg.place}</span>`);
    out.push('<span class="mini-ia">✦ structuré par IA</span>');
    if (msg.quote) out.push(`<p class="feed-quote">« ${msg.quote} »</p>`);
    return out.join("");
  }

  function buildFeedItem(msg, time, opts = {}) {
    const item = document.createElement("div");
    item.className = "feed-item" + (opts.fresh ? " fresh" : "") + (opts.unfolded ? " unfolded" : "");
    if (msg.teamId) item.dataset.teamId = msg.teamId;
    const t = timeFmt.format(time);
    let bubble;
    if (msg.type === "photo") {
      bubble = `<div class="photo-bubble"><span class="pic">📷</span>${msg.photoLabel}</div>` +
        `<div class="feed-extract"><span class="data-chip place">Photo terrain archivée</span><span class="mini-ia">✦ médias collectés</span></div>`;
    } else {
      bubble =
        `<div class="voice-bubble">` +
        `<span class="voice-play"><svg viewBox="0 0 24 24" fill="none" stroke="#17191c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M18.5 11a6.5 6.5 0 0 1-13 0"/><path d="M12 17.5V21"/></svg></span>` +
        `<span class="voice-wave">${waveformSvg(hashStr(msg.agent + t))}</span>` +
        `<span class="voice-duration">${msg.duration}</span>` +
        `</div>` +
        `<div class="feed-extract">${chipHtml(msg)}</div>`;
    }
    item.innerHTML =
      `<div class="avatar">${initials(msg.agent)}</div>` +
      `<div class="feed-body">` +
      `<div class="feed-head"><b>${msg.agent}</b><span class="feed-time">${t}</span></div>` +
      bubble +
      `</div>`;
    return item;
  }

  function seedFeed() {
    els.feed.innerHTML = "";
    lastVoiceByTeam = {};
    const pool = current.feedPool;
    feedIndex = Math.floor(rng() * pool.length);
    const count = Math.min(7, pool.length);
    const now = simNow();
    const floor = new Date(now); floor.setHours(8, 0, 0, 0); // jamais de vocal avant 8h
    const items = [];
    for (let i = 0; i < count; i++) {
      const msg = pool[(feedIndex + i) % pool.length];
      const time = new Date(Math.max(floor.getTime(), now.getTime() - (count - i) * (7 + rng() * 9) * 60000));
      items.push({ msg, time });
      if (msg.teamId && msg.type === "voice") lastVoiceByTeam[msg.teamId] = timeFmt.format(time);
    }
    feedIndex = (feedIndex + count) % pool.length;
    // plus récent en haut, entrée en cascade (la page bouge dès l'ouverture)
    items.reverse().forEach(({ msg, time }, i) => {
      const item = buildFeedItem(msg, time, { unfolded: true });
      if (!REDUCED) item.style.animation = `feedIn 0.45s ${(i * 0.09).toFixed(2)}s both`;
      els.feed.appendChild(item);
    });
  }

  function pushFeedItem() {
    firstFeedDone = true;
    const pool = current.feedPool;
    const msg = pool[feedIndex % pool.length];
    feedIndex = (feedIndex + 1) % pool.length;
    if (isFrozen()) frozenSteps++;
    const time = simNow();
    const item = buildFeedItem(msg, time, { fresh: true });
    els.feed.prepend(item);
    // limite la longueur du feed (plus court en mobile : pas de scroll interne)
    const cap = window.matchMedia("(max-width: 720px)").matches ? 8 : 14;
    while (els.feed.children.length > cap) els.feed.removeChild(els.feed.lastChild);
    touchUpdated();
    if (msg.teamId && msg.type === "voice") {
      lastVoiceByTeam[msg.teamId] = timeFmt.format(time);
      const team = current.teams.find((tm) => tm.id === msg.teamId);
      if (team && markers[team.id]) markers[team.id].setPopupContent(popupHtml(team));
    }
    // dépliage IA après 1,2 s + application des chiffres aux compteurs
    const cam = current;
    setTimeout(() => {
      if (current !== cam) return; // campagne changée entre-temps
      item.classList.add("unfolded");
      if (msg.chips) {
        Object.entries(msg.chips).forEach(([k, v]) => {
          if (current.kpis.some((kp) => kp.id === k)) bumps[k] = (bumps[k] || 0) + v;
        });
        refreshKpis();
      }
    }, REDUCED ? 0 : 1200);
  }

  function highlightTeamFeed(teamId) {
    const items = els.feed.querySelectorAll(`[data-team-id="${teamId}"]`);
    els.feed.querySelectorAll(".highlight").forEach((el) => el.classList.remove("highlight"));
    items.forEach((el) => el.classList.add("highlight"));
    if (items[0]) items[0].scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "nearest" });
    setTimeout(() => items.forEach((el) => el.classList.remove("highlight")), 2600);
  }

  function onFeedClick(e) {
    const item = e.target.closest(".feed-item");
    if (!item || !item.dataset.teamId || !map) return;
    const team = current.teams.find((t) => t.id === item.dataset.teamId);
    const mk = markers[item.dataset.teamId];
    if (team && mk) {
      // en colonne unique, la carte est au-dessus du feed : on la ramène à l'écran
      if (window.matchMedia("(max-width: 1099px)").matches) {
        document.querySelector(".map-card").scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      }
      map.flyTo(mk.getLatLng(), Math.max(map.getZoom(), 13), { duration: REDUCED ? 0 : 1.1 });
      setTimeout(() => mk.openPopup(), REDUCED ? 0 : 1150);
    }
  }

  /* ---------- « mis à jour il y a Xs » ---------- */

  function touchUpdated() {
    lastUpdate = Date.now();
  }

  function tickUpdatedLabel() {
    if (localDayKey() !== dayKey) { location.reload(); return; } // passage de minuit
    const s = Math.round((Date.now() - lastUpdate) / 1000);
    els.updatedAgo.textContent = s < 4 ? "mis à jour à l’instant" : `mis à jour il y a ${s} s`;
  }

  /* ---------- moteur de ticks ----------
     Rythme d'ouverture : pendant ~2 min après le chargement (ou un retour
     sur l'onglet, ou un changement de campagne), tout est accéléré pour que
     la page soit visiblement vivante. Ensuite, croisière plus calme pour ne
     pas faire dériver les compteurs si la page reste ouverte longtemps. */

  function wakeRhythm() {
    bootTime = Date.now();
    firstFeedDone = false;
  }

  function scheduleTick() {
    const warm = Date.now() - bootTime < 90000;
    const delay = warm ? 2500 + Math.random() * 2500 : 4000 + Math.random() * 5000;
    timers.push(setTimeout(() => {
      const r = Math.random();
      if (r < 0.55) refreshKpis();
      else if (r < 0.75) { updateChartsLive(); touchUpdated(); }
      else if (r < 0.9) driftMarker();
      /* sinon : silence — le rythme organique */
      scheduleTick();
    }, delay));
  }

  function feedDelay() {
    if (!firstFeedDone) return 3500 + Math.random() * 2500;            // 1er vocal : 3,5-6 s
    if (Date.now() - bootTime < 120000) return 9000 + Math.random() * 8000; // 2 premières min : 9-17 s
    return 25000 + Math.random() * 25000;                              // croisière : 25-50 s
  }

  function scheduleFeed() {
    timers.push(setTimeout(() => {
      pushFeedItem();
      scheduleFeed();
    }, feedDelay()));
  }

  function startEngine() {
    stopEngine();
    scheduleTick();
    scheduleFeed();
    timers.push(setInterval(tickUpdatedLabel, 1000));
  }

  function stopEngine() {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers = [];
  }

  /* ---------- sélecteur de campagne ---------- */

  function buildSwitcher() {
    const ids = Object.keys(DATA.campaigns);
    ids.forEach((id) => {
      const c = DATA.campaigns[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = c.meta.shortLabel;
      btn.dataset.id = id;
      btn.addEventListener("click", () => switchCampaign(id));
      els.segmented.appendChild(btn);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${c.meta.shortLabel} — ${c.meta.name}`;
      els.select.appendChild(opt);
    });
    els.select.addEventListener("change", () => switchCampaign(els.select.value));
  }

  function markActive(id) {
    els.segmented.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.id === id);
      b.setAttribute("aria-pressed", String(b.dataset.id === id));
    });
    els.select.value = id;
  }

  function switchCampaign(id) {
    if (current && current.id === id) return;
    current = DATA.campaigns[id];
    rng = mulberry32(hashStr(dayKey + id));
    bumps = bumpsStore[id] = bumpsStore[id] || {};
    markActive(id);
    renderBanner();
    renderKpis();
    updateChartsCampaign();
    renderMarkers();
    seedFeed();
    touchUpdated();
    wakeRhythm();
    startEngine(); // re-planifie ticks + feed sur le rythme d'ouverture
  }

  /* ---------- visibilité ---------- */

  document.addEventListener("visibilitychange", () => {
    if (!current) return;
    if (document.hidden) stopEngine();
    else {
      refreshKpis();
      updateChartsLive();
      wakeRhythm(); // retour sur l'onglet : la page repart en rythme d'ouverture
      startEngine();
    }
  });

  /* ---------- init ---------- */

  function init() {
    if (!DATA) return;
    buildSwitcher();
    current = DATA.campaigns[DATA.defaultCampaign];
    rng = mulberry32(hashStr(dayKey + current.id));
    bumps = bumpsStore[current.id] = {};
    markActive(current.id);
    renderBanner();
    renderKpis();
    initCharts();
    initMap();
    seedFeed();
    els.feed.addEventListener("click", onFeedClick);
    startEngine();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (map) map.invalidateSize();
        redrawSparks();
        Object.values(charts).forEach((c) => c && c.update());
      });
    }

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        redrawSparks();
        if (map) map.invalidateSize();
      }, 250);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
