export function exportToWord(filename: string, htmlContent: string) {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Exported OCR Document</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 40px;
        }
        h1 {
          font-size: 28pt;
          text-align: center;
          margin-bottom: 20px;
          color: #1e293b;
        }
        h2 {
          font-size: 18pt;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 5px;
          color: #0f172a;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          font-size: 14pt;
          color: #1e293b;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        p {
          font-size: 11pt;
          margin-bottom: 12px;
          text-align: justify;
        }
        ul, ol {
          margin-bottom: 15px;
          padding-left: 20px;
        }
        li {
          font-size: 11pt;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          font-size: 10pt;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
        }
        blockquote {
          border-left: 4px solid #94a3b8;
          padding-left: 15px;
          margin-left: 0;
          color: #475569;
          font-style: italic;
        }
      </style>
    </head>
    <body>
  `;
  const footer = `
    </body>
    </html>
  `;
  const sourceHTML = header + htmlContent + footer;
  
  // Use '\ufeff' (BOM) so that MS Word parses it as proper UTF-8 with accents
  const blob = new Blob(['\ufeff' + sourceHTML], {
    type: 'application/msword;charset=utf-8'
  });
  
  // Create clean filename compatible with unicode accents
  const cleanFilename = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s_-]/g, "")
    .replace(/\s+/g, "-");
    
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanFilename || 'tai-lieu-ocr'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
