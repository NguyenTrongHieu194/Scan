import { useState, useRef, useEffect } from "react";
import { 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Table, 
  Sparkles, RotateCcw, Image as ImageIcon, FileText, Check, Loader2,
  Minimize2, Maximize2, RefreshCw
} from "lucide-react";
import { ScannedPage } from "../types";
import { markdownToHtml } from "../utils/markdownToHtml";

interface WorkspaceProps {
  page: ScannedPage | null;
  onUpdatePage: (id: string, updates: Partial<ScannedPage>) => void;
}

export default function Workspace({ page, onUpdatePage }: WorkspaceProps) {
  const [editorText, setEditorText] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [historyText, setHistoryText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active page changes
  useEffect(() => {
    if (page) {
      setEditorText(page.markdownContent);
      setPageTitle(page.title);
      setHistoryText(null); // Clear undo history for new page
      setCustomPrompt("");
      setAiSuccessMsg("");
      setAiErrorMsg("");
    } else {
      setEditorText("");
      setPageTitle("");
    }
  }, [page?.id]);

  if (!page) {
    return (
      <div id="no-workspace-page" className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0B] text-gray-500 p-8">
        <Sparkles className="w-16 h-16 text-gray-700 stroke-[1.2] mb-4 animate-pulse" />
        <h2 className="text-lg font-semibold text-white">Không có trang đang chọn</h2>
        <p className="text-sm text-center mt-1 text-gray-400 max-w-sm">
          Vui lòng tải ảnh tài liệu lên hoặc thêm 1 trang mới trong danh sách bên trái để bắt đầu chỉnh sửa và hiển thị.
        </p>
      </div>
    );
  }

  const handleTextChange = (text: string) => {
    setEditorText(text);
    onUpdatePage(page.id, { markdownContent: text });
  };

  const handleTitleChange = (title: string) => {
    setPageTitle(title);
    onUpdatePage(page.id, { title });
  };

  // Helper to inject text/markdown tags
  const injectMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selected = currentText.substring(start, end);

    const replacement = prefix + (selected || "văn bản") + suffix;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleTextChange(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "văn bản").length);
    }, 50);
  };

  const toolbarActions = [
    { label: "In đậm", icon: Bold, action: () => injectMarkdown("**", "**") },
    { label: "In nghiêng", icon: Italic, action: () => injectMarkdown("*", "*") },
    { label: "Tiêu đề 1", icon: Heading1, action: () => injectMarkdown("# ", "\n") },
    { label: "Tiêu đề 2", icon: Heading2, action: () => injectMarkdown("## ", "\n") },
    { label: "Danh sách", icon: List, action: () => injectMarkdown("- ", "\n") },
    { label: "Danh sách số", icon: ListOrdered, action: () => injectMarkdown("1. ", "\n") },
    { 
      label: "Bảng", 
      icon: Table, 
      action: () => injectMarkdown(
        "\n| Cột 1 | Cột 2 | Cột 3 |\n| :--- | :--- | :--- |\n| Dòng 1 | Nội dung | Nội dung |\n| Dòng 2 | Nội dung | Nội dung |\n"
      ) 
    },
  ];

  // Call the Refine API on server
  const handleAiRefine = async (instruction: string) => {
    if (!editorText.trim()) return;
    setIsAiLoading(true);
    setAiSuccessMsg("");
    setAiErrorMsg("");

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editorText, instruction }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gửi yêu cầu thất bại");
      }

      const data = await response.json();
      
      // Save current status to local undo history
      setHistoryText(editorText);
      
      // Update with refined content
      handleTextChange(data.result);
      setAiSuccessMsg(`Thành công: ${data.summary}`);
      setCustomPrompt("");
    } catch (e: any) {
      console.error(e);
      setAiErrorMsg(e.message || "Đã xảy ra lỗi khi gửi yêu cầu tới AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndoAi = () => {
    if (historyText !== null) {
      handleTextChange(historyText);
      setHistoryText(null);
      setAiSuccessMsg("Đã hoàn tác thay đổi của trợ lý AI");
    }
  };

  // Re-run OCR manually for this page
  const handleReOcr = async () => {
    if (!page.base64Data || !page.mimeType) {
      setAiErrorMsg("Không có dữ liệu hình ảnh gốc để chạy lại OCR.");
      return;
    }
    setIsAiLoading(true);
    setAiSuccessMsg("");
    setAiErrorMsg("");

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: page.base64Data,
          mimeType: page.mimeType,
          prompt: "Quét lại OCR ảnh này. Trích xuất chính xác và chi tiết, giữ nguyên cấu trúc văn bản.",
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể OCR lại ảnh này");
      }

      const data = await response.json();
      setPageTitle(data.title);
      handleTextChange(data.markdownContent);
      onUpdatePage(page.id, {
        title: data.title,
        language: data.language,
        confidence: data.confidence,
        status: 'success'
      });
      setAiSuccessMsg("Đã quét lại OCR thành công!");
    } catch (e: any) {
      console.error(e);
      setAiErrorMsg(e.message || "Lỗi quét lại OCR.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const quickPrompts = [
    { label: "🧹 Sửa chính tả & câu từ", prompt: "Hãy quét qua văn bản này, tìm và sửa toàn bộ lỗi chính tả tiếng Việt hoặc lỗi ghép âm, đồng thời tối ưu hóa khoảng trắng giữa các chữ một cách tự nhiên." },
    { label: "👔 Chuyển văn phong trang trọng", prompt: "Vui lòng viết lại văn bản này sử dụng từ ngữ trang trọng, học thuật, thích hợp cho tài liệu văn phòng hoặc hành chính." },
    { label: "🇻🇳 Chuẩn hóa văn bản Tiếng Việt", prompt: "Dọn dẹp làm sạch văn bản, chuyển các ký tự OCR lỗi hoặc chữ dính nhau thành đoạn văn tiếng Việt có nghĩa và được ngắt câu chính xác." },
    { label: "🌐 Dịch sang Tiếng Anh", prompt: "Hãy dịch toàn bộ văn bản này sang Tiếng Anh thương mại chuyên nghiệp, giữ nguyên tiêu đề và định dạng Markdown." },
  ];

  return (
    <div id="document-workspace" className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#121214] border-b border-[#2D2D30]">
        <div className="flex-1 min-w-0">
          <input 
            type="text"
            value={pageTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-lg font-bold text-white border-b border-transparent bg-transparent hover:border-[#2D2D30] focus:border-blue-500 focus:outline-none w-full pb-0.5 transition-colors"
            placeholder="Đặt tên tiêu đề chương hoặc trang này..."
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 font-medium">Ngôn ngữ: <strong className="text-gray-200">{page.language || "Chưa phát hiện"}</strong></span>
            <span className="text-xs text-[#2D2D30]">|</span>
            <span className="text-xs text-gray-400 font-medium">Độ tin cậy quét: <strong className="text-emerald-400">{page.confidence}%</strong></span>
            {page.base64Data && (
              <>
                <span className="text-xs text-[#2D2D30]">|</span>
                <button 
                  onClick={handleReOcr}
                  disabled={isAiLoading}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-950/40 border border-blue-900/40 hover:bg-blue-900/40 px-2 py-0.5 rounded transition-all disabled:opacity-50"
                  title="Chạy lại quy trình quét OCR cho trang này"
                >
                  <RefreshCw className="w-3 h-3" /> Chạy lại OCR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab buttons / mode */}
        <div className="flex items-center gap-1.5 shrink-0 bg-[#18181B] p-1 rounded-lg border border-[#2D2D30]">
          <button
            onClick={() => setIsPreviewMode(false)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              !isPreviewMode 
                ? "bg-[#2D2D30] text-white border border-[#3E3E42]" 
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Biên tập
          </button>
          <button
            onClick={() => setIsPreviewMode(true)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
              isPreviewMode 
                ? "bg-[#2D2D30] text-white border border-[#3E3E42]" 
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Xem trước định dạng
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Original Image Viewer */}
        {page.imageUri && (
          <div className={`border-r border-[#2D2D30] transition-all bg-[#0A0A0B] relative ${
            isImageExpanded ? "w-full md:w-3/4 flex-1" : "hidden md:flex md:w-1/3"
          } flex flex-col`}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#121214] text-gray-200 border-b border-[#2D2D30]">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> Ảnh gốc đã tải lên
              </span>
              <button
                onClick={() => setIsImageExpanded(!isImageExpanded)}
                className="p-1 rounded hover:bg-[#2D2D30] text-gray-400 hover:text-white"
                title={isImageExpanded ? "Thu nhỏ ảnh gốc" : "Mở rộng ảnh gốc"}
              >
                {isImageExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img 
                src={page.imageUri} 
                alt="Original Document" 
                className="max-w-full max-h-full rounded-lg shadow-xl border border-[#2D2D30] bg-[#121214]/40 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-3 py-2 bg-[#121214]/50 border-t border-[#2D2D30] text-gray-500 text-[10px] text-center">
              Đặt kề cạnh để bạn đối chứng trực tiếp chất lượng dịch văn bản chữ gốc.
            </div>
          </div>
        )}

        {/* Right Side: Text Editor and Live Preview */}
        <div id="text-workspace-pane" className="flex-1 flex flex-col h-full bg-[#121214] overflow-hidden min-w-0">
          {!isPreviewMode ? (
            page.status === 'failed' ? (
              /* Error / Quota Exhaustion Support view */
              <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center items-center text-center max-w-xl mx-auto space-y-6">
                <div className="bg-red-950/20 border border-red-900/50 p-5 rounded-full">
                  <RefreshCw className="w-10 h-10 text-red-550 animate-spin text-red-400" style={{ animationDuration: '6s' }} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Lỗi Quét hoặc Hạn mức Gemini Tạm Thời Hết</h3>
                  <p className="text-xs text-red-400 font-medium bg-red-950/30 px-3 py-2 border border-red-900/40 rounded-lg max-w-md mx-auto inline-block leading-relaxed">
                    {page.errorMessage || "Có lỗi bất ngờ khi quét."}
                  </p>
                </div>
                
                <div className="bg-[#18181B] border border-[#2D2D30] p-4.5 rounded-xl text-left w-full space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#a855f7]">💡 Các phương án thay thế:</h4>
                  <ul className="text-xs text-gray-400 list-disc list-inside space-y-2 leading-relaxed">
                    <li><strong className="text-gray-200">🚀 Giả lập Văn Bản Mẫu:</strong> Sẽ tự động tải văn bản mẫu tiếng Việt chuyên nghiệp đầy đủ thông tin (Hợp đồng, Hóa đơn) để bạn có thể xem thử đầy đủ tính năng in bản A4 PDF và xuất File Word.</li>
                    <li><strong className="text-gray-200">✍️ Tự biên soạn thủ công:</strong> Thiết lập trang về chế độ thành công trống để bạn tự gõ phím.</li>
                    <li><strong className="text-gray-200">🔑 Điền Khóa API Riêng:</strong> Vào phần Thiết lập (Settings) để thêm khóa <code className="bg-[#0A0A0B] px-1 py-0.5 border border-[#2D2D30] text-red-400 text-[10px]">GEMINI_API_KEY</code> riêng của bạn.</li>
                  </ul>
                </div>
                
                <div className="flex flex-wrap gap-2.5 justify-center w-full">
                  <button
                    onClick={() => {
                      const mockContracts = [
                        {
                          title: "Hop_Dong_Kinh_Te_Alpha.md",
                          content: `# CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n## Độc Lập - Tự Do - Hạnh Phúc\n***\n**Số: 782/HĐ-KT-2026**\n\n### HỢP ĐỒNG KINH TẾ (BẢN GIẢ LẬP OCR)\n*V/v: Cung cấp cung ứng giải pháp và tích hợp phần mềm Trí Tuệ Nhân Tạo*\n\nHôm nay, ngày 22 tháng 05 năm 2026, tại văn phòng Hà Nội, chúng tôi gồm:\n\n#### BÊN A: CÔNG TY Cổ Phần GIẢI PHÁP SỐ ALPHA\n- **Địa chỉ:** Tầng 18, Tòa nhà Landmark 81, TP. Hồ Chí Minh\n- **Người đại diện:** Ông Nguyễn Chí Alpha - Chức vụ: Tổng Giám Đốc\n- **Mã số thuế:** 0102948154\n\n#### BÊN B: PHÂN VIỆN TRÍ TUỆ NHÂN TẠO BETA GLOBAL\n- **Địa chỉ:** Số 8 Tôn Thất Thuyết, Dịch Vọng Hậu, Cầu Giấy, Hà Nội\n- **Người đại diện:** Bà Trần Thị Beta - Chức vụ: Giám đốc Công nghệ\n\nHai bên thống nhất ký kết hợp đồng dịch vụ công nghệ số hóa chữ viết OCR thông tin với nội dung thảo luận:\n\n| STT | Điều khoản cam kết | Chi tiết thực thi | Ghi chú |\n| :--- | :--- | :--- | :--- |\n| 1 | **Phạm vi** | Triển khai mô hình OCR đa ngôn ngữ chuẩn xác cao | Hạn mốc 30 ngày |\n| 2 | **Độ tin cậy** | Nhận dạng chữ viết tay và bảng biểu Markdown sạch | Đạt tối thiểu 95% |\n| 3 | **Bảo mật** | Mã hóa 100% dữ liệu truyền nhận giữa bên A và B | Chuẩn quân sự |\n| 4 | **Tổng giá trị** | **150.000.000 VNĐ** (Một trăm năm mươi triệu đồng) | Đã bao gồm thuế |\n\nHợp đồng được lập thành 02 bản có giá trị pháp lý tương đương. Bên B tiến hành thực thi ngay sau khi nhận thông báo khởi động.`
                        },
                        {
                          title: "Hoa_Don_Gia_Tri_Gia_Tang.md",
                          content: `# HÓA ĐƠN GIÁ TRỊ GIA TĂNG (GTGT)\n**Mẫu số:** 01GTKT0/001 - **Ký hiệu:** AA/26P\n**Số Hóa Đơn:** 00892A4\n***\n**Ngày lập hóa đơn:** 22/05/2026\n\n* **Đơn vị bán hàng:** Tập đoàn Siêu thị Điện máy & Số hóa Toàn Cầu Tech\n* **Địa chỉ:** 102 Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội\n* **Mã số thuế:** 0102938475\n* **Số tài khoản ngân hàng:** 19032847156012 (Techcombank)\n\n### DANH SÁCH SẢN PHẨM KHÁCH HÀNG ĐĂNG KÍ\n\n| STT | Tên Sản Phẩm / Dịch Vụ Số Hóa | Đơn Vị | Số Lượng | Đơn Giá (VNĐ) | Thành Tiền (VNĐ) |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n| 1 | Máy Quét Tài Liệu Chuyên Dụng Canon Lide 400 | Cái | 1 | 3.500.000 | 3.500.000 |\n| 2 | Đăng ký bản quyền Phần mềm ScanFlow OCR Enterprise | Năm | 2 | 1.250.000 | 2.500.000 |\n| 3 | Trợ lý hiệu chỉnh số hóa chỉnh sửa tự động AI | Năm | 1 | 2.400.000 | 2.400.000 |\n\n**Tổng cộng tiền hàng thực tế:** 8.400.000 VNĐ\n**Thuế suất GTGT (10%):** 840.000 VNĐ\n**Tổng cộng giá trị thanh toán:** **9.240.000 VNĐ**\n\n*Số tiền viết bằng chữ: Chín triệu hai trăm bốn mươi ngàn đồng chẵn./.*`
                        }
                      ];
                      const chosen = mockContracts[Math.floor(Math.random() * mockContracts.length)];
                      handleTitleChange(chosen.title);
                      handleTextChange(chosen.content);
                      onUpdatePage(page.id, {
                        title: chosen.title,
                        markdownContent: chosen.content,
                        status: 'success',
                        confidence: 99,
                        language: "Tiếng Việt"
                      });
                      setAiSuccessMsg("Đã giả lập nạp tải kết cấu văn bản mẫu thành công!");
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    🚀 Giả lập Văn Bản Mẫu
                  </button>

                  <button
                    onClick={() => {
                      handleTitleChange("Trang Mới Biên Soạn");
                      handleTextChange("# Tiêu đề của bạn ở đây\n\nBắt đầu nhập văn bản tiếng Việt tại đây...");
                      onUpdatePage(page.id, {
                        title: "Trang Mới Biên Soạn",
                        markdownContent: "# Tiêu đề của bạn ở đây\n\nBắt đầu nhập văn bản tiếng Việt tại đây...",
                        status: 'success',
                        confidence: 100,
                        language: "Chưa xác định"
                      });
                      setAiSuccessMsg("Đã chuyển đổi sang chế độ biên tập thủ công!");
                    }}
                    className="px-4 py-2 bg-[#1E1E20] hover:bg-[#2D2D30] border border-[#2D2D30] text-xs font-bold text-gray-300 hover:text-white rounded-lg transition-all cursor-pointer"
                  >
                    ✍️ Viết thủ công
                  </button>

                  <button
                    onClick={handleReOcr}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white border border-blue-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    🔄 Thử Quét Lại
                  </button>
                </div>
              </div>
            ) : (
              /* Editing Block */
              <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 bg-[#121214] border-b border-[#2D2D30] overflow-x-auto shrink-0 scrollbar-none">
                  {toolbarActions.map((item, id) => (
                    <button
                      key={id}
                      onClick={item.action}
                      className="p-1.5 text-gray-400 hover:text-[#3b82f6] hover:bg-[#1E1E20] border border-transparent hover:border-[#2D2D30] rounded-lg transition-all"
                      title={item.label}
                    >
                      <item.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                {/* Editor TextArea */}
                <div className="flex-1 p-4 min-h-0 relative">
                  <textarea
                    id="page-markdown-editor"
                    ref={textareaRef}
                    value={editorText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full h-full resize-none outline-none border-0 text-[#E2E8F0] tracking-wide bg-[#121214] text-sm leading-relaxed font-mono placeholder:font-sans placeholder-gray-600"
                    placeholder="Quá trình quét hoàn tất! Bạn có thể chỉnh sửa nội dung văn bản Markdown hoặc in đậm, tạo danh sách ở đây..."
                  />
                </div>
              </div>
            )
          ) : (
            /* Markdown Live Preview styled like standard rich paper docs */
            <div className="flex-1 overflow-y-auto p-8 bg-[#0A0A0B] min-h-0 flex justify-center">
              <div className="w-full max-w-2xl bg-[#121214] p-12 min-h-[700px] rounded-xl shadow-2xl border border-[#2D2D30] text-[#E2E8F0] select-text">
                <h1 className="text-3xl font-extrabold border-b border-[#2D2D30] pb-4 mb-6 text-white font-sans tracking-tight">
                  {pageTitle || "Trang Số"}
                </h1>
                
                {editorText.trim() ? (
                  <div 
                    className="markdown-formatted-content leading-relaxed text-sm antialiased text-[#E2E8F0]"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(editorText) }}
                  />
                ) : (
                  <p className="text-gray-500 italic">Trang trống, chưa có nội dung văn bản nào.</p>
                )}
              </div>
            </div>
          )}

          {/* AI Refine Assistant Panel (Collapsible / Bottom Bar) */}
          <div className="bg-[#0F0F11] border-t border-[#2D2D30] p-4 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Trợ lý Tinh chỉnh & Số hóa Văn bản AI</span>
              </div>
              <div className="flex items-center gap-2">
                {historyText !== null && (
                  <button
                    onClick={handleUndoAi}
                    className="text-xs text-gray-405 hover:text-white font-semibold flex items-center gap-1 py-1 px-2.5 bg-[#18181B] border border-[#2D2D30] hover:bg-[#2D2D30] rounded-lg transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#3b82f6]" /> Hoàn tác chỉnh sửa AI
                  </button>
                )}
                {isAiLoading && (
                  <span className="text-xs text-purple-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Trợ lý đang chỉnh sửa...
                  </span>
                )}
              </div>
            </div>

            {/* Quick action badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {quickPrompts.map((btn, id) => (
                <button
                  key={id}
                  onClick={() => handleAiRefine(btn.prompt)}
                  disabled={isAiLoading || !editorText.trim()}
                  className="text-xs border border-purple-900/50 hover:border-purple-500/50 bg-[#1A1125] hover:bg-[#26163A] text-purple-300 font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Custom input bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customPrompt.trim() && handleAiRefine(customPrompt)}
                disabled={isAiLoading || !editorText.trim()}
                placeholder="Yêu cầu riêng... (Gợi ý: 'Dịch sang tiếng Pháp' hoặc 'Lập bảng từ phân tích trên')"
                className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-[#2D2D30] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-950 bg-[#121214] text-[#E2E8F0] shadow-inner"
              />
              <button
                onClick={() => customPrompt.trim() && handleAiRefine(customPrompt)}
                disabled={isAiLoading || !customPrompt.trim() || !editorText.trim()}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md border border-purple-500/30 disabled:opacity-40 disabled:pointer-events-none"
              >
                Gửi AI
              </button>
            </div>

            {/* Toast Feedbacks */}
            {aiSuccessMsg && (
              <div className="mt-2.5 text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" /> {aiSuccessMsg}
              </div>
            )}
            {aiErrorMsg && (
              <div className="mt-2.5 text-xs text-red-400 font-medium flex items-center gap-1.5 bg-red-950/30 p-2.5 rounded-lg border border-red-900/40">
                <p>{aiErrorMsg}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
