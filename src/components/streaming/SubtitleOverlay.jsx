import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders active subtitle cues as a custom overlay on top of the video.
 * Moves upward when the controls bar is visible (YouTube-style).
 */
export default function SubtitleOverlay({ videoRef, caption, showControls }) {
  const [cueText, setCueText] = useState('');
  const trackRef = useRef(null);

  // Find & attach the text track whenever caption changes or a new track is added
  useEffect(() => {
    if (!caption?.url) return;
    const video = videoRef.current;
    if (!video) return;

    trackRef.current = null;
    setCueText('');

    const attachTrack = () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t.label === caption.label) {
          t.mode = 'hidden'; // load cues without native rendering
          trackRef.current = t;
          return;
        }
      }
    };

    // Try immediately (track may already exist), then listen for new ones
    attachTrack();
    video.textTracks.addEventListener('addtrack', attachTrack);
    return () => video.textTracks.removeEventListener('addtrack', attachTrack);
  }, [caption?.url, caption?.label]);

  // Poll active cues
  useEffect(() => {
    const interval = setInterval(() => {
      const track = trackRef.current;
      if (!track?.activeCues?.length) {
        setCueText('');
        return;
      }
      const texts = [];
      for (let i = 0; i < track.activeCues.length; i++) {
        texts.push(track.activeCues[i].text);
      }
      const raw = texts.join('\n')
        .replace(/<[^>]+>/g, '')           // strip VTT/HTML inline tags
        .replace(/[\u00B6\u2029\u2028]/g, '') // strip pilcrow & paragraph separators
        .replace(/\u00AD/g, '')            // strip soft hyphens
        .trim();
      setCueText(raw);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (!cueText) return null;

  return (
    <div
      className="absolute inset-x-0 pointer-events-none z-20 flex justify-center transition-all duration-300"
      style={{ bottom: showControls ? '110px' : '24px' }}
    >
      <div
        className="max-w-[80%] text-center flex flex-col items-center gap-0.5"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)' }}
      >
        {cueText.split('\n').map((line, i) => (
          <span key={i} className="text-white text-base font-medium leading-snug bg-black/50 px-2 py-0.5 rounded block">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}