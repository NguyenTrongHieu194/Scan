import React, { useId, useRef } from "react";
import { 
  Plus, Trash2, ArrowUp, ArrowDown, FileText, 
  Image as ImageIcon, Loader2, CheckCircle2, XCircle, FileSpreadsheet
} from "lucide-react";
import { ScannedPage } from "../types";

interface PageManagerProps {
  pages: ScannedPage[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
  onAddImages: (files: FileList) => void;
  onAddBlankPage: () => void;
  onRemovePage: (id: string) => void;
  onMovePage: (id: string, direction: 'up' | 'down') => void;
  isProcessing: boolean;
}

export default function PageManager({
  pages,
  activePageId,
  onSelectPage,
  onAddImages,
  onAddBlankPage,
  onRemovePage,
  onMovePage,
  isProcessing,
}: PageManagerProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddImages(e.dataTransfer.files);
    }
  };

  return (
    <div id="page-manager" className="flex flex-col h-full bg-[#0F0F11] border-r border-[#2D2D30] text-[#E2E8F0]">
      {/* Upload Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="p-4 border-b border-[#2D2D30]"
      >
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center border-2 border-dashed border-[#2D2D30] hover:border-blue-500/80 rounded-xl p-6 bg-[#121214] hover:bg-[#18181B] transition-all cursor-pointer text-center group"
        >
          <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors mb-2" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Tải ảnh tài liệu lên</span>
          <span className="text-xs text-gray-500 mt-1">Hỗ trợ JPG, PNG, WEBP (Quét nhiều ảnh)</span>
          <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/40 border border-blue-900/40 px-2 py-0.5 rounded-full mt-3">Hoặc Kéo & Thả ảnh</span>
          <input 
            type="file" 
            id={fileInputId}
            ref={fileInputRef}
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <button
          onClick={onAddBlankPage}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 border border-[#2D2D30] hover:border-[#3E3E42] text-gray-300 hover:text-white bg-[#1E1E20] hover:bg-[#2D2D30] rounded-lg text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          Thêm trang trống thủ công
        </button>
      </div>

      {/* Pages Queue */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center justify-between">
          <span>Danh sách trang ({pages.length})</span>
          {isProcessing && (
            <span className="text-[10px] text-blue-400 font-normal normal-case flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện...
            </span>
          )}
        </h3>

        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center">
            <FileText className="w-12 h-12 stroke-[1.2] mb-3 text-gray-600" />
            <p className="text-sm text-gray-400">Chưa có trang nào</p>
            <p className="text-xs mt-1 text-gray-500 max-w-[180px]">Hãy tải ảnh hoặc thêm trang trống hoàn thành tài liệu!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pages
              .sort((a, b) => a.order - b.order)
              .map((page, index) => {
                const isActive = page.id === activePageId;
                const isPageScanning = page.status === 'scanning';
                const isPageFailed = page.status === 'failed';
                
                return (
                  <div
                    key={page.id}
                    onClick={() => page.status !== 'scanning' && onSelectPage(page.id)}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#1E1E20] text-white border-blue-500/50 shadow-md shadow-black/30"
                        : "bg-[#18181B] hover:bg-[#1E1E20] text-[#E2E8F0] border-[#2D2D30]"
                    }`}
                  >
                    {/* Thumbnail or Badge */}
                    <div className="relative flex-none w-12 h-14 bg-[#0A0A0B] border border-[#2D2D30] rounded-lg overflow-hidden flex items-center justify-center">
                      {page.imageUri ? (
                        <img 
                          src={page.imageUri} 
                          alt={`Trang ${index + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileText className={`w-5 h-5 ${isActive ? "text-blue-400" : "text-gray-500"}`} />
                      )}
                      
                      {/* Page number badge */}
                      <span className={`absolute bottom-0 right-0 px-1.5 py-0.5 text-[9px] font-bold rounded-tl-md ${
                        isActive ? "bg-blue-600 text-white" : "bg-[#2D2D30] text-gray-450 border-t border-l border-[#3E3E42]"
                      }`}>
                        {index + 1}
                      </span>

                      {/* Overlays / Status */}
                      {isPageScanning && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0 pr-6">
                      <h4 className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-gray-200"}`}>
                        {page.title || `Trang ${index + 1}`}
                      </h4>
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        {isPageScanning ? (
                          <span className={`text-[10px] ${isActive ? "text-blue-300" : "text-blue-400"} font-medium`}>
                            Đang xử lý OCR...
                          </span>
                        ) : isPageFailed ? (
                          <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" /> Lỗi quét
                          </span>
                        ) : (
                          <span className={`text-[10px] flex items-center gap-1 ${
                            isActive ? "text-gray-300" : "text-gray-400"
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 
                            Cậy tin: <strong className={isActive ? "text-emerald-400" : "text-emerald-500"}>{page.confidence}%</strong>
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-[10px] truncate mt-1 ${isActive ? "text-gray-400" : "text-gray-500"}`}>
                        {page.markdownContent ? `${page.markdownContent.slice(0, 50)}...` : 'Không có nội dung'}
                      </p>
                    </div>

                    {/* Manage controls overlay */}
                    {page.status !== 'scanning' && (
                      <div className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 rounded bg-[#121214] border border-[#2D2D30] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePage(page.id, 'up');
                          }}
                          disabled={index === 0}
                          title="Di chuyển lên"
                          className="p-1 rounded hover:bg-[#2D2D30] disabled:opacity-30 text-gray-400 hover:text-white"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePage(page.id, 'down');
                          }}
                          disabled={index === pages.length - 1}
                          title="Di chuyển xuống"
                          className="p-1 rounded hover:bg-[#2D2D30] disabled:opacity-30 text-gray-400 hover:text-white"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePage(page.id);
                          }}
                          title="Xóa trang"
                          className="p-1 rounded hover:bg-red-950/40 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
