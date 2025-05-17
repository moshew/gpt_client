import React from 'react';

export function LoadingDots() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
}