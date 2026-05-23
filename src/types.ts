export interface ScannedPage {
  id: string;
  imageUri: string; // Blob URL for local preview
  base64Data?: string; // Raw base64 data for re-OCR or other processes
  mimeType?: string;
  title: string;
  markdownContent: string;
  language: string;
  confidence: number;
  status: 'idle' | 'scanning' | 'success' | 'failed';
  errorMessage?: string;
  order: number;
}

export interface DocumentMeta {
  title: string;
  createdAt: string;
  author: string;
  showCoverPage: boolean;
}
