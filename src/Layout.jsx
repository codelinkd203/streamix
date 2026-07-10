import React from 'react';
import Navbar from '@/components/streaming/Navbar';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  const hideNavbar = currentPageName === 'Watch';
  
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-zinc-800 selection:text-white relative" style={{ fontFamily: "'Geist', sans-serif" }}>
      {/* Vercel-style grid background */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
      }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Geist', sans-serif;
        }
        
        .font-mono {
          font-family: 'Geist Mono', monospace !important;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {!hideNavbar && <Navbar />}
      
      <main className={`relative z-10 ${hideNavbar ? '' : ''}`}>
        {children}
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}