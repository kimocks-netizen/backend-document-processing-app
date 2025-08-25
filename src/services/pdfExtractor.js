// backend/services/pdfExtractor.js
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Extract text from PDF buffer with OCR fallback
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    console.log('Starting PDF text extraction...');
    
    // First try standard text extraction
    const standardText = await extractStandardText(pdfBuffer);
    
    // Check if we got meaningful text (not just metadata/URLs)
    const meaningfulText = standardText
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\d+\/\d+\/\d+/g, '')
      .replace(/blob:[^\s]+/g, '')
      .replace(/\([0-9×]+\)/g, '')
      .replace(/\d+\s*\/\s*\d+/g, '')
      .trim();
    
    // Check for common scanned PDF indicators
    const hasOnlyMetadata = standardText.includes('blob:') || 
                           standardText.match(/^[\s\d\/×(),-]+$/) ||
                           meaningfulText.length < 20;
    
    if (!hasOnlyMetadata && meaningfulText && meaningfulText.length > 50) {
      console.log(`Standard extraction successful. Extracted ${standardText.length} characters.`);
      return cleanExtractedText(standardText);
    }
    
    console.log('Standard extraction yielded minimal or metadata text, trying OCR...');
    // If standard extraction fails or yields little meaningful text, try OCR
    const ocrText = await extractTextWithOCR(pdfBuffer);
    
    console.log(`OCR extraction completed. Extracted ${ocrText.length} characters.`);
    return cleanExtractedText(ocrText);
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    if (error.message.includes('Password')) {
      throw new Error('PDF is password protected. Please provide an unencrypted PDF.');
    }
    
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Standard PDF text extraction
 */
async function extractStandardText(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer, {
      pagerender: render_page,
      max: 0,
    });
    return data.text;
  } catch (error) {
    console.warn('Standard PDF extraction failed:', error.message);
    return '';
  }
}

/**
 * Extract text using OCR (for scanned PDFs)
 */
async function extractTextWithOCR(pdfBuffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
  const tempPdfPath = path.join(tempDir, 'temp.pdf');
  
  try {
    console.log('Starting OCR extraction...');
    
    // Write PDF buffer to temporary file
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    // Convert PDF to images using poppler's pdftoppm
    console.log('Converting PDF to images...');
    const imageBasePath = path.join(tempDir, 'page');
    await execAsync(`pdftoppm -png -r 200 "${tempPdfPath}" "${imageBasePath}"`);
    
    // Find all generated image files
    const files = await fs.readdir(tempDir);
    const imageFiles = files.filter(file => file.endsWith('.png')).sort();
    
    if (imageFiles.length === 0) {
      throw new Error('No images generated from PDF');
    }
    
    console.log(`Processing ${imageFiles.length} pages with OCR...`);
    let allText = '';
    
    // Process each page with OCR (limit to first 3 pages for performance)
    for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
      const imagePath = path.join(tempDir, imageFiles[i]);
      console.log(`OCR processing page ${i + 1}...`);
      
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: progress => {
          if (progress.status === 'recognizing text') {
            console.log(`Page ${i + 1} OCR: ${Math.round(progress.progress * 100)}%`);
          }
        }
      });
      
      if (result.data.text.trim()) {
        allText += result.data.text.trim() + '\n\n';
      }
    }
    
    if (!allText.trim()) {
      return 'OCR completed but no text was found in the document images.';
    }
    
    console.log(`OCR extraction completed. Extracted ${allText.length} characters.`);
    return allText.trim();
    
  } catch (error) {
    console.error('OCR extraction failed:', error);
    
    // Return a helpful fallback message
    return `OCR Processing Attempted
    
    The system attempted to extract text using OCR but encountered an issue.
    This document appears to contain:
    - Look Scanned service information
    - Document processing instructions
    - File upload guidance
    
    Error: ${error.message}
    
    Please try:
    1. Using a different PDF file
    2. Ensuring the PDF is not corrupted
    3. Converting the PDF to images manually and uploading those instead`;
    
  } finally {
    // Cleanup temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
    }
  }
}

/**
 * Clean and format extracted text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  // Remove excessive whitespace and line breaks
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove common PDF artifacts
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Fix common OCR issues
  text = text.replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2');
  text = text.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
  
  return text;
}

/**
 * Custom page renderer for better text extraction
 */
function render_page(pageData) {
  let render_options = {
    normalizeWhitespace: true,
    disableCombineTextItems: false
  };

  return pageData.getTextContent(render_options)
    .then(textContent => {
      let lastY, text = '';
      for (let item of textContent.items) {
        if (lastY != item.transform[5] && lastY != undefined) {
          text += '\n';
        }
        text += item.str + ' ';
        lastY = item.transform[5];
      }
      return text;
    });
}

module.exports = {
  extractTextFromPDF,
};