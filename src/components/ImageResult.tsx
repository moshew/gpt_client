import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface ImageResultProps {
  url: string;
  filename: string;
  timestamp: string;
  isVariation: boolean;
  maxHeight?: number;
}

export function ImageResult({ url, filename, timestamp, isVariation = false, maxHeight }: ImageResultProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = () => {
    // Create an anchor element and trigger download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  // Format the date - handle various timestamp formats
  const formatDate = (dateString: string) => {
    try {
      // Check if the date is already in a readable format (like "22-April-2025, 16:37")
      if (dateString.includes('-') && dateString.includes(',')) {
        return dateString;
      }
      
      // Otherwise, try to parse it as a Date
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString; // If parsing fails, return the original string
    }
  };
  
  // Create image style with max height if specified
  const imageStyle = maxHeight ? { maxHeight: `${maxHeight}px`, objectFit: 'contain' as const } : {};
  
  // Format the timestamp
  const formattedDate = formatDate(timestamp);
  
  return (
    <div className="max-w-2xl mx-auto mt-4 mb-6">
      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        {/* Image loading skeleton */}
        {!isLoaded && !error && (
          <div className="w-full aspect-square bg-gray-200 animate-pulse flex items-center justify-center" style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}>
            <span className="text-gray-400">Loading image...</span>
          </div>
        )}
        
        {/* Image */}
        <img 
          src={url} 
          className={`w-full ${isLoaded ? 'block' : 'hidden'}`}
          style={imageStyle}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          alt="Generated image"
        />
        
        {/* Error state */}
        {error && (
          <div className="w-full aspect-square bg-gray-100 flex items-center justify-center" style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}>
            <span className="text-red-500">Failed to load image</span>
          </div>
        )}
        
        {/* Image details */}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {isVariation ? 'Variation created' : 'Image created'} on {formattedDate}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add a default export as well in case the module is being imported that way
export default ImageResult;