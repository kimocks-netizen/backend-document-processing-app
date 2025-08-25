// backend/services/aiProcessor.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process extracted text with AI for enhanced data extraction
 * @param {string} text - Raw extracted text
 * @returns {Promise<Object>} AI extracted structured data
 */
async function processWithAI(text) {
  try {
    // If no API key is provided, use mock data for development
    if (!process.env.GEMINI_API_KEY) {
      console.log('Using mock AI data - provide GEMINI_API_KEY for real AI processing');
      return generateMockAIResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
    Analyze the following text extracted from a document and extract important information.

    Look for:
    1. Important information (names, dates)
    2. Contact information (emails, phone numbers)
    3. Addresses
    4. Identification numbers
    5. Important dates
    6. Document summary

    Return ONLY a JSON object with this structure:
    {
      "importantInfo": {
        "fullName": "extracted full name if found",
        "dateOfBirth": "extracted date if found"
      },
      "contactInfo": {
        "emails": ["email1", "email2"],
        "phoneNumbers": ["phone1", "phone2"]
      },
      "addresses": ["address1", "address2"],
      "identificationNumbers": ["id1", "id2"],
      "keyDates": ["date1", "date2"],
      "summary": "brief summary of the document content"
    }

    Text to analyze:
    ${text.substring(0, 3000)}
    `;

    console.log('Sending request to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    console.log('Received AI response:', aiText.substring(0, 200) + '...');
    
    // Try to parse JSON from AI response
    try {
      const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiText;
      const parsedData = JSON.parse(jsonString);
      
      console.log('Successfully parsed AI response');
      return parsedData;
    } catch (parseError) {
      console.warn('AI response was not valid JSON, returning raw text:', parseError);
      return { 
        rawResponse: aiText,
        error: "AI response could not be parsed as JSON",
        extractedData: aiText 
      };
    }
  } catch (error) {
    console.error('Error processing with AI:', error);
    return generateMockAIResponse(text);
  }
}

/**
 * Generate mock AI response
 */
function generateMockAIResponse(text) {
  console.log('Generating mock AI response for text length:', text.length);
  
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const phoneMatch = text.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const idMatch = text.match(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/);

  return {
    importantInfo: {
      fullName: "Extracted from document",
      dateOfBirth: "Not found"
    },
    contactInfo: {
      emails: emailMatch ? [emailMatch[0]] : [],
      phoneNumbers: phoneMatch ? [phoneMatch[0]] : []
    },
    addresses: extractAddressesFromText(text),
    identificationNumbers: idMatch ? [idMatch[0]] : [],
    keyDates: extractDatesFromText(text),
    summary: "This is a mock AI extraction. Provide a real Gemini API key for actual AI processing.",
    note: "Mock data - real AI processing requires GEMINI_API_KEY"
  };
}

/**
 * Extract dates from text
 */
function extractDatesFromText(text) {
  const datePatterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g
  ];
  
  const dates = [];
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  });
  
  return dates.slice(0, 5);
}

/**
 * Extract addresses from text
 */
function extractAddressesFromText(text) {
  const addressPatterns = [
    /\b\d+\s+[\w\s]+,?\s+(?:Ave|St|Rd|Blvd|Dr|Ln)\.?,?\s+[\w\s]+,?\s+[A-Z]{2},?\s+\d{5}\b/gi,
    /\bP\.?O\.?\s+Box\s+\d+\b/gi,
    /\b\d+\s+[\w\s]+\s+(?:Street|Avenue|Road|Boulevard|Drive|Lane)\b/gi
  ];
  
  const addresses = [];
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) addresses.push(...matches);
  });
  
  return addresses.slice(0, 3);
}

module.exports = {
  processWithAI,
};