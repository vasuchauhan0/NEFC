import React, { useState } from 'react';
import { Volume2, X } from 'lucide-react';

interface AnnouncementBarProps {
  text: string;
}

export default function AnnouncementBar({ text }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(true);

  if (!text || !visible) return null;

  return (
    <div className="bg-blue-700 text-white py-2 px-4 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm border-b border-blue-800 animate-slide-in">
      <div className="flex-1 flex items-center justify-center gap-2">
        <Volume2 size={16} className="text-yellow-300 animate-pulse flex-shrink-0" />
        <span className="tracking-wide text-center">{text}</span>
      </div>
      <button 
        onClick={() => setVisible(false)} 
        className="text-blue-100 hover:text-white transition-colors duration-150 p-0.5 rounded hover:bg-blue-600 cursor-pointer"
        aria-label="Close Announcement"
      >
        <X size={16} />
      </button>
    </div>
  );
}
