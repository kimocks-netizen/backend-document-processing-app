// backend/services/imageExtractor.js
const Tesseract = require('tesseract.js');

/**
 * Extract text from image buffer using Tesseract.js
 * @param {Buffer} imageBuffer - Image file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromImage(imageBuffer) {
  try {
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: progress => {
        if (progress.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(progress.progress * 100)}%`);
        }
      }
    });
    
    let text = result.data.text;
    
    // Clean up OCR results
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/[^\w\s.,!?;:()\-@#$%&*+/=<>[\]{}]/g, '');
    
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}

module.exports = {
  extractTextFromImage,
};