import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, ChevronDown, Menu, X, Sparkles, Home, Tv, Film, Flame, Trophy, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchModal from './SearchModal';
import AIDiscoverModal from './AIDiscoverModal';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', page: 'Home', icon: Home },
    { name: 'TV Shows', page: 'TVShows', icon: Tv },
    { name: 'Movies', page: 'Movies', icon: Film },
    { name: 'Anime', page: 'Anime', icon: Clapperboard },
    { name: 'Sports', page: 'Sports', icon: Trophy },
    { name: 'New & Popular', page: 'NewPopular', icon: Flame },
  ];

  const isActive = (page) => {
    const currentPath = location.pathname;
    const pagePath = createPageUrl(page);
    return currentPath === pagePath;
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled ? 'bg-black/70 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-transparent border-b border-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 max-w-[1600px] mx-auto">
          {/* Left Section */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex-shrink-0 flex items-center gap-2">
              <img src="/favicon.ico" alt="logo" className="w-6 h-6 object-contain" />
              <h1 className="text-xl font-bold text-white tracking-tighter" style={{ letterSpacing: '-0.05em' }}>
                Streamix
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  className={`flex items-center gap-2 text-sm transition-colors group ${
                    isActive(link.page) ? 'text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {link.icon && <link.icon className={`w-4 h-4 ${isActive(link.page) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />}
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden text-white"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSearch(true)}
              className="text-white hover:text-zinc-300 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowAI(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-zinc-400 hover:text-white rounded-md text-sm font-medium transition-all border border-zinc-800 hover:border-zinc-600 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden md:block font-mono text-xs uppercase tracking-wider">Discover</span>
            </button>

            {/* Profile */}
            <div className="relative" onMouseLeave={() => setShowProfileMenu(false)}>
              <div
                onMouseEnter={() => setShowProfileMenu(true)}
                className="flex items-center gap-2 group cursor-pointer py-2"
              >
                <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-orange-500 border border-zinc-800 group-hover:border-zinc-500 transition-colors" />
                <ChevronDown className={`w-4 h-4 text-white transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-0 w-56 bg-black/90 backdrop-blur-xl rounded-md shadow-2xl py-2 border border-zinc-800/50"
                  >
                    <Link
                      to={createPageUrl('Account')}
                      className="block px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      Account Settings
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#141414] border-t border-zinc-800"
            >
              <div className="px-4 py-4 space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.page}
                    to={createPageUrl(link.page)}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 text-base font-medium ${
                      isActive(link.page) ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.name}
                  </Link>
                ))}
                <hr className="border-zinc-800 my-2" />
                <Link
                  to={createPageUrl('Account')}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 text-base font-medium text-zinc-400"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-500" />
                  Account Settings
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />}
        {showAI && <AIDiscoverModal isOpen={showAI} onClose={() => setShowAI(false)} />}
      </AnimatePresence>
    </>
  );
}