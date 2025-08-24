// backend/services/pdfExtractor.js
const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF buffer with enhanced error handling
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    console.log('Starting PDF text extraction...');
    
    const data = await pdfParse(pdfBuffer, {
      // Enhanced options for better text extraction
      pagerender: render_page,
      max: 0, // No page limit
    });

    let text = data.text;
    
    if (!text || text.trim().length === 0) {
      console.warn('No text extracted from PDF, trying alternative method...');
      // Try alternative approach for encrypted or complex PDFs
      text = await extractTextAlternative(pdfBuffer);
    }

    // Clean up the extracted text
    text = cleanExtractedText(text);
    
    console.log(`PDF text extraction completed. Extracted ${text.length} characters.`);
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    if (error.message.includes('Password')) {
      throw new Error('PDF is password protected. Please provide an unencrypted PDF.');
    }
    
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Alternative text extraction method for difficult PDFs
 */
async function extractTextAlternative(pdfBuffer) {
  try {
    // Simple text extraction using buffer toString as fallback
    // This is a basic fallback for very simple PDFs
    const text = pdfBuffer.toString('utf8');
    
    // Extract text between text markers (very basic approach)
    const textMatches = text.match(/\(([^)]+)\)/g);
    if (textMatches) {
      return textMatches.map(match => 
        match.slice(1, -1) // Remove parentheses
      ).join(' ');
    }
    
    return 'Could not extract text from this PDF. The document may be scanned or encrypted.';
  } catch (error) {
    console.error('Alternative extraction failed:', error);
    return 'Text extraction failed. The PDF may be scanned, encrypted, or corrupted.';
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
  text = text.replace(/�/g, ''); // Remove replacement characters
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
  
  // Fix common OCR/PDF extraction issues
  text = text.replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2'); // Fix spaced capitals
  text = text.replace(/([a-z])\s+([A-Z])/g, '$1. $2'); // Add period between sentences
  
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