
/**
 * Global Market Clock Logic
 * Timezone: WIB (UTC+7) - Banyumas
 * Visual Style: Concentric Rings (Americas Outer -> Asia Inner)
 */

// --- Constants ---

// Organized Outer (Top) to Inner (Bottom) based on visual reference
const MARKETS = [
  // Americas
  { id: 'nyse', name: 'NYSE, NASDAQ - NEW YORK', shortName: 'NYSE', timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00', radiusOffset: 0 },
  { id: 'chi', name: 'CME - CHICAGO', shortName: 'CHI', timezone: 'America/Chicago', openTime: '08:30', closeTime: '15:15', radiusOffset: 1 }, 
  { id: 'tor', name: 'TSX - TORONTO', shortName: 'TSX', timezone: 'America/Toronto', openTime: '09:30', closeTime: '16:00', radiusOffset: 2 },
  { id: 'b3', name: 'BM&FBOVESPA - SAO PAULO', shortName: 'B3', timezone: 'America/Sao_Paulo', openTime: '10:00', closeTime: '17:00', radiusOffset: 3 },
  
  // Europe / Africa
  { id: 'lse', name: 'LSE - LONDON', shortName: 'LSE', timezone: 'Europe/London', openTime: '08:00', closeTime: '16:30', radiusOffset: 4 },
  { id: 'six', name: 'SIX - ZURICH', shortName: 'SIX', timezone: 'Europe/Zurich', openTime: '09:00', closeTime: '17:30', radiusOffset: 5 },
  { id: 'fra', name: 'FWB - FRANKFURT', shortName: 'FWB', timezone: 'Europe/Berlin', openTime: '09:00', closeTime: '17:30', radiusOffset: 6 },
  { id: 'mos', name: 'MOEX - MOSCOW', shortName: 'MOEX', timezone: 'Europe/Moscow', openTime: '10:00', closeTime: '18:50', radiusOffset: 7 },
  { id: 'jse', name: 'JSE - JOHANNESBURG', shortName: 'JSE', timezone: 'Africa/Johannesburg', openTime: '09:00', closeTime: '17:00', radiusOffset: 8 },
  
  // Middle East / India
  { id: 'tad', name: 'TADAWUL - RIYADH', shortName: 'TADAWUL', timezone: 'Asia/Riyadh', openTime: '10:00', closeTime: '15:00', radiusOffset: 9 },
  { id: 'dfm', name: 'DFM - DUBAI', shortName: 'DFM', timezone: 'Asia/Dubai', openTime: '10:00', closeTime: '15:00', radiusOffset: 10 },
  { id: 'nse', name: 'NSE - MUMBAI', shortName: 'NSE', timezone: 'Asia/Kolkata', openTime: '09:15', closeTime: '15:30', radiusOffset: 11 },
  
  // Asia
  { id: 'hk', name: 'HKEX - HONG KONG', shortName: 'HKEX', timezone: 'Asia/Hong_Kong', openTime: '09:30', closeTime: '16:00', lunchStart: '12:00', lunchEnd: '13:00', radiusOffset: 12 },
  { id: 'sha', name: 'SSE - SHANGHAI', shortName: 'SSE', timezone: 'Asia/Shanghai', openTime: '09:30', closeTime: '15:00', lunchStart: '11:30', lunchEnd: '13:00', radiusOffset: 13 },
  { id: 'sgx', name: 'SGX - SINGAPORE', shortName: 'SGX', timezone: 'Asia/Singapore', openTime: '09:00', closeTime: '17:00', lunchStart: '12:00', lunchEnd: '12:58', radiusOffset: 14 },
  { id: 'tky', name: 'JPX - TOKYO', shortName: 'JPX', timezone: 'Asia/Tokyo', openTime: '09:00', closeTime: '15:00', lunchStart: '11:30', lunchEnd: '12:30', radiusOffset: 15 },
  
  // Pacific
  { id: 'syd', name: 'ASX - SYDNEY', shortName: 'ASX', timezone: 'Australia/Sydney', openTime: '10:00', closeTime: '16:00', radiusOffset: 16 },
  { id: 'nzx', name: 'NZX - WELLINGTON', shortName: 'NZX', timezone: 'Pacific/Auckland', openTime: '10:00', closeTime: '16:45', radiusOffset: 17 },
];

const TIMEZONE_OFFSET = 7; // WIB (UTC+7)
const BASE_RADIUS = 195; // Outer radius
const RING_SPACING = 8; // Space between rings
const STROKE_WIDTH = 5;

// --- Helpers ---

// Get decimal UTC hour from local "HH:MM"
function getUTCDecimalHour(timeStr, timezone, now) {
  const [h, m] = timeStr.split(':').map(Number);
  const utcNow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0));
  const localVersion = new Date(utcNow.toLocaleString('en-US', { timeZone: timezone }));
  const diffMs = localVersion.getTime() - utcNow.getTime();
  const targetTime = new Date(utcNow.getTime() - diffMs);
  return targetTime.getUTCHours() + targetTime.getUTCMinutes() / 60;
}

// Calculate Market Status
function getMarketStatus(market, now) {
  const localTimeStr = now.toLocaleTimeString('en-US', { 
    timeZone: market.timezone, 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const [localH, localM] = localTimeStr.split(':').map(Number);
  const currentLocalMinutes = localH * 60 + localM;

  const [openH, openM] = market.openTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;

  const [closeH, closeM] = market.closeTime.split(':').map(Number);
  const closeMinutes = closeH * 60 + closeM;

  let isLunch = false;
  if (market.lunchStart && market.lunchEnd) {
    const [lStartH, lStartM] = market.lunchStart.split(':').map(Number);
    const [lEndH, lEndM] = market.lunchEnd.split(':').map(Number);
    const lunchStartMinutes = lStartH * 60 + lStartM;
    const lunchEndMinutes = lEndH * 60 + lEndM;
    
    if (currentLocalMinutes >= lunchStartMinutes && currentLocalMinutes < lunchEndMinutes) {
      isLunch = true;
    }
  }

  const isOpen = currentLocalMinutes >= openMinutes && currentLocalMinutes < closeMinutes && !isLunch;
  
  let statusText = 'Closed';
  if (isOpen) statusText = 'Open';
  if (isLunch) statusText = 'Lunch Break';

  const utcOpen = getUTCDecimalHour(market.openTime, market.timezone, now);
  const utcClose = getUTCDecimalHour(market.closeTime, market.timezone, now);
  
  let utcLunchStart, utcLunchEnd;
  if (market.lunchStart && market.lunchEnd) {
    utcLunchStart = getUTCDecimalHour(market.lunchStart, market.timezone, now);
    utcLunchEnd = getUTCDecimalHour(market.lunchEnd, market.timezone, now);
  }

  let nextEvent = '';
  if (isOpen) {
    const minsUntilClose = closeMinutes - currentLocalMinutes;
    const h = Math.floor(minsUntilClose / 60);
    const m = minsUntilClose % 60;
    nextEvent = `Closes in ${h}h ${m}m`;
  } else {
    let minsUntilOpen = openMinutes - currentLocalMinutes;
    if (minsUntilOpen < 0) minsUntilOpen += 24 * 60;
    const h = Math.floor(minsUntilOpen / 60);
    const m = minsUntilOpen % 60;
    nextEvent = `Opens in ${h}h ${m}m`;
  }

  return { isOpen, statusText, nextEvent, utcOpen, utcClose, utcLunchStart, utcLunchEnd };
}

// --- SVG Geometry Functions ---

function timeToDegrees(time) {
  return (time / 24) * 360 - 90;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);

  if (Math.abs(endAngle - startAngle) >= 360) {
      return `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y}`;
  }

  let largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  let correctedEndAngle = endAngle;
  if (correctedEndAngle < startAngle) {
      correctedEndAngle += 360;
      largeArcFlag = correctedEndAngle - startAngle <= 180 ? '0' : '1';
  }

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function describeRingPath(cx, cy, radius, reverse = false) {
    if (!reverse) {
        return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`;
    } else {
        return `M ${cx} ${cy + radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy - radius} A ${radius} ${radius} 0 1 0 ${cx} ${cy + radius}`;
    }
}

// --- Application Logic ---

const clockWrapper = document.getElementById('clock-wrapper');
const marketListEl = document.getElementById('market-list');
const footerYear = document.querySelector('.market-year');

if (footerYear) {
    footerYear.textContent = `© ${new Date().getFullYear()} HDWeb Market Tools. Data is for visualization purposes only.`;
}

// Initial Rendering
function renderClockBase() {
    const hourMarkers = Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const r = BASE_RADIUS + 15;
        const x = 200 + r * Math.cos(rad);
        const y = 200 + r * Math.sin(rad);
        return `<text x="${x}" y="${y}" fill="#64748b" font-size="10" font-weight="bold" text-anchor="middle" alignment-baseline="middle" class="font-mono select-none">${i === 0 ? '24' : i.toString().padStart(2, '0')}</text>`;
    }).join('');

    const ringDefs = MARKETS.map((m, i) => {
        const r = BASE_RADIUS - (i * RING_SPACING);
        return `
            <path id="ring-path-${i}-cw" d="M 200, ${200-r} A ${r} ${r} 0 1 1 200, ${200+r} A ${r} ${r} 0 1 1 200, ${200-r}" fill="none" />
            <path id="ring-path-${i}-ccw" d="M 200, ${200+r} A ${r} ${r} 0 0 1 200, ${200-r} A ${r} ${r} 0 0 1 200, ${200+r}" fill="none" /> 
        `;
    }).join('');

    return `
    <svg viewBox="-20 -20 440 440" class="w-full h-full drop-shadow-2xl">
        <defs>
            ${ringDefs}
            <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                <feOffset in="blur" dx="2" dy="2" result="offsetBlur"/>
                <feMerge>
                    <feMergeNode in="offsetBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>

        <!-- Background -->
        <circle cx="200" cy="200" r="215" fill="#020617" />
        <circle cx="200" cy="200" r="${BASE_RADIUS + 5}" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
        
        <!-- Grid Lines -->
        <g opacity="0.2">
            ${Array.from({ length: 24 }, (_, i) => {
                const angle = (i * 15 - 90) * Math.PI / 180;
                return `<line x1="200" y1="200" x2="${200 + 200 * Math.cos(angle)}" y2="${200 + 200 * Math.sin(angle)}" stroke="#334155" stroke-width="1" />`;
            }).join('')}
        </g>

        <!-- Market Rings Container -->
        <g id="market-rings"></g>

        <!-- Hour Markers -->
        ${hourMarkers}

        <!-- Center Info -->
        <text x="200" y="240" fill="#94a3b8" font-size="8" text-anchor="middle" class="font-mono tracking-widest">WIB / UTC+7</text>
        <text id="digital-time" x="200" y="260" fill="#f8fafc" font-size="20" font-weight="bold" text-anchor="middle" class="font-mono tracking-widest" style="filter: url(#glow);">00:00:00</text>
        <text id="active-count" x="200" y="275" fill="#f97316" font-size="10" text-anchor="middle" class="font-mono">Loading...</text>

        <!-- Hands Container -->
        <g id="clock-hands" filter="url(#shadow)">
            <!-- Hour Hand (24h) -->
            <g id="hour-hand-group">
                <path d="M194 200 L200 90 L206 200 Z" fill="#f97316" />
                <circle cx="200" cy="200" r="6" fill="#f97316" />
            </g>
            
            <!-- Minute Hand -->
            <g id="minute-hand-group">
                <path d="M197 200 L200 50 L203 200 Z" fill="#cbd5e1" />
                <circle cx="200" cy="200" r="4" fill="#cbd5e1" />
            </g>
            
            <!-- Second Hand -->
            <g id="second-hand-group">
                <line x1="200" y1="225" x2="200" y2="40" stroke="#ef4444" stroke-width="2" />
                <circle cx="200" cy="200" r="3" fill="#ef4444" />
                <circle cx="200" cy="225" r="2" fill="#ef4444" opacity="0.8" />
            </g>
            
            <!-- Center Pin -->
            <circle cx="200" cy="200" r="2" fill="#ffffff" />
        </g>
    </svg>
    `;
}

clockWrapper.innerHTML = renderClockBase();

const marketRingsGroup = document.getElementById('market-rings');
const digitalTimeEl = document.getElementById('digital-time');
const activeCountEl = document.getElementById('active-count');

const hourHandGroup = document.getElementById('hour-hand-group');
const minuteHandGroup = document.getElementById('minute-hand-group');
const secondHandGroup = document.getElementById('second-hand-group');

// Animation Loop for Hands (60fps)
function animateHands() {
    const now = new Date();
    // Calculate WIB (UTC+7) manually for smoothness
    // Local timestamp + (Local Offset to UTC) + (7 hours offset)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utcTime + (3600000 * TIMEZONE_OFFSET));
    
    const s = wibTime.getSeconds();
    const ms = wibTime.getMilliseconds();
    const m = wibTime.getMinutes();
    const h = wibTime.getHours();

    // Smooth Second Hand: s + ms/1000
    const smoothSecond = s + (ms / 1000);
    const smoothMinute = m + (smoothSecond / 60);
    const smoothHour = h + (smoothMinute / 60);

    // Angles
    const secondAngle = (smoothSecond / 60) * 360;
    const minuteAngle = (smoothMinute / 60) * 360;
    const hourAngle = (smoothHour / 24) * 360; // 24-hour rotation

    if(hourHandGroup) hourHandGroup.setAttribute('transform', `rotate(${hourAngle}, 200, 200)`);
    if(minuteHandGroup) minuteHandGroup.setAttribute('transform', `rotate(${minuteAngle}, 200, 200)`);
    if(secondHandGroup) secondHandGroup.setAttribute('transform', `rotate(${secondAngle}, 200, 200)`);
    
    // Update digital time strictly every frame or simple check
    // Formatting manually to avoid Intl overhead in animation loop
    const pad = (n) => n.toString().padStart(2, '0');
    digitalTimeEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    requestAnimationFrame(animateHands);
}

// Data Update Loop for Markets (1fps)
function updateMarketData() {
    const now = new Date();
    
    // 3. Process Markets
    const marketStatuses = MARKETS.map(market => ({ ...market, ...getMarketStatus(market, now) }));
    const activeCount = marketStatuses.filter(m => m.isOpen).length;
    activeCountEl.textContent = `${activeCount} Markets Open`;

    // 4. Render Rings
    const ringsSVG = marketStatuses.map((market, i) => {
        const r = BASE_RADIUS - (i * RING_SPACING);
        
        const startWIB = (market.utcOpen + TIMEZONE_OFFSET + 24) % 24;
        const endWIB = (market.utcClose + TIMEZONE_OFFSET + 24) % 24;

        const startAngle = timeToDegrees(startWIB);
        const endAngle = timeToDegrees(endWIB);
        
        // Text Path Logic
        const labelDeg = timeToDegrees(startWIB); 
        const startCoords = polarToCartesian(200, 200, r, labelDeg);
        const isBottom = startCoords.y > 200;
        
        const pathId = isBottom ? `ring-path-${i}-ccw` : `ring-path-${i}-cw`;
        
        let startOffset = 0;
        if (!isBottom) {
             let ang = labelDeg + 90;
             if (ang < 0) ang += 360;
             startOffset = (ang / 360) * 100;
        } else {
             let ang = 90 - labelDeg;
             if (ang < 0) ang += 360;
             startOffset = (ang / 360) * 100;
        }
        startOffset = startOffset % 100;

        const arcPath = describeArc(200, 200, r, startAngle, endAngle);
        const isLunch = market.statusText === 'Lunch Break';
        const arcColor = market.isOpen ? "#f97316" : isLunch ? "#3b82f6" : "#334155";
        const textColor = market.isOpen ? "#ffffff" : isLunch ? "#60a5fa" : "#64748b";
        const fontWeight = market.isOpen ? "bold" : "normal";
        const trackOpacity = 0.2;
        
        let lunchPath = '';
        if (market.lunchStart && market.lunchEnd) {
             const lStartWIB = (market.utcLunchStart + TIMEZONE_OFFSET + 24) % 24;
             const lEndWIB = (market.utcLunchEnd + TIMEZONE_OFFSET + 24) % 24;
             lunchPath = `<path d="${describeArc(200, 200, r, timeToDegrees(lStartWIB), timeToDegrees(lEndWIB))}" fill="none" stroke="#020617" stroke-width="${STROKE_WIDTH+1}" />`;
        }

        return `
            <g class="transition-all duration-300">
                <!-- Track -->
                <circle cx="200" cy="200" r="${r}" fill="none" stroke="#1e293b" stroke-width="${STROKE_WIDTH}" stroke-opacity="${trackOpacity}" />
                
                <!-- Active Arc -->
                <path d="${arcPath}" fill="none" stroke="${arcColor}" stroke-width="${STROKE_WIDTH}" stroke-linecap="butt" />
                
                <!-- Lunch Break -->
                ${lunchPath}
                
                <!-- Label on Path -->
                <text fill="${textColor}" font-size="6" font-weight="${fontWeight}" font-family="monospace" dy="-1">
                    <textPath href="#${pathId}" startOffset="${startOffset}%" text-anchor="start">
                        ${market.name}
                    </textPath>
                </text>
            </g>
        `;
    }).join('');

    marketRingsGroup.innerHTML = ringsSVG;

    // 5. Render List
    const listHTML = marketStatuses.map(m => {
        const isLunch = m.statusText === 'Lunch Break';
        return `
        <div class="p-3 rounded border ${m.isOpen ? 'border-orange-500/50 bg-orange-950/30' : isLunch ? 'border-blue-500/50 bg-blue-950/30' : 'border-slate-800 bg-slate-900/40'} flex flex-col justify-between h-full transition-colors">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-slate-200">${m.name.split(' - ')[1]}</span>
                <span class="text-[10px] text-slate-500">${m.shortName}</span>
            </div>
            <div class="mt-2">
                <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>${m.openTime} - ${m.closeTime}</span>
                    <span class="${m.isOpen ? "text-orange-400 font-bold" : isLunch ? "text-blue-400 font-bold" : ""}">${m.statusText.toUpperCase()}</span>
                </div>
                <div class="w-full bg-slate-800/50 h-1 mt-1 rounded-full overflow-hidden">
                     <div class="h-full transition-all duration-500 ${m.isOpen ? 'bg-orange-500' : isLunch ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}" style="width: ${m.isOpen || isLunch ? '100%' : '0%'}"></div>
                </div>
            </div>
        </div>
    `}).join('');
    
    marketListEl.innerHTML = listHTML;
}

// Start Loops
updateMarketData(); // Run once immediately
setInterval(updateMarketData, 1000); // Update market status every second
requestAnimationFrame(animateHands); // Start smooth animation loop
