/**
 * Global Market Monitor - Vanilla JavaScript Edition
 * No React, No JSX, No Complex Build Tools.
 */

// --- Constants & Data ---

const MARKETS = [
  // Americas
  { id: 'nyse', name: 'NYSE, NASDAQ - NEW YORK', shortName: 'NYSE', timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', region: 'Americas' },
  { id: 'chi', name: 'CME - CHICAGO', shortName: 'CHI', timezone: 'America/Chicago', openTime: '08:30', closeTime: '15:15', region: 'Americas' },
  { id: 'tor', name: 'TSX - TORONTO', shortName: 'TSX', timezone: 'America/Toronto', openTime: '09:30', closeTime: '16:00', region: 'Americas' },
  { id: 'b3', name: 'BM&FBOVESPA - SAO PAULO', shortName: 'B3', timezone: 'America/Sao_Paulo', openTime: '10:00', closeTime: '17:00', region: 'Americas' },
  
  // Europe
  { id: 'lse', name: 'LSE - LONDON', shortName: 'LSE', timezone: 'Europe/London', openTime: '08:00', closeTime: '16:30', region: 'Europe' },
  { id: 'six', name: 'SIX - ZURICH', shortName: 'SIX', timezone: 'Europe/Zurich', openTime: '09:00', closeTime: '17:30', region: 'Europe' },
  { id: 'fra', name: 'FWB - FRANKFURT', shortName: 'FWB', timezone: 'Europe/Berlin', openTime: '09:00', closeTime: '17:30', region: 'Europe' },
  { id: 'mos', name: 'MOEX - MOSCOW', shortName: 'MOEX', timezone: 'Europe/Moscow', openTime: '10:00', closeTime: '18:50', region: 'Europe' },
  { id: 'jse', name: 'JSE - JOHANNESBURG', shortName: 'JSE', timezone: 'Africa/Johannesburg', openTime: '09:00', closeTime: '17:00', region: 'Europe' },
  
  // Asia & Pacific
  { id: 'tad', name: 'TADAWUL - RIYADH', shortName: 'TADAWUL', timezone: 'Asia/Riyadh', openTime: '10:00', closeTime: '15:00', region: 'Asia & Pacific' },
  { id: 'dfm', name: 'DFM - DUBAI', shortName: 'DFM', timezone: 'Asia/Dubai', openTime: '10:00', closeTime: '15:00', region: 'Asia & Pacific' },
  { id: 'nse', name: 'NSE - MUMBAI', shortName: 'NSE', timezone: 'Asia/Kolkata', openTime: '09:15', closeTime: '15:30', region: 'Asia & Pacific' },
  { id: 'hk', name: 'HKEX - HONG KONG', shortName: 'HKEX', timezone: 'Asia/Hong_Kong', openTime: '09:30', closeTime: '16:00', lunchStart: '12:00', lunchEnd: '13:00', region: 'Asia & Pacific' },
  { id: 'sha', name: 'SSE - SHANGHAI', shortName: 'SSE', timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', lunchStart: '11:30', lunchEnd: '13:00', region: 'Asia & Pacific' },
  { id: 'sgx', name: 'SGX - SINGAPORE', shortName: 'SGX', timezone: 'Asia/Singapore', openTime: '09:00', closeTime: '17:00', lunchStart: '12:00', lunchEnd: '12:58', region: 'Asia & Pacific' },
  { id: 'tky', name: 'JPX - TOKYO', shortName: 'JPX', timezone: 'Asia/Tokyo', openTime: '09:00', closeTime: '15:00', lunchStart: '11:30', lunchEnd: '12:30', region: 'Asia & Pacific' },
  { id: 'syd', name: 'ASX - SYDNEY', shortName: 'ASX', timezone: 'Australia/Sydney', openTime: '10:00', closeTime: '16:00', region: 'Asia & Pacific' },
  { id: 'nzx', name: 'NZX - WELLINGTON', shortName: 'NZX', timezone: 'Pacific/Auckland', openTime: '10:00', closeTime: '16:45', region: 'Asia & Pacific' },
];

const TIMEZONE_OFFSET = 7; // WIB (UTC+7)

// --- State ---
let currentSearch = '';

// --- Helpers ---

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getUTCOffsetMinutes = (timezone, now) => {
  try {
    const localStr = now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
    const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
    const localDate = new Date(localStr);
    const utcDate = new Date(utcStr);
    return Math.round((localDate - utcDate) / 60000);
  } catch (e) {
    console.error("Timezone error:", timezone);
    return 0;
  }
};

const formatCountdown = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getMarketStatus = (market, now) => {
  const offset = getUTCOffsetMinutes(market.timezone, now);
  const nowUTCMinutes = (now.getUTCHours() * 60) + now.getUTCMinutes();
  
  const currentLocalMinutes = (nowUTCMinutes + offset + 1440) % 1440;
  const openMins = timeToMinutes(market.openTime);
  const closeMins = timeToMinutes(market.closeTime);
  
  let isLunch = false;
  let lunchStartMins = 0;
  let lunchEndMins = 0;
  
  if (market.lunchStart) {
    lunchStartMins = timeToMinutes(market.lunchStart);
    lunchEndMins = timeToMinutes(market.lunchEnd);
    if (currentLocalMinutes >= lunchStartMins && currentLocalMinutes < lunchEndMins) {
      isLunch = true;
    }
  }

  const isOpen = currentLocalMinutes >= openMins && currentLocalMinutes < closeMins && !isLunch;
  
  let countdownText = '';
  if (isOpen) {
    const nextEventMins = market.lunchStart && currentLocalMinutes < lunchStartMins ? lunchStartMins : closeMins;
    const diff = nextEventMins - currentLocalMinutes;
    countdownText = `${market.lunchStart && currentLocalMinutes < lunchStartMins ? 'Lunch' : 'Closes'} in ${formatCountdown(diff)}`;
  } else if (isLunch) {
    countdownText = `Resume in ${formatCountdown(lunchEndMins - currentLocalMinutes)}`;
  } else {
    let diff = openMins - currentLocalMinutes;
    if (diff < 0) diff += 1440;
    countdownText = `Opens in ${formatCountdown(diff)}`;
  }

  // WIB hours for timeline
  const wibOffset = (TIMEZONE_OFFSET * 60) - offset;
  const startWIB = (openMins + wibOffset + 1440) % 1440;
  const endWIB = (closeMins + wibOffset + 1440) % 1440;
  let lStartWIB = 0, lEndWIB = 0;
  if (market.lunchStart) {
    lStartWIB = (lunchStartMins + wibOffset + 1440) % 1440;
    lEndWIB = (lunchEndMins + wibOffset + 1440) % 1440;
  }

  return { 
    isOpen, isLunch, 
    statusText: isOpen ? 'Open' : (isLunch ? 'Lunch' : 'Closed'), 
    countdownText,
    startWIB, endWIB, lStartWIB, lEndWIB
  };
};

// --- Rendering Logic ---

function renderTimeline(status, now) {
  const currentMins = (now.getHours() * 60) + now.getMinutes();
  const isInRange = (m, start, end) => {
    if (start < end) return m >= start && m < end;
    return m >= start || m < end;
  };

  let hoursHTML = '';
  for (let h = 0; h < 24; h++) {
    const hourStart = h * 60;
    let colorClass = '';
    const isTrading = isInRange(hourStart + 30, status.startWIB, status.endWIB);
    const inLunch = status.lStartWIB !== status.lEndWIB && isInRange(hourStart + 30, status.lStartWIB, status.lEndWIB);
    
    if (isTrading) {
      colorClass = inLunch ? 'hour-lunch' : 'hour-open';
    }

    const isCurrent = h === now.getHours();
    const markerHTML = isCurrent ? `<div class="current-marker" style="left: ${(now.getMinutes() / 60) * 100}%"></div>` : '';
    
    hoursHTML += `<div class="hour-block ${colorClass}">${markerHTML}</div>`;
  }

  return `
    <div class="timeline-container">
      <div class="timeline-bar">${hoursHTML}</div>
      <div class="timeline-labels">
        <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span>
      </div>
    </div>
  `;
}

function renderTable() {
  const now = new Date();
  const container = document.getElementById('market-tables-container');
  if (!container) return;

  // Process data
  const data = MARKETS.map(m => {
    const status = getMarketStatus(m, now);
    const localTime = now.toLocaleTimeString('en-GB', { 
      timeZone: m.timezone, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return { ...m, ...status, localTime };
  });

  // Filter
  const filtered = data.filter(m => 
    m.name.toLowerCase().includes(currentSearch.toLowerCase()) || 
    m.shortName.toLowerCase().includes(currentSearch.toLowerCase()) ||
    m.region.toLowerCase().includes(currentSearch.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 5rem 0; text-align: center; color: #475569;">
        <svg style="margin-bottom: 1rem; opacity: 0.2;" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p style="font-weight: 700; color: #94a3b8;">No markets found</p>
        <p style="font-size: 0.875rem;">Try searching for a different name or region.</p>
      </div>
    `;
    return;
  }

  // Group by region
  const regions = [...new Set(MARKETS.map(m => m.region))];
  let finalHTML = '';

  regions.forEach(region => {
    const regionMarkets = filtered.filter(m => m.region === region);
    if (regionMarkets.length === 0) return;

    // Sort: Open first
    regionMarkets.sort((a, b) => (a.isOpen && !b.isOpen) ? -1 : (!a.isOpen && b.isOpen) ? 1 : 0);

    let rowsHTML = '';
    regionMarkets.forEach(m => {
      const icon = m.isOpen ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>' : 
        (m.isLunch ? 
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>' : 
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>');

      const statusClass = m.isOpen ? 'status-open' : (m.isLunch ? 'status-lunch' : 'status-closed');
      const countdownClass = m.isOpen ? 'countdown-open' : (m.isLunch ? 'countdown-lunch' : 'countdown-closed');

      rowsHTML += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="logo-box" style="padding: 0.5rem; background: ${m.isOpen ? 'rgba(249, 115, 22, 0.1)' : 'rgba(30, 41, 59, 0.5)'}; color: ${m.isOpen ? '#f97316' : '#475569'}; box-shadow: none; border-radius: 0.5rem;">
                ${icon}
              </div>
              <div>
                <span class="market-name">${m.name.split(' - ')[1]}</span>
                <div class="market-info">
                  <span class="region-tag">${m.shortName}</span>
                  ${m.timezone.split('/')[1].replace('_', ' ')}
                </div>
              </div>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div class="status-badge ${statusClass}">${m.statusText}</div>
              <span class="countdown-text ${countdownClass}">${m.countdownText}</span>
            </div>
          </td>
          <td>
            <span class="local-time">${m.localTime}</span>
            <span class="local-label">Local</span>
          </td>
          <td>
            <div style="text-align: center;">
              <div class="market-info" style="color: #94a3b8; font-size: 11px;">
                ${m.openTime} - ${m.closeTime}
              </div>
              ${m.lunchStart ? `<div style="font-size: 8px; color: rgba(59, 130, 246, 0.6); font-family: 'JetBrains Mono'; margin-top: 2px;">LUNCH: ${m.lunchStart}-${m.lunchEnd}</div>` : ''}
            </div>
          </td>
          <td>
            ${renderTimeline(m, now)}
          </td>
        </tr>
      `;
    });

    finalHTML += `
      <div class="region-header">
        <h2 class="region-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
          ${region}
        </h2>
        <div class="region-line"></div>
      </div>
      <div class="table-wrapper">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Market / Exchange</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Current Time</th>
                <th style="text-align: center;">Hours (Local)</th>
                <th>24h Timeline (WIB)</th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = finalHTML;

  // Update Stats
  document.getElementById('stat-open-count').textContent = data.filter(m => m.isOpen).length;
  document.getElementById('stat-lunch-count').textContent = data.filter(m => m.isLunch).length;
  document.getElementById('stat-closed-count').textContent = data.length - data.filter(m => m.isOpen).length - data.filter(m => m.isLunch).length;
}

function updateClock() {
  const now = new Date();
  const main = document.getElementById('clock-main');
  
  if (main) {
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const secStr = now.toLocaleTimeString('en-GB', { second: '2-digit' });
    // Pastikan span detik tetap memiliki ID 'clock-secs' agar loop berikutnya bisa menemukannya (jika perlu)
    // Namun lebih baik kita update innerHTML induknya saja secara konsisten
    main.innerHTML = `${timeStr} <span class="seconds" id="clock-secs">${secStr}</span>`;
  }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
  // Setup Search
  const searchInput = document.getElementById('market-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderTable();
    });
  }

  // Set Footer Year
  const yearSpan = document.getElementById('footer-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Initial render
  renderTable();
  updateClock();

  // Loops
  setInterval(renderTable, 1000);
  setInterval(updateClock, 1000);
});
