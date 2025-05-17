import React from 'react';
import { Message, containsHebrew } from '../types';

interface ChatMessageUserProps {
  message: Message;
}

export function ChatMessageUser({ message }: ChatMessageUserProps) {
  const isHebrew = containsHebrew(message.content);

  const renderUserContent = () => {
    return message.content.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="max-w-3xl mx-auto flex justify-end">
      <div 
        className="bg-gray-100 rounded-2xl p-4 inline-block text-lg user-message"
        dir={isHebrew ? 'rtl' : 'ltr'}
        style={{ 
          textAlign: isHebrew ? 'right' : 'left',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: 'fit-content',
          backgroundColor: '#f3f4f6', // Explicit background color as fallback
        }}
      >
        {renderUserContent()}
      </div>
    </div>
  );
}