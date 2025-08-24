// backend/services/aiProcessor.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAvIci1fEDUFa58BpcDUx6_W47D7umozP8');

/**
 * Process extracted text with AI for enhanced data extraction
 * @param {string} text - Raw extracted text
 * @returns {Promise<Object>} AI extracted structured data
 */
async function processWithAI(text) {
  try {
    // For demo purposes, if no API key is provided, return mock data
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'AIzaSyAvIci1fEDUFa58BpcDUx6_W47D7umozP8') {
      return generateMockAIResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      Analyze the following text extracted from a document and extract structured information.
      Look for personal details like name, address, contact information, identification numbers,
      dates, and any other relevant information.
      
      Return the response as a JSON object with appropriate fields.
      
      Text to analyze:
      ${text.substring(0, 3000)} // Limit text length to avoid token limits
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    // Try to parse JSON from AI response
    try {
      // Extract JSON from response (AI might wrap it in markdown code blocks)
      const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiText;
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.warn('AI response was not valid JSON, returning raw text');
      return { extractedData: aiText };
    }
  } catch (error) {
    console.error('Error processing with AI:', error);
    // Fallback to mock data in case of AI service failure
    return generateMockAIResponse(text);
  }
}

/**
 * Generate mock AI response for demo purposes
 * @param {string} text - Raw extracted text
 * @returns {Object} Mock AI extracted data
 */
function generateMockAIResponse(text) {
  // Simple pattern matching for demo purposes
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const phoneMatch = text.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const idMatch = text.match(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/); // Simple SSN pattern

  return {
    extractedData: {
      emails: emailMatch ? [emailMatch[0]] : [],
      phoneNumbers: phoneMatch ? [phoneMatch[0]] : [],
      identificationNumbers: idMatch ? [idMatch[0]] : [],
      keyDates: extractDatesFromText(text),
      addresses: extractAddressesFromText(text),
      summary: "This is a mock AI extraction. Provide a real Gemini API key for actual AI processing."
    }
  };
}

/**
 * Extract dates from text (simple implementation for demo)
 */
function extractDatesFromText(text) {
  const datePatterns = [
    /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi,
    /\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\b/g
  ];
  
  const dates = [];
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  });
  
  return dates.slice(0, 5); // Return max 5 dates
}

/**
 * Extract addresses from text (simple implementation for demo)
 */
function extractAddressesFromText(text) {
  // Very basic address pattern matching
  const addressPattern = /\b\d+\s+[\w\s]+,?\s+(?:Ave|St|Rd|Blvd|Dr|Ln)\.?,?\s+[\w\s]+,?\s+[A-Z]{2},?\s+\d{5}\b/gi;
  const matches = text.match(addressPattern);
  return matches ? matches : [];
}

module.exports = {
  processWithAI,
};