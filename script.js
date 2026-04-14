import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Globe, Sun, Moon, Coffee, Info, ExternalLink, Search, Clock, MapPin, ChevronRight, X } from 'lucide-react';

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

// --- Helpers ---

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getUTCOffsetMinutes = (timezone, now) => {
  const localStr = now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
  const localDate = new Date(localStr);
  const utcDate = new Date(utcStr);
  return Math.round((localDate - utcDate) / 60000);
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
  const statusText = isOpen ? 'Open' : (isLunch ? 'Lunch' : 'Closed');
  
  let countdownMins = 0;
  let countdownText = '';
  
  if (isOpen) {
    if (market.lunchStart && currentLocalMinutes < lunchStartMins) {
      countdownMins = lunchStartMins - currentLocalMinutes;
      countdownText = `Lunch in ${formatCountdown(countdownMins)}`;
    } else {
      countdownMins = closeMins - currentLocalMinutes;
      countdownText = `Closes in ${formatCountdown(countdownMins)}`;
    }
  } else if (isLunch) {
    countdownMins = lunchEndMins - currentLocalMinutes;
    countdownText = `Resume in ${formatCountdown(countdownMins)}`;
  } else {
    countdownMins = (openMins - currentLocalMinutes + 1440) % 1440;
    countdownText = `Opens in ${formatCountdown(countdownMins)}`;
  }

  const wibOffset = (TIMEZONE_OFFSET * 60) - offset;
  const startWIB = (openMins + wibOffset + 1440) % 1440;
  const endWIB = (closeMins + wibOffset + 1440) % 1440;
  let lStartWIB = 0, lEndWIB = 0;
  if (market.lunchStart) {
    lStartWIB = (lunchStartMins + wibOffset + 1440) % 1440;
    lEndWIB = (lunchEndMins + wibOffset + 1440) % 1440;
  }

  return { isOpen, isLunch, statusText, countdownText, startWIB, endWIB, lStartWIB, lEndWIB };
};

// --- Components ---

const MarketTimeline = ({ status, now }) => {
  const isInRange = (m, start, end) => {
    if (start < end) return m >= start && m < end;
    return m >= start || m < end;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative h-4 bg-slate-900/50 rounded-md overflow-hidden border border-slate-800/50 flex">
        {Array.from({ length: 24 }).map((_, h) => {
          const hourStart = h * 60;
          let colorClass = 'bg-slate-900/40';
          const isTrading = isInRange(hourStart + 30, status.startWIB, status.endWIB);
          const inLunch = status.lStartWIB !== status.lEndWIB && isInRange(hourStart + 30, status.lStartWIB, status.lEndWIB);
          if (isTrading) colorClass = inLunch ? 'bg-blue-500/50' : 'bg-orange-500/70';
          const isCurrent = h === now.getHours();
          return (
            <div key={h} className={`flex-grow h-full border-r border-slate-800/20 last:border-0 ${colorClass} transition-colors relative`}>
              {isCurrent && (
                <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_white] z-10" style={{ left: `${(now.getMinutes() / 60) * 100}%` }}></div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[7px] text-slate-600 font-mono px-0.5 uppercase tracking-tighter">
        <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>23</span>
      </div>
    </div>
  );
};

const MarketRow = ({ m, now }) => {
  return (
    <tr className="hover:bg-slate-800/20 transition-all group border-b border-slate-800/30 last:border-0">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${m.isOpen ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-800/50 text-slate-600'} transition-colors`}>
            {m.isOpen ? <Sun size={18} /> : m.isLunch ? <Coffee size={18} /> : <Moon size={18} />}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{m.name.split(' - ')[1]}</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{m.shortName}</span>
              <span className="flex items-center gap-1"><MapPin size={8} /> {m.timezone.split('/')[1].replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border w-20 ${m.isOpen ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : m.isLunch ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
            {m.statusText}
          </div>
          <span className={`text-[9px] font-mono text-center ${m.isOpen ? 'text-orange-500/70' : m.isLunch ? 'text-blue-500/70' : 'text-slate-600'}`}>{m.countdownText}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col">
          <span className="text-sm font-mono font-bold text-slate-300">{m.localTime}</span>
          <span className="text-[9px] text-slate-600 font-mono uppercase">Local</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Clock size={10} className="text-slate-600" />
            <span>{m.openTime} - {m.closeTime}</span>
          </div>
          {m.lunchStart && <div className="text-[8px] text-blue-500/60 font-mono mt-0.5">Lunch: {m.lunchStart} - {m.lunchEnd}</div>}
        </div>
      </td>
      <td className="px-6 py-4 min-w-[200px]"><MarketTimeline status={m} now={now} /></td>
    </tr>
  );
};

const MarketMonitor = () => {
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const marketData = useMemo(() => {
    return MARKETS.map(m => {
      const status = getMarketStatus(m, now);
      const localTime = now.toLocaleTimeString('en-GB', { timeZone: m.timezone, hour: '2-digit', minute: '2-digit' });
      return { ...m, ...status, localTime };
    });
  }, [now]);
  const filteredMarkets = useMemo(() => {
    const filtered = marketData.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.shortName.toLowerCase().includes(searchTerm.toLowerCase()) || m.region.toLowerCase().includes(searchTerm.toLowerCase()));
    const regions = [...new Set(MARKETS.map(m => m.region))];
    return regions.map(region => {
      const regionMarkets = filtered.filter(m => m.region === region);
      const sorted = [...regionMarkets].sort((a, b) => (a.isOpen && !b.isOpen) ? -1 : (!a.isOpen && b.isOpen) ? 1 : 0);
      return { region, markets: sorted };
    }).filter(g => g.markets.length > 0);
  }, [marketData, searchTerm]);
  const activeCount = marketData.filter(m => m.isOpen).length;
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <header className="border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-2xl shadow-orange-500/20 group cursor-pointer transition-transform hover:scale-110">
              <Globe size={28} className="text-white group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">GLOBAL MARKET MONITOR</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-1">market.hdweb.my.id</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 bg-slate-950/50 px-6 py-2 rounded-2xl border border-slate-800/50 shadow-inner">
             <div className="text-3xl font-black text-white font-mono tracking-tighter leading-none flex items-baseline gap-1">
               {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
               <span className="text-sm text-orange-500 animate-pulse">:</span>
               <span className="text-xl text-slate-400">{now.toLocaleTimeString('en-GB', { second: '2-digit' })}</span>
             </div>
             <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase tracking-widest"><Clock size={10} /> WIB (UTC+7) Banyumas</div>
          </div>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-grow relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="text" placeholder="Filter by Market, Region, or Symbol..." className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all shadow-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X size={16} /></button>}
          </div>
          <div className="grid grid-cols-3 gap-4 lg:w-96">
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-tighter mb-1">Open</span>
              <span className="text-2xl font-black text-orange-500">{activeCount}</span>
            </div>
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-tighter mb-1">Lunch</span>
              <span className="text-2xl font-black text-blue-500">{marketData.filter(m => m.isLunch).length}</span>
            </div>
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-tighter mb-1">Closed</span>
              <span className="text-2xl font-black text-slate-600">{MARKETS.length - activeCount - marketData.filter(m => m.isLunch).length}</span>
            </div>
          </div>
        </div>
        <div className="space-y-10">
          {filteredMarkets.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
              <Search size={48} className="text-slate-800" />
              <div className="space-y-1"><p className="text-slate-400 font-bold">No markets found</p><p className="text-sm text-slate-600">Try searching for a different name or region.</p></div>
            </div>
          ) : filteredMarkets.map(({ region, markets }) => (
            <div key={region} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2"><ChevronRight size={14} className="text-orange-500" />{region}</h2>
                <div className="h-px flex-grow bg-slate-800/50"></div>
              </div>
              <div className="bg-slate-900/30 rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800">
                        <th className="px-6 py-4 text-[9px] font-mono uppercase text-slate-500 tracking-[0.2em]">Market / Exchange</th>
                        <th className="px-4 py-4 text-[9px] font-mono uppercase text-slate-500 tracking-[0.2em] text-center">Status</th>
                        <th className="px-4 py-4 text-[9px] font-mono uppercase text-slate-500 tracking-[0.2em] text-center">Current Time</th>
                        <th className="px-4 py-4 text-[9px] font-mono uppercase text-slate-500 tracking-[0.2em] text-center">Operating Hours</th>
                        <th className="px-6 py-4 text-[9px] font-mono uppercase text-slate-500 tracking-[0.2em]">24h Timeline (WIB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">{markets.map((m) => (<MarketRow key={m.id} m={m} now={now} />))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12 mt-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Globe size={16} className="text-orange-500" /><span className="font-black text-white tracking-widest text-sm uppercase">HDWeb Monitor</span></div>
              <p className="text-slate-500 text-xs max-w-sm leading-relaxed">Visualisasi waktu nyata sesi perdagangan bursa saham global dalam format 24 jam. Data dikonversi ke Waktu Indonesia Barat (WIB) untuk memudahkan trader lokal.</p>
              <p className="text-slate-600 text-[10px] font-mono uppercase tracking-tighter">© {new Date().getFullYear()} HDWeb. Crafted in Banyumas, Indonesia.</p>
            </div>
            <div className="flex flex-wrap gap-8 md:justify-end">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resources</h4>
                <div className="flex flex-col gap-2">
                  <a href="#" className="text-slate-500 hover:text-orange-500 text-xs flex items-center gap-2 transition-colors"><Info size={12} /> Data Source Info</a>
                  <a href="#" className="text-slate-500 hover:text-orange-500 text-xs flex items-center gap-2 transition-colors"><ExternalLink size={12} /> Developer API</a>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>API: OPERATIONAL</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>SYNC: REALTIME</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
const root = createRoot(document.getElementById('root'));
root.render(<MarketMonitor />);
