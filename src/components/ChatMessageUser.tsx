import React, { useState } from 'react';
import { Message, containsHebrew } from '../types';
import { Maximize2, X } from 'lucide-react';

interface ChatMessageUserProps {
  message: Message;
}

// פורמט של תמונה ב-JSON
interface ImageData {
  type: 'image';
  data: string;      // נתוני base64 (ללא הקידומת data:image/...)
  format?: string;   // פורמט התמונה (png, jpeg, וכו'), ברירת מחדל: png
  alt?: string;      // טקסט חלופי לתמונה, אופציונלי
}

export function ChatMessageUser({ message }: ChatMessageUserProps) {
  const [showFullImage, setShowFullImage] = useState(false);
  const isHebrew = containsHebrew(message.content);
  
  // בדיקה האם התוכן הוא תמונה בפורמט JSON
  const isImageContent = (): boolean => {
    try {
      const data = JSON.parse(message.content);
      return data && data.type === 'image' && !!data.data;
    } catch (e) {
      return false;
    }
  };
  
  // חילוץ נתוני התמונה מה-JSON
  const getImageData = (): ImageData | null => {
    if (!isImageContent()) return null;
    
    try {
      return JSON.parse(message.content) as ImageData;
    } catch (e) {
      console.error('Error parsing image data:', e);
      return null;
    }
  };
  
  // יצירת URL לתמונה מנתוני ה-base64
  const getImageUrl = (): string => {
    const imageData = getImageData();
    if (!imageData) return '';
    
    // אם נתוני התמונה כבר מכילים data:image, החזר כמות שהם
    if (imageData.data.startsWith('data:image/')) {
      return imageData.data;
    }
    
    // אחרת, הוסף את הקידומת המתאימה
    const format = imageData.format || 'png';
    return `data:image/${format};base64,${imageData.data}`;
  };
  
  const imageData = getImageData();
  const imageUrl = getImageUrl();
  const isImage = !!imageData;

  const renderUserContent = () => {
    if (isImage && imageUrl) {
      return (
        <div className="image-container relative">
          <img 
            src={imageUrl} 
            alt={imageData?.alt || 'User uploaded image'} 
            className="max-w-full max-h-[300px] object-contain cursor-pointer rounded-md" 
            onClick={() => setShowFullImage(true)}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
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
          className="bg-gray-100 rounded-2xl p-4 inline-block text-lg user-message"
          dir={isHebrew && !isImage ? 'rtl' : 'ltr'}
          style={{ 
            textAlign: isHebrew && !isImage ? 'right' : 'left',
            whiteSpace: isImage ? 'normal' : 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: 'fit-content',
            backgroundColor: '#f3f4f6', // Explicit background color as fallback
            maxWidth: isImage ? '350px' : undefined,
          }}
        >
          {renderUserContent()}
        </div>
      </div>

      {/* תצוגת תמונה בגודל מלא */}
      {showFullImage && isImage && imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowFullImage(false)}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageUrl} 
              alt={imageData?.alt || 'Full size preview'} 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full text-gray-800 hover:bg-opacity-100"
              onClick={() => setShowFullImage(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}