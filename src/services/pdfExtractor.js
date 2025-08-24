// src/services/pdfExtractor.js
const pdfParse = require('pdf-parse');

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    
    // Clean up the extracted text
    let text = data.text;
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove page numbers and headers/footers (simple heuristic)
    text = text.replace(/\n\d+\n/g, '\n'); // Page numbers on their own line
    text = text.replace(/^\d+\s+/gm, ''); // Page numbers at line start
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

module.exports = {
  extractTextFromPDF,
};