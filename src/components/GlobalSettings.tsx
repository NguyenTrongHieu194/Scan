import { Settings, FileText, Bot, HelpCircle, Key, Cpu } from "lucide-react";
import { DocumentMeta } from "../types";

interface GlobalSettingsProps {
  meta: DocumentMeta;
  onUpdateMeta: (updates: Partial<DocumentMeta>) => void;
}

export default function GlobalSettings({ meta, onUpdateMeta }: GlobalSettingsProps) {
  return (
    <div id="settings-workspace" className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B] text-[#E2E8F0]">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" /> Thiết lập Tài liệu & Xuất bản
          </h2>
          <p className="text-xs text-gray-400 mt-1">Cấu hình thông tin chuẩn công ty và trang bìa dùng để sinh bản in PDF chuyên nghiệp.</p>
        </div>

        {/* Global Metadata Settings Card */}
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#2D2D30] shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" /> Cấu hình bìa chính
          </h3>
          
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tiêu đề tài liệu mẫu</label>
              <input 
                type="text"
                value={meta.title}
                onChange={(e) => onUpdateMeta({ title: e.target.value })}
                placeholder="Ví dụ: Báo cáo Nghiên cứu Thị trường Quý 1 / Hóa đơn bán lẻ"
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#2D2D30] focus:outline-none focus:border-blue-500 text-[#E2E8F0] bg-[#1E1E20] placeholder-gray-600 focus:ring-1 focus:ring-blue-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tên người soạn / Đơn vị soạn</label>
                <input 
                  type="text"
                  value={meta.author}
                  onChange={(e) => onUpdateMeta({ author: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A / Phòng IT"
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#2D2D30] focus:outline-none focus:border-blue-500 text-[#E2E8F0] bg-[#1E1E20] placeholder-gray-600 focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Ngày khởi tạo tài liệu</label>
                <input 
                  type="date"
                  value={meta.createdAt.slice(0, 10)}
                  onChange={(e) => onUpdateMeta({ createdAt: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-[#2D2D30] focus:outline-none focus:border-blue-500 text-[#E2E8F0] bg-[#1E1E20] placeholder-gray-600 focus:ring-1 focus:ring-blue-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#2D2D30] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Tự động chèn Trang Bìa độc lập</span>
                <span className="text-[10px] text-gray-500">Tạo trang đầu tiên chứa tiêu đề lớn, tác giả, ngày thiết lập dạng bìa sách.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={meta.showCoverPage}
                  onChange={(e) => onUpdateMeta({ showCoverPage: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-10 h-6 bg-[#2D2D30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* OCR Best Practice & Instructions */}
        <div className="bg-[#111A2E]/40 p-6 rounded-2xl border border-blue-950/40 space-y-3.5 text-gray-300">
          <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-widest">
            <HelpCircle className="w-4 h-4" /> hướng dẫn quét ocr tài liệu đạt hiệu quả cao nhất
          </h4>
          <ul className="list-disc pl-4 space-y-2 text-xs text-gray-450">
            <li><strong>Chất lượng hình ảnh:</strong> Đảm bảo webcam hoặc điện thoại chụp ảnh đủ ánh sáng, góc thẳng, chữ không bị rung mờ, bóng đè hoặc méo xiên.</li>
            <li><strong>OCR đa ngôn ngữ tinh thông:</strong> Mô hình <strong>Gemini 3.5 Flash</strong> hỗ trợ cực tốt nhận dạng chữ viết tay và văn bản hành chính bằng cả tiếng Anh, Tiếng Việt, chữ Hán, Nhật, Hàn, v.v.</li>
            <li><strong>Biên tập định dạng thông minh:</strong> Văn bản OCR xong sẽ tự phân tích bảng biểu, gạch đầu dòng Markdown. Bạn hãy giữ định dạng này khi chỉnh sửa để khi tạo tài liệu in PDF và xuất Word trông tuyệt đẹp và trực quan.</li>
            <li><strong>Trợ lý AI đắc lực:</strong> Hãy bôi đen hoặc chỉ cần gõ yêu cầu tự do tại thanh công cụ dưới góc soạn thảo để AI lọc bỏ khoảng trống dính, sửa dấu tiếng Việt hoặc dịch toàn bộ tự động nhanh chóng trong 1 giây.</li>
          </ul>
        </div>

        {/* Security / Secret management info */}
        <div className="bg-[#18181B] p-5 rounded-2xl border border-[#2D2D30] space-y-2 text-gray-400">
          <h4 className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Key className="w-3.5 h-3.5 text-gray-400" /> Quản lý Khóa API Secrets bảo mật
          </h4>
          <p className="text-xs text-gray-500">
            Ứng dụng của bạn sử dụng API Server mượt mà từ hệ thống. Nếu bạn gặp lỗi chưa có Khóa API, hãy truy cập menu <strong>Settings &gt; Secrets</strong> trên giao diện Google AI Studio để thêm khóa <code className="bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-red-400 font-mono text-[10px]">GEMINI_API_KEY</code> của riêng bạn.
          </p>
        </div>
      </div>
    </div>
  );
}
