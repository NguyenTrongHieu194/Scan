import { useRef } from "react";
import { Printer, FileText, CheckCircle2 } from "lucide-react";
import { ScannedPage, DocumentMeta } from "../types";
import { markdownToHtml } from "../utils/markdownToHtml";
import { exportToWord } from "../utils/wordExporter";

interface PrintPreviewProps {
  pages: ScannedPage[];
  meta: DocumentMeta;
}

export default function PrintPreview({ pages, meta }: PrintPreviewProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const activePages = [...pages].sort((a, b) => a.order - b.order);

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    // Compile content to HTML for word export
    let htmlContent = "";

    if (meta.showCoverPage) {
      htmlContent += `
        <div style="text-align: center; margin-top: 150px; margin-bottom: 200px;">
          <h1 style="font-size: 32pt; margin-bottom: 10px; color: #1e293b;">${meta.title || "TÀI LIỆU CHƯA ĐẶT TÊN"}</h1>
          <p style="font-size: 14pt; color: #64748b; margin-top: 50px;">Tác giả: ${meta.author || "Người soạn thảo"}</p>
          <p style="font-size: 12pt; color: #94a3b8; margin-top: 10px;">Ngày tạo: ${new Date(meta.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        <hr style="page-break-after: always; visibility: hidden; clear: both;" />
      `;
    }

    activePages.forEach((page, index) => {
      htmlContent += `
        <div style="margin-bottom: 40px; page-break-after: ${index === activePages.length - 1 ? 'auto' : 'always'};">
          <h2 style="font-size: 18pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; margin-bottom: 24px;">
            ${page.title || `Trang ${index + 1}`}
          </h2>
          <div style="font-size: 11pt; line-height: 1.6; color: #334155;">
            ${markdownToHtml(page.markdownContent)}
          </div>
        </div>
      `;
    });

    exportToWord(meta.title || "tai-lieu-ocr", htmlContent);
  };

  return (
    <div id="print-preview-workspace" className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden select-text">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#121214] border-b border-[#2D2D30] shrink-0 select-none">
        <div>
          <h2 className="text-sm font-semibold text-white">Chế độ hiển thị & Bản in văn bản</h2>
          <p className="text-xs text-gray-400">Mô phỏng kích thước khổ A4 chuẩn, sẵn sàng xuất bản hoặc in ấn.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportWord}
            disabled={pages.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#2C2D30] hover:border-[#3E3E42] bg-[#1E1E20] hover:bg-[#2D2D30] font-semibold text-xs text-amber-500 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-40"
          >
            <FileText className="w-4 h-4 text-amber-550" /> Xuất file Word (.doc)
          </button>

          <button
            onClick={handlePrint}
            disabled={pages.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-650 hover:bg-blue-750 font-bold text-xs text-white rounded-lg transition-all shadow-lg shadow-blue-950/40 border border-blue-500/30 transform hover:scale-[1.01] cursor-pointer disabled:opacity-40"
          >
            <Printer className="w-4 h-4" /> In / Lưu tệp PDF
          </button>
        </div>
      </div>

      {/* Pages Container Scroll */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 bg-[#0A0A0B]">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#121214] rounded-xl shadow-2xl border border-[#2D2D30] max-w-md w-full text-center my-auto">
            <Printer className="w-12 h-12 text-gray-600 mb-3" />
            <h3 className="text-sm font-semibold text-white">Tài liệu không có nội dung</h3>
            <p className="text-xs text-gray-400 mt-1">Vui lòng quay lại tab Biên tập, tải hình ảnh và thực hiện quy trình quét OCR văn bản.</p>
          </div>
        ) : (
          <div 
            id="print-area" 
            ref={printAreaRef}
            className="flex flex-col items-center gap-8 w-full"
          >
            {/* Cover Page */}
            {meta.showCoverPage && (
              <div className="bg-white text-slate-800 px-[20mm] py-[25mm] shrink-0 shadow-[0_0_24px_rgba(0,0,0,0.6)] border border-[#2D2D30]/80 flex flex-col justify-between items-center text-center w-[210mm] min-h-[296mm] page-break-after-always">
                <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-4">
                  BÁO CÁO SỐ HÓA VĂN BẢN OCR
                </div>
                
                <div className="my-auto max-w-xl">
                  <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                    {meta.title || "TÀI LIỆU CHƯA ĐẶT TÊN"}
                  </h1>
                  <div className="w-24 h-1 bg-blue-600 mx-auto mt-6 rounded-full"></div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-500">Người soạn thảo</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{meta.author || "Phòng Công nghệ thông tin"}</p>
                  
                  <p className="text-xs text-slate-440 mt-4">
                    Ngày khởi tạo: {new Date(meta.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Được kiểm duyệt OCR bằng Gemini
                  </div>
                </div>
              </div>
            )}

            {/* Scanned Pages */}
            {activePages.map((page, index) => (
              <div 
                key={page.id}
                className="bg-white text-slate-850 px-[20mm] py-[25mm] shrink-0 shadow-[0_0_24px_rgba(0,0,0,0.6)] border border-[#2D2D30]/80 flex flex-col justify-between w-[210mm] min-h-[296mm] page-break-after-always"
              >
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs text-slate-400 mb-6 shrink-0 font-medium">
                  <span className="truncate max-w-[250px]">{meta.title || 'OCR Document'}</span>
                  <span>Trang {meta.showCoverPage ? index + 2 : index + 1}</span>
                </div>

                {/* Main page content body */}
                <div className="flex-1 text-slate-700 min-w-0 prose prose-slate">
                  <h2 className="text-xl font-bold border-b pb-2 mb-5 text-slate-900 tracking-tight">
                    {page.title || `Trang ${index + 1}`}
                  </h2>
                  <div 
                    className="markdown-formatted-content leading-relaxed text-sm antialiased"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(page.markdownContent) }}
                  />
                </div>

                {/* Footer info */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] text-slate-400 shrink-0 font-mono">
                  <span>Trích xuất gốc tự động</span>
                  <span>Độ chính xác: {page.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
