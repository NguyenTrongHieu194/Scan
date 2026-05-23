import { useState, useEffect } from "react";
import { 
  ScanLine, FileText, Printer, Settings, Sparkles, AlertCircle, PlayCircle, Clipboard
} from "lucide-react";
import { ScannedPage, DocumentMeta } from "./types";
import PageManager from "./components/PageManager";
import Workspace from "./components/Workspace";
import PrintPreview from "./components/PrintPreview";
import GlobalSettings from "./components/GlobalSettings";

// Helper function to read file into base64
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function App() {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'settings'>('editor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [docMeta, setDocMeta] = useState<DocumentMeta>({
    title: "Tài liệu Số hóa OCR",
    author: "Người soạn thảo AI",
    createdAt: new Date().toISOString(),
    showCoverPage: false,
  });

  // Automatically select the first page if active page gets deleted
  useEffect(() => {
    if (pages.length > 0 && (!activePageId || !pages.some(p => p.id === activePageId))) {
      const sorted = [...pages].sort((a, b) => a.order - b.order);
      setActivePageId(sorted[0].id);
    } else if (pages.length === 0) {
      setActivePageId(null);
    }
  }, [pages, activePageId]);

  // Handle image selections/drops for multi-OCR
  const handleAddImages = async (files: FileList) => {
    setIsProcessing(true);
    setGlobalError(null);

    // Initial pass: append loader states for all files to give instant UI feedback
    const startOrder = pages.length > 0 ? Math.max(...pages.map(p => p.order)) + 1 : 0;
    const newPagesToAdd: ScannedPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pageId = Math.random().toString(36).substring(2, 9);
      const localUrl = URL.createObjectURL(file);

      newPagesToAdd.push({
        id: pageId,
        imageUri: localUrl,
        title: `Trang Đang Quét ${i + 1}`,
        markdownContent: "",
        language: "",
        confidence: 0,
        status: 'scanning',
        order: startOrder + i,
      });
    }

    // Append mock pages to state instantly
    setPages((prev) => [...prev, ...newPagesToAdd]);

    // Process files sequentially to maintain order and avoid server-side concurrency rate limits
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const activeStatePage = newPagesToAdd[i];

      try {
        const { base64, mimeType } = await fileToBase64(file);

        // API Request to backend
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64,
            mimeType: mimeType,
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Có lỗi bất ngờ khi quét.");
        }

        const data = await response.json();

        // Update the loading page with real OCR output
        setPages((prev) => 
          prev.map((p) => 
            p.id === activeStatePage.id 
              ? {
                  ...p,
                  title: data.title || `Trang số ${p.order + 1}`,
                  markdownContent: data.markdownContent || "",
                  language: data.language || "Tiếng Việt",
                  confidence: data.confidence || 0,
                  status: 'success',
                  base64Data: base64, // Cache base64 for running OCR again if needed
                  mimeType: mimeType,
                }
              : p
          )
        );

        // Pre-select the first successfully scanned page
        if (i === 0 && !activePageId) {
          setActivePageId(activeStatePage.id);
        }

      } catch (err: any) {
        console.error("Single page upload error:", err);
        setPages((prev) => 
          prev.map((p) => 
            p.id === activeStatePage.id 
              ? {
                  ...p,
                  title: file.name,
                  status: 'failed',
                  errorMessage: err.message || "Không thể thực hiện OCR",
                }
              : p
          )
        );
        // Show banner warning
        setGlobalError(err.message || "Có một số trang quét thất bại. Vui lòng kiểm tra lại thiết lập bảo mật API Key.");
      }
    }

    setIsProcessing(false);
  };

  const handleAddBlankPage = () => {
    const pageId = Math.random().toString(36).substring(2, 9);
    const nextOrder = pages.length > 0 ? Math.max(...pages.map(p => p.order)) + 1 : 0;
    
    const newPage: ScannedPage = {
      id: pageId,
      imageUri: "",
      title: `Trang Mới ${nextOrder + 1}`,
      markdownContent: "# Tiêu đề trang mới\n\nBắt đầu nhập liệu văn bản của bạn ở đây...",
      language: "Tiếng Việt",
      confidence: 100,
      status: 'success',
      order: nextOrder,
    };

    setPages((prev) => [...prev, newPage]);
    setActivePageId(pageId);
    setActiveTab('editor'); // Redirect to editor to let user type
  };

  const handleUpdatePage = (id: string, updates: Partial<ScannedPage>) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      // Clean up object URLs to prevent memory leaks
      const target = prev.find((p) => p.id === id);
      if (target?.imageUri && target.imageUri.startsWith("blob:")) {
        URL.revokeObjectURL(target.imageUri);
      }
      // Compact the ordering index array
      return filtered.map((p, index) => ({ ...p, order: index }));
    });
  };

  const handleMovePage = (id: string, direction: 'up' | 'down') => {
    const list = [...pages].sort((a, b) => a.order - b.order);
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return;

    const swapWithIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapWithIndex < 0 || swapWithIndex >= list.length) return;

    // Swap ordering indices
    const tempOrder = list[index].order;
    list[index].order = list[swapWithIndex].order;
    list[swapWithIndex].order = tempOrder;

    setPages(list);
  };

  const handleUpdateDocMeta = (updates: Partial<DocumentMeta>) => {
    setDocMeta((prev) => ({ ...prev, ...updates }));
  };

  const activePage = pages.find((p) => p.id === activePageId) || null;

  return (
    <div id="app-root" className="flex flex-col h-screen w-screen bg-[#0A0A0B] text-[#E2E8F0] overflow-hidden font-sans">
      
      {/* Top Main Navigation Bar */}
      <header className="flex-none bg-[#121214] border-b border-[#2D2D30] shadow-md z-10 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-650 p-2 rounded-xl text-white shadow-lg shadow-blue-950/50">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 leading-none uppercase">
              SCANFLOW <span className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Gemini Smart</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">Trích xuất văn bản từ nhiều hình ảnh tài liệu, số hóa tự động và chỉnh sửa xuất PDF chuyên nghiệp</p>
          </div>
        </div>

        {/* Global tab panels selector */}
        <div className="flex items-center gap-1 shrink-0">
          <nav className="flex items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-[#2D2D30]">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all ${
                activeTab === 'editor' 
                  ? "bg-[#2D2D30] text-white shadow-sm border border-[#3E3E42]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" /> Biên tập & Quét hình
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all ${
                activeTab === 'preview' 
                  ? "bg-[#2D2D30] text-white shadow-sm border border-[#3E3E42]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Printer className="w-4 h-4" /> Bản in A4 & Xuất PDF
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all ${
                activeTab === 'settings' 
                  ? "bg-[#2D2D30] text-white shadow-sm border border-[#3E3E42]" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" /> Thiết lập tài liệu
            </button>
          </nav>
        </div>
      </header>

      {/* Global API error warning component */}
      {globalError && (
        <div className="flex-none bg-red-950/40 border-b border-red-900/60 px-6 py-2.5 flex items-center justify-between text-xs text-red-300 font-medium z-10 transition-all">
          <div className="flex items-center gap-2 pr-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
            <span>{globalError}</span>
          </div>
          <button 
            onClick={() => setGlobalError(null)}
            className="text-red-400 hover:text-red-200 font-bold px-1.5 py-0.5 hover:bg-red-900/40 rounded"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Primary Workspace Panels Display */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {activeTab === 'editor' && (
          <div className="flex-1 flex h-full overflow-hidden min-w-0">
            {/* Sidebar with Image upload trigger and queue list */}
            <div className="w-full md:w-80 lg:w-96 shrink-0 h-full">
              <PageManager
                pages={pages}
                activePageId={activePageId}
                onSelectPage={setActivePageId}
                onAddImages={handleAddImages}
                onAddBlankPage={handleAddBlankPage}
                onRemovePage={handleRemovePage}
                onMovePage={handleMovePage}
                isProcessing={isProcessing}
              />
            </div>

            {/* Split view: Original photo display alongside rich Markdown editor */}
            <div className="flex-1 h-full overflow-hidden">
              <Workspace
                page={activePage}
                onUpdatePage={handleUpdatePage}
              />
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <PrintPreview
            pages={pages}
            meta={docMeta}
          />
        )}

        {activeTab === 'settings' && (
          <GlobalSettings
            meta={docMeta}
            onUpdateMeta={handleUpdateDocMeta}
          />
        )}
      </main>
    </div>
  );
}
