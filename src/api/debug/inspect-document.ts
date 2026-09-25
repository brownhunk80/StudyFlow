import { PDFParse } from 'pdf-parse';

export interface InspectDocumentRequest {
  fileName?: string;
  documentName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  rawText?: string;
  inlinePdf?: string; // base64
  base64?: string; // base64 alias
}

export interface InspectDocumentResult {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  extractedCharacterCount: number;
  wordCount: number;
  pageCount: number;
  first500Chars: string;
  last500Chars: string;
  sampleHeadings: string[];
  extractedText?: string;
  ingestionMethod: {
    method: 'client_extracted_text' | 'server_pdf_parse' | 'server_regex_stream' | 'raw_base64_multimodal' | 'empty_input';
    isScannedImagePdf: boolean;
    hasTextLayer: boolean;
    status: 'healthy' | 'warning' | 'unreadable';
    diagnostics: string[];
  };
  inspectedAt: string;
}

/**
 * Extracts raw text and page count from a PDF Buffer using pdf-parse,
 * supporting both v2.x class API (new PDFParse({ data })) and v1.x legacy function API.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  isScannedImagePdf: boolean;
}> {
  let text = '';
  let pageCount = 1;

  try {
    const PDFParseClass: any = PDFParse;

    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      try {
        await parser.destroy();
      } catch {
        // ignore destroy issues
      }

      if (res) {
        if (Array.isArray(res.pages) && res.pages.length > 0) {
          text = res.pages
            .map((p: any) => {
              const pNum = p.num !== undefined ? p.num : (p.pageIndex !== undefined ? p.pageIndex + 1 : 1);
              const pText = (p.text || '').trim();
              return `[Page ${pNum}]\n${pText}`;
            })
            .filter((block: string) => block.length > 0)
            .join('\n\n')
            .trim();
          pageCount = res.total || res.pages.length || 1;
        } else if (res.text) {
          text = res.text.trim();
          pageCount = res.total || 1;
        }
      }
    }
  } catch (err: any) {
    console.warn('[PDFParse] Standard pdf-parse failed, attempting stream fallback:', err?.message || err);
  }

  // Stream regex fallback if pdf-parse didn't produce text
  if (!text || text.length < 10) {
    try {
      const raw = buffer.toString('latin1');
      const pageSplits = raw.split(/\/Type\s*\/Page\b/);
      if (pageSplits.length > 1) {
        pageCount = Math.max(pageCount, pageSplits.length - 1);
      }

      const textMatches: string[] = [];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let match;
      while ((match = tjRegex.exec(raw)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          textMatches.push(match[1].replace(/\\([()\\])/g, '$1').trim());
        }
      }
      const arrayRegex = /\[([^\]]+)\]\s*TJ/g;
      while ((match = arrayRegex.exec(raw)) !== null) {
        const innerTj = /\(([^)]+)\)/g;
        let innerMatch;
        while ((innerMatch = innerTj.exec(match[1])) !== null) {
          if (innerMatch[1] && innerMatch[1].trim().length > 0) {
            textMatches.push(innerMatch[1].replace(/\\([()\\])/g, '$1').trim());
          }
        }
      }
      if (textMatches.length > 0) {
        text = textMatches.join(' ').replace(/\s{2,}/g, ' ').trim();
      }
    } catch {
      // ignore
    }
  }

  // Detect if scanned image PDF:
  // Buffer size > 50KB but extracted text is tiny or 0
  const isScannedImagePdf = buffer.length > 50000 && text.trim().length < 50;

  return {
    text,
    pageCount: Math.max(1, pageCount),
    isScannedImagePdf,
  };
}

/**
 * Diagnostic Inspector: analyzes uploaded document payload without running full milestone generation
 */
export async function inspectUploadedDocument(
  payload: InspectDocumentRequest
): Promise<InspectDocumentResult> {
  const fileName = payload.fileName || payload.documentName || 'Unknown Document';
  const mimeType = payload.mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
  const base64Data = payload.inlinePdf || payload.base64;
  const rawText = payload.rawText || '';

  let extractedText = '';
  let pageCount = 1;
  let method: InspectDocumentResult['ingestionMethod']['method'] = 'empty_input';
  let isScannedImagePdf = false;
  let fileSizeBytes = payload.fileSizeBytes || 0;
  const diagnostics: string[] = [];

  // Case 1: Pre-extracted client text supplied
  if (rawText && rawText.trim().length > 0) {
    extractedText = rawText.trim();
    method = 'client_extracted_text';
    pageCount = Math.max(1, (extractedText.match(/\[Page\s+\d+\]/gi) || []).length || Math.round(extractedText.split(/\s+/).length / 350));
    diagnostics.push(`Received ${extractedText.length} characters of pre-extracted client text.`);
  } 
  // Case 2: Base64 PDF / File payload supplied
  else if (base64Data) {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    fileSizeBytes = buffer.length;

    diagnostics.push(`Decoded base64 payload: ${(buffer.length / 1024).toFixed(1)} KB.`);

    if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      const parsed = await parsePdfBuffer(buffer);
      extractedText = parsed.text;
      pageCount = parsed.pageCount;
      isScannedImagePdf = parsed.isScannedImagePdf;
      method = 'server_pdf_parse';

      if (isScannedImagePdf) {
        diagnostics.push('WARNING: File size indicates PDF pages, but 0 or near-0 text characters were extracted. This is likely a scanned image PDF without an embedded text layer.');
      } else {
        diagnostics.push(`Successfully extracted ${extractedText.length} characters across ${pageCount} pages via server-side PDF parser.`);
      }
    } else {
      // Plain text or utf-8 buffer
      extractedText = buffer.toString('utf-8');
      method = 'server_pdf_parse';
      diagnostics.push(`Decoded utf-8 text file with ${extractedText.length} characters.`);
    }
  } else {
    diagnostics.push('ERROR: Neither rawText nor inlinePdf/base64 payload was provided in the request.');
  }

  // Word and line calculations
  const cleanTokens = extractedText.trim().split(/\s+/).filter((t) => t.length > 0);
  const wordCount = cleanTokens.length;
  const characterCount = extractedText.length;

  // First 500 and Last 500 chars
  const first500Chars = extractedText.slice(0, 500);
  const last500Chars = extractedText.length > 500 ? extractedText.slice(-500) : extractedText;

  // Extract first 20 non-empty sample lines / headings
  const allLines = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sampleHeadings = allLines.slice(0, 20);

  // Overall health status evaluation
  let status: 'healthy' | 'warning' | 'unreadable' = 'healthy';
  if (characterCount < 50) {
    status = 'unreadable';
    diagnostics.push('STATUS: UNREADABLE - Extracted character count is less than 50 characters.');
  } else if (isScannedImagePdf || characterCount < 200) {
    status = 'warning';
    diagnostics.push('STATUS: WARNING - Low character count or potential raster scan detected.');
  } else {
    diagnostics.push('STATUS: HEALTHY - Extracted sufficient grounded text for curriculum milestone extraction.');
  }

  return {
    fileName,
    mimeType,
    fileSizeBytes,
    extractedCharacterCount: characterCount,
    wordCount,
    pageCount,
    first500Chars,
    last500Chars,
    sampleHeadings,
    extractedText,
    ingestionMethod: {
      method,
      isScannedImagePdf,
      hasTextLayer: characterCount >= 50,
      status,
      diagnostics,
    },
    inspectedAt: new Date().toISOString(),
  };
}
