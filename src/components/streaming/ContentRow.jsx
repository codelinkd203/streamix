import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import { motion } from 'framer-motion';

export default function ContentRow({ title, icon: Icon, items, type, onAddToList, myList = [], isContinueWatching = false, isTop10 = false, onRemoveFromContinue }) {
  const rowRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.8;
      const newScrollLeft = rowRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      rowRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/row py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between px-4 md:px-8 mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-zinc-400" />}
          <h2 className="text-white text-lg font-medium tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeftArrow}
            className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showRightArrow}
            className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="relative">
        {/* Content Row */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <ContentCard
              key={item.id}
              item={item}
              type={type}
              index={index}
              onAddToList={onAddToList}
              isInList={myList.some(i => i.id === item.id)}
              isContinueWatching={isContinueWatching}
              isTop10={isTop10}
              onRemoveFromContinue={onRemoveFromContinue}
            />
          ))}
        </div>
      </div>
    </div>
  );
}