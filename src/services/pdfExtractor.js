// backend/services/pdfExtractor.js
const pdfParse = require('pdf-parse');

// Check if OCR modules are available
let Tesseract, fromPath;
try {
  Tesseract = require('tesseract.js');
  fromPath = require('pdf2pic').fromPath;
  console.log('OCR modules loaded successfully');
} catch (error) {
  console.warn('OCR modules not available, OCR functionality will be limited:', error.message);
}

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Extract text from PDF buffer with hybrid approach
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    console.log('Starting PDF text extraction with hybrid approach...');
    
    // First attempt: Standard pdf-parse extraction
    let text = await tryStandardExtraction(pdfBuffer);
    
    // Check if standard extraction produced meaningful text
    if (isTextQualityGood(text)) {
      console.log(`Standard PDF extraction successful. Extracted ${text.length} characters.`);
      return cleanExtractedText(text);
    }
    
    console.log('Standard extraction produced poor quality text, trying OCR approach...');
    
    // Second attempt: Convert PDF to images and use OCR
    try {
      text = await extractTextWithOCR(pdfBuffer);
      
      if (text && text.trim().length > 0 && isTextQualityGood(text)) {
        console.log(`OCR extraction successful. Extracted ${text.length} characters.`);
        return cleanExtractedText(text);
      }
    } catch (ocrError) {
      console.log('OCR approach failed, trying fallback:', ocrError.message);
      
      // Try alternative OCR approach if available
      try {
        console.log('Trying alternative OCR approach...');
        text = await extractTextWithAlternativeOCR(pdfBuffer);
        
        if (text && text.trim().length > 0 && isTextQualityGood(text)) {
          console.log(`Alternative OCR successful. Extracted ${text.length} characters.`);
          return cleanExtractedText(text);
        }
      } catch (altOcrError) {
        console.log('Alternative OCR also failed:', altOcrError.message);
      }
    }
    
    // Third attempt: Simple fallback extraction
    console.log('OCR failed, trying simple fallback extraction...');
    text = await extractTextFallback(pdfBuffer);
    
    if (text && text.trim().length > 0 && isTextQualityGood(text)) {
      console.log(`Fallback extraction successful. Extracted ${text.length} characters.`);
      return cleanExtractedText(text);
    }
    
    // If all methods fail, return a basic message instead of throwing an error
    console.warn('All extraction methods failed, returning basic text');
    return 'PDF text extraction was not successful. The document may be scanned, encrypted, or corrupted.';
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    
    if (error.message.includes('Password')) {
      throw new Error('PDF is password protected. Please provide an unencrypted PDF.');
    }
    
    // Return basic text instead of failing completely
    console.warn('PDF extraction failed, returning basic text');
    return 'PDF processing encountered an error. Please try with a different document.';
  }
}

/**
 * Try standard PDF text extraction
 */
async function tryStandardExtraction(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer, {
      max: 0, // No page limit
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    return data.text || '';
  } catch (error) {
    console.log('Standard extraction failed:', error.message);
    return '';
  }
}

/**
 * Check if extracted text quality is good enough
 */
function isTextQualityGood(text) {
  if (!text || text.trim().length === 0) return false;
  
  // Check if text contains mostly readable characters
  const readableChars = text.replace(/[^\w\s.,!?;:()\-@#$%&*+/=<>[\]{}'"]/g, '');
  const readableRatio = readableChars.length / text.length;
  
  // Check if text has reasonable word length
  const words = text.split(/\s+/).filter(word => word.length > 2);
  const avgWordLength = words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0;
  
  // Check for common PDF artifacts (binary content, encoded text)
  const hasBinaryContent = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text);
  const hasEncodedContent = /[^\x20-\x7E\n\r\t]/.test(text);
  
  console.log(`Text quality check - Readable ratio: ${readableRatio.toFixed(2)}, Avg word length: ${avgWordLength.toFixed(2)}, Has binary: ${hasBinaryContent}, Has encoded: ${hasEncodedContent}`);
  
  // Text is good if it's mostly readable, has reasonable word lengths, and no binary/encoded content
  return readableRatio > 0.6 && avgWordLength > 2.5 && text.length > 50 && !hasBinaryContent && !hasEncodedContent;
}

/**
 * Extract text using OCR by converting PDF to images first
 */
async function extractTextWithOCR(pdfBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if required modules are available
      if (!Tesseract || !fromPath) {
        throw new Error('OCR modules not available. Please install tesseract.js and pdf2pic.');
      }

      // Check available disk space
      const freeSpace = await checkDiskSpace();
      if (freeSpace < 100 * 1024 * 1024) { // 100MB minimum
        throw new Error('Insufficient disk space for PDF OCR processing');
      }

      // Create temporary files
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
      const outputDir = path.join(tempDir, `pdf_images_${Date.now()}`);
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write buffer to temporary file
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      
      // Convert PDF to images with better error handling
      let pages;
      try {
        const options = {
          density: 150, // Higher DPI for better OCR
          saveFilename: "page",
          savePath: outputDir,
          format: "png",
          width: 1200,
          height: 1600,
          quality: 100, // High quality for OCR
          antialiasing: true,
          antialiasingQuality: 100,
          outputQuality: 100,
          outputType: 'png' // Ensure output is PNG for Tesseract
        };
        
        console.log('Converting PDF to images with options:', options);
        const convert = fromPath(tempPdfPath, options);
        pages = await convert.bulk(-1); // Convert all pages
        
        console.log('PDF to image conversion successful, pages:', pages.length);
      } catch (conversionError) {
        console.error('PDF to image conversion failed:', conversionError);
        
        // Try alternative approach with different options
        try {
          console.log('Trying alternative conversion options...');
          const altOptions = {
            density: 100, // Lower DPI
            saveFilename: "page",
            savePath: outputDir,
            format: "jpeg",
            width: 800,
            height: 1000,
            quality: 100,
            antialiasing: true,
            antialiasingQuality: 100,
            outputQuality: 100,
            outputType: 'jpeg'
          };
          
          const convertAlt = fromPath(tempPdfPath, altOptions);
          pages = await convertAlt.bulk(-1);
          console.log('Alternative conversion successful, pages:', pages.length);
        } catch (altError) {
          throw new Error(`Both conversion methods failed: ${conversionError.message}, ${altError.message}`);
        }
      }
      
      if (!pages || pages.length === 0) {
        throw new Error('No pages could be extracted from PDF');
      }
      
      console.log(`Converted ${pages.length} PDF pages to images for OCR`);
      
      let fullText = '';
      
      // Process each page with OCR
      for (let i = 0; i < pages.length; i++) {
        console.log(`Processing page ${i + 1}/${pages.length} with OCR...`);
        
        try {
          const result = await Tesseract.recognize(
            pages[i].path,
            'eng',
            { 
              logger: progress => {
                if (progress.status === 'recognizing text') {
                  console.log(`OCR progress for page ${i + 1}: ${Math.round(progress.progress * 100)}%`);
                }
              }
            }
          );
          
          fullText += result.data.text + '\n\n';
          console.log(`Page ${i + 1} OCR completed, text length: ${result.data.text.length}`);
        } catch (ocrError) {
          console.error(`OCR failed for page ${i + 1}:`, ocrError);
          // Continue with other pages
          fullText += `[OCR failed for page ${i + 1}]\n\n`;
        }
        
        // Clean up page image
        try {
          fs.unlinkSync(pages[i].path);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary image:', cleanupError);
        }
      }
      
      // Clean up temporary files
      try {
        fs.unlinkSync(tempPdfPath);
        fs.rmdirSync(outputDir, { recursive: true });
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files:', cleanupError);
      }
      
      if (!fullText.trim()) {
        throw new Error('OCR failed to extract any text from the document');
      }
      
      console.log('OCR extraction completed successfully');
      resolve(fullText);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Alternative OCR approach for when pdf2pic fails
 */
async function extractTextWithAlternativeOCR(pdfBuffer) {
  try {
    console.log('Attempting alternative OCR approach...');
    
    // Try to extract text using different pdf-parse options
    const extractionAttempts = [
      // Attempt 1: Standard options
      { max: 0, normalizeWhitespace: true, disableCombineTextItems: false },
      // Attempt 2: Different normalization
      { max: 0, normalizeWhitespace: false, disableCombineTextItems: true },
      // Attempt 3: Page by page extraction
      { max: 1, normalizeWhitespace: true, disableCombineTextItems: false },
      // Attempt 4: Minimal options
      { max: 1, normalizeWhitespace: false, disableCombineTextItems: true }
    ];
    
    for (let i = 0; i < extractionAttempts.length; i++) {
      try {
        console.log(`Alternative OCR attempt ${i + 1} with options:`, extractionAttempts[i]);
        const data = await pdfParse(pdfBuffer, extractionAttempts[i]);
        
        if (data.text && data.text.trim().length > 0) {
          // Check if this text is actually readable content, not just metadata
          const readableText = data.text.replace(/[^\w\s.,!?;:()\-@#$%&*+/=<>[\]{}'"]/g, '');
          const readableRatio = readableText.length / data.text.length;
          
          console.log(`Attempt ${i + 1} extracted ${data.text.length} chars, readable ratio: ${readableRatio.toFixed(2)}`);
          
          // If we have mostly readable text, return it
          if (readableRatio > 0.5 && data.text.length > 100) {
            console.log('Alternative OCR found readable text content');
            return data.text;
          }
        }
      } catch (attemptError) {
        console.log(`Attempt ${i + 1} failed:`, attemptError.message);
        continue;
      }
    }
    
    // If all attempts fail, try to extract any readable patterns from the buffer
    console.log('All pdf-parse attempts failed, trying buffer analysis...');
    const text = pdfBuffer.toString('utf8');
    
    // Look for actual text content patterns (not PDF metadata)
    const textPatterns = [
      /[A-Z][a-z]+ [A-Z][a-z]+/g,  // Names (First Last)
      /\b[A-Za-z]{3,}\b/g,  // Words with 3+ letters
      /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g,  // Dates
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,  // Emails
      /\b[A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+\b/g,  // Three word phrases
    ];
    
    let extractedText = '';
    textPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        extractedText += ' ' + matches.join(' ');
      }
    });
    
    if (extractedText.trim().length > 0) {
      console.log('Buffer analysis found text patterns');
      return extractedText.trim();
    }
    
    console.log('Alternative OCR found no readable text content');
    return '';
  } catch (error) {
    console.log('Alternative OCR failed:', error.message);
    return '';
  }
}

/**
 * Simple fallback text extraction for very difficult PDFs
 */
async function extractTextFallback(pdfBuffer) {
  try {
    // Try with different pdf-parse options
    const data = await pdfParse(pdfBuffer, {
      max: 1, // Extract only the first page
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    if (data.text && data.text.trim().length > 0) {
      return data.text;
    }
    
    // If that fails, try with minimal options
    const data2 = await pdfParse(pdfBuffer, {
      max: 1,
      normalizeWhitespace: false,
      disableCombineTextItems: true
    });
    
    return data2.text || '';
  } catch (error) {
    console.log('Fallback extraction failed:', error.message);
    
    // Last resort: try to extract any readable text from buffer
    try {
      const text = pdfBuffer.toString('utf8');
      const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ''); // Keep printable ASCII
      const lines = readableText.split('\n').filter(line => 
        line.trim().length > 3 && /[a-zA-Z]/.test(line)
      );
      return lines.join(' ');
    } catch (bufferError) {
      console.log('Buffer extraction also failed:', bufferError.message);
      return '';
    }
  }
}

/**
 * Check available disk space
 */
async function checkDiskSpace() {
  return new Promise((resolve) => {
    try {
      require('check-disk-space').default(os.tmpdir())
        .then((diskSpace) => resolve(diskSpace.free))
        .catch(() => resolve(0)); // If check fails, assume no space
    } catch (error) {
      resolve(0); // If module not available, assume no space
    }
  });
}

/**
 * Clean and format extracted text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  // Remove excessive whitespace and line breaks
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove common PDF/OCR artifacts
  text = text.replace(/[^\w\s.,!?;:()\-@#$%&*+/=<>[\]{}'"]/g, '');
  text = text.replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2'); // Fix spaced capitals
  
  return text;
}

module.exports = {
  extractTextFromPDF,
};