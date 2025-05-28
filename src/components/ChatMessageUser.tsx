import React, { useState, useEffect, useMemo } from 'react';
import { Message, containsHebrew } from '../types';
import { Maximize2, X } from 'lucide-react';

interface ChatMessageUserProps {
  message: Message;
}

// פורמט של תמונה ב-JSON
interface ImageData {
  type: 'image';
  data?: string;      // נתוני base64 (ללא הקידומת data:image/...)
  format?: string;   // פורמט התמונה (png, jpeg, וכו'), ברירת מחדל: png
  alt?: string;      // טקסט חלופי לתמונה, אופציונלי
  // New format for URL-based images
  url?: string;      // URL של התמונה
  filename?: string; // שם הקובץ
  created?: string;  // תאריך יצירה
}

export function ChatMessageUser({ message }: ChatMessageUserProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const isHebrew = containsHebrew(message.content);
  
  // Memoize image parsing to prevent flickering
  const imageInfo = useMemo(() => {
    try {
      const data = JSON.parse(message.content);
      
      if (data && data.type === 'image') {
        const imageData = data as ImageData;
        
        // יצירת URL לתמונה - תמיכה בשני פורמטים
        let imageUrl = '';
        
        // פורמט חדש - URL ישיר
        if (imageData.url) {
          imageUrl = imageData.url;
        }
        // פורמט ישן - base64 data
        else if (imageData.data) {
          if (imageData.data.startsWith('data:image/')) {
            imageUrl = imageData.data;
          } else {
            const format = imageData.format || 'png';
            imageUrl = `data:image/${format};base64,${imageData.data}`;
          }
        }
        
        if (imageUrl) {
          return {
            isImage: true,
            imageData,
            imageUrl
          };
        }
      }
    } catch (e) {
      // Not an image or invalid JSON
    }
    
    return {
      isImage: false,
      imageData: null,
      imageUrl: ''
    };
  }, [message.content]);
  
  const { isImage, imageData, imageUrl } = imageInfo;
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullImage) {
        setShowFullImage(false);
      }
    };

    if (showFullImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showFullImage]);
  
  const renderUserContent = () => {
    if (isImage && imageUrl) {
      return (
        <div 
          className="image-container relative group cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowFullImage(true);
          }}
        >
          <img 
            src={imageUrl} 
            alt={imageData?.alt || 'User uploaded image'} 
            className="max-w-full max-h-[300px] object-contain rounded-md" 
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
      );
    }

    // רגיל - הצגת טקסט
    return message.content.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <>
      <div className="max-w-3xl mx-auto flex justify-end">
        <div 
          className={`${isImage ? '' : 'bg-gray-100'} rounded-2xl ${isImage ? '' : 'p-4'} inline-block text-lg user-message`}
          dir={isHebrew && !isImage ? 'rtl' : 'ltr'}
          style={{ 
            textAlign: isHebrew && !isImage ? 'right' : 'left',
            whiteSpace: isImage ? 'normal' : 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: 'fit-content',
            backgroundColor: isImage ? 'transparent' : '#f3f4f6', // No background for images
            maxWidth: isImage ? '350px' : undefined,
          }}
        >
          {renderUserContent()}
        </div>
      </div>

      {/* תצוגת תמונה בגודל מלא */}
      {showFullImage && isImage && imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            setShowFullImage(false);
          }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <img 
              src={imageUrl} 
              alt={imageData?.alt || 'Full size preview'} 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full text-gray-800 hover:bg-opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullImage(false);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}