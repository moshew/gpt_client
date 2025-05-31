export interface ImageResult {
  url: string;
  prompt: string;
  filename: string;
  timestamp: string;
  isVariation: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'complete' | 'streaming';
  imageResult?: ImageResult;
}

export interface ChatFile {
  id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  docFiles?: ChatFile[];
  codeFiles?: ChatFile[];
  createdAt: Date;
  isPlaceholder?: boolean;
  keepOriginalFiles?: boolean;
}

export interface ServerChat {
  id: string;
  name: string;
  created_at?: string;
}

export interface ServerMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image_result?: {
    url: string;
    prompt: string;
    filename: string;
    timestamp: string;
    is_variation: boolean;
  };
}

export interface ChatDataResponse {
  chat_id?: string;
  chat_name?: string;
  messages: ServerMessage[];
  docs?: {
    keep_original_files?: boolean;
    files?: ChatFile[];
  };
  code?: ChatFile[];
  doc_count?: number;
  code_count?: number;
  message_count?: number;
  file_count?: number;
}

export interface User {
  id?: string;
  username: string;
  email?: string;
  display_name?: string;
  token: string;
}

export const containsHebrew = (text: string) => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text);
};