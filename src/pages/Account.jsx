import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, CreditCard, Bell, Shield, LogOut, Check, Server } from 'lucide-react';

export default function Account() {
  const [activeTab, setActiveTab] = useState('profile');
  const [streamUrl, setStreamUrl] = useState(() => {
    return localStorage.getItem('streaming_api_url') || 'https://movie-scraper-coral.vercel.app';
  });
  const [playerMode, setPlayerMode] = useState(() => {
    return localStorage.getItem('player_mode') || 'hls';
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('streaming_api_url', streamUrl);
    localStorage.setItem('player_mode', playerMode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'advanced', label: 'Advanced Settings', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">Account Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="flex flex-col space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
              <hr className="border-zinc-800 my-4" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8"
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Profile</h2>
                    <p className="text-sm text-zinc-400">Your account information.</p>
                  </div>
                  <div className="p-6 rounded-xl border border-zinc-800 bg-black space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-2xl font-bold text-white border border-zinc-700 shrink-0">S</div>
                      <div>
                        <p className="text-white font-semibold">Streamix User</p>
                        <p className="text-zinc-500 text-sm mt-0.5">Personal account</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-zinc-800 bg-black">
                    <h3 className="text-zinc-200 font-medium text-sm mb-1">Watch History</h3>
                    <p className="text-xs text-zinc-500 mb-4">Your watchlist and continue-watching data is stored locally in your browser.</p>
                    <button
                      onClick={() => { localStorage.removeItem('continueWatching'); localStorage.removeItem('myList'); window.location.reload(); }}
                      className="px-4 py-2 bg-transparent border border-zinc-700 text-zinc-300 text-sm rounded-md hover:bg-zinc-900 transition-colors"
                    >
                      Clear Watch History & My List
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Advanced Settings</h2>
                    <p className="text-sm text-zinc-400">Configure backend providers and developer options.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-xl border border-zinc-800 bg-black shadow-sm">
                      <div className="mb-4">
                        <h3 className="text-zinc-200 font-medium text-sm">Player Mode</h3>
                        <p className="text-xs text-zinc-500 mt-1">Choose how streams are loaded.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {[
                          { value: 'embed', label: 'Iframe Embed', desc: 'Uses your site UI (movie-scraper) directly in an iframe.' },
                          { value: 'hls', label: 'Custom API (HLS)', desc: 'Fetches stream URL from your API and plays natively with full controls.' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setPlayerMode(opt.value)}
                            className={`text-left px-4 py-3 rounded-lg border transition-all ${playerMode === opt.value ? 'border-white bg-zinc-900 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
                          >
                            <div className="text-sm font-medium">{opt.label}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-zinc-800 bg-black shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-zinc-200 font-medium text-sm">Streaming API URL</h3>
                          <p className="text-xs text-zinc-500 mt-1 max-w-md">
                            Base URL of your streaming provider.<br />
                            <span className="font-mono">GET /api?id=&lt;TMDB&gt;</span> for movies &amp; TV shows.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-8 px-3 bg-zinc-900 border border-zinc-800 rounded-md flex items-center text-zinc-500 text-sm font-mono select-none">BASE URL</div>
                        <input 
                          type="text" 
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          placeholder="https://movie-scraper-rho.vercel.app"
                          className="flex-1 max-w-md bg-black border border-zinc-800 rounded-md px-3 py-1.5 text-sm font-mono text-zinc-300 focus:outline-none focus:border-zinc-500 transition-colors shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="p-6 rounded-xl border border-zinc-800 bg-black shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-zinc-200 font-medium text-sm">Hardware Acceleration</h3>
                          <p className="text-xs text-zinc-500 mt-1">Use GPU for video decoding when available to improve performance.</p>
                        </div>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-zinc-900 appearance-none cursor-pointer checked:right-0 checked:border-white checked:bg-black transition-all" defaultChecked />
                          <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-zinc-800 cursor-pointer border border-zinc-700"></label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 flex items-center justify-between border-t border-zinc-800/80 bg-zinc-900/30 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                    <p className="text-xs text-zinc-500 font-mono">Changes apply immediately.</p>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                    >
                      {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save'}
                    </button>
                  </div>
                </div>
              )}


            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}