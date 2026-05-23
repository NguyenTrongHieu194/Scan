import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for large base64 image requests
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // OCR Endpoint
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, mimeType, prompt } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Thiếu dữ liệu hình ảnh hoặc loại MIME" });
      }

      // Check if API key is loaded
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ 
          error: "API Key chưa được thiết lập. Vui lòng thiết lập GEMINI_API_KEY trong phần Settings > Secrets của AI Studio." 
        });
      }

      // Prepare image block for Gemini
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: image,
        },
      };

      const systemInstruction = `Bạn là một chuyên gia số hóa tài liệu và quét văn bản OCR chuyên nghiệp.
Nhiệm vụ của bạn là phân tích hình ảnh của tài liệu và trích xuất toàn bộ nội dung chữ một cách chính xác tuyệt đối.
Hãy tổ chức nội dung quét được giống như một tài liệu Word (.docx) chuyên nghiệp:
- Giữ nguyên cấu trúc: tiêu đề lớn, tiêu đề nhỏ, đoạn văn, danh sách có dấu đầu dòng (bullet points), danh sách đánh số, và bảng biểu (chuyển bảng biểu thành bảng Markdown sạch).
- Nhận diện chữ in đậm, in nghiêng và định dạng chính xác bằng markdown.
- KHÔNG tóm tắt hay lược bỏ bất kỳ thông tin nào trong tài liệu gốc.
- Sửa các lỗi khoảng trắng cơ bản hoặc lỗi quét tự động nhỏ, nhưng giữ nguyên từ ngữ gốc một cách trung thực nhất.

Bạn bắt buộc phải trả về kết quả dưới dạng một đối tượng JSON chuẩn có các trường sau:
- "title": Tiêu đề ngắn gọn được dự đoán hoặc phát hiện từ tài liệu/hình ảnh để đặt tên file hoặc chương (Viết tự do bằng ngôn ngữ tài liệu).
- "markdownContent": Toàn bộ nội dung chữ đã trích xuất được định dạng bằng Markdown đẹp đẽ, sạch sẽ.
- "language": Ngôn ngữ chính phát hiện được (Ví dụ: "Tiếng Việt", "English").
- "confidence": Điểm số phần trăm độ đáng tin cậy của thuật toán quét (từ 0 tới 100) dựa trên độ rõ nét chữ.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: prompt || "Vui lòng quét OCR ảnh này và trích xuất văn bản định dạng phong phú." }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              markdownContent: { type: Type.STRING },
              language: { type: Type.STRING },
              confidence: { type: Type.INTEGER }
            },
            required: ["title", "markdownContent", "language", "confidence"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: "Không thể lấy nội dung từ Gemini" });
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("OCR API Error:", error);
      let errMsg = "Đã xảy ra lỗi hệ thống khi quét ảnh.";
      let isQuota = false;
      const errStr = error.message || String(error);
      if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
        isQuota = true;
        errMsg = "Vượt quá giới hạn lượt yêu cầu miễn phí của mô hình Gemini (Lỗi 429 - Quota Exceeded). Hệ thống đang chạy ở gói Free Tier bị giới hạn lượt gọi. Vui lòng thử lại sau khoảng 1 phút hoặc điền Khóa cá nhân trong mục Thiết lập.";
      } else if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
        errMsg = "Khóa API cung cấp không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại thiết lập khóa của bạn.";
      } else {
        errMsg = errStr;
      }
      res.status(500).json({ error: errMsg, isQuotaExceeded: isQuota });
    }
  });

  // Refine / AI Edit Endpoint
  app.post("/api/refine", async (req, res) => {
    try {
      const { text, instruction } = req.body;
      if (!text || !instruction) {
        return res.status(400).json({ error: "Thiếu nội dung văn bản hoặc hướng dẫn" });
      }

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ 
          error: "API Key chưa được thiết lập. Vui lòng thiết lập GEMINI_API_KEY trong phần Settings > Secrets của AI Studio." 
        });
      }

      const systemInstruction = `Bạn là biên tập viên soạn thảo tài liệu cao cấp và chuyên gia tinh chỉnh văn bản Word.
Nhiệm vụ của bạn là nhận vào văn bản nguồn dạng Markdown và điều chỉnh, tối ưu hóa hoặc xử lý nó dựa theo yêu cầu của người dùng.
Hãy giữ nguyên tất cả định dạng Markdown cần thiết (như in đậm, bảng biểu, danh sách, tiêu đề) trừ khi yêu cầu bảo bạn thay đổi.
Trả về kết quả dưới dạng đối tượng JSON chuẩn có trường:
- "result": Nội dung văn văn bản đã tinh chỉnh xong hoàn chỉnh bằng Markdown.
- "summary": Mô tả cực kỳ ngắn gọn (không quá 15 chữ) về hành động bạn đã thực hiện bằng Tiếng Việt (Ví dụ: "Đã sửa lỗi chính tả và làm gọn văn phong").`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { text: `Văn bản gốc:\n${text}\n\nYêu cầu tinh chỉnh:\n${instruction}` }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              result: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["result", "summary"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "Không thể lấy nội dung từ Gemini" });
      }

      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Refine API Error:", error);
      let errMsg = "Đã xảy ra lỗi khi trợ lý AI tinh chỉnh văn bản.";
      let isQuota = false;
      const errStr = error.message || String(error);
      if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
        isQuota = true;
        errMsg = "Lượt gọi miễn phí tinh chỉnh đã hết hạn (Lỗi 429 - Quota Exceeded). Vui lòng thử lại sau 1 phút hoặc nhập Khóa API riêng.";
      } else if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
        errMsg = "Khóa API cung cấp không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại thiết lập khóa của bạn.";
      } else {
        errMsg = errStr;
      }
      res.status(500).json({ error: errMsg, isQuotaExceeded: isQuota });
    }
  });

  // Serve static files or Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Server startup failure", err);
});
