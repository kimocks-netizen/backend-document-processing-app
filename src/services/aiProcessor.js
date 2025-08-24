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

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      Analyze the following text extracted from a document and extract structured information.
      Look for personal details, contact information, dates, addresses, and any other relevant information.
      
      Return ONLY a JSON object with this structure:
      {
        "personalInfo": {
          "fullName": "extracted full name",
          "dateOfBirth": "extracted date of birth",
          "age": calculated age if possible
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
      ${text.substring(0, 3000)} // Limit text length to avoid token limits
    `;

    console.log('Sending request to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    console.log('Received AI response:', aiText.substring(0, 200) + '...');
    
    // Try to parse JSON from AI response
    try {
      // Extract JSON from response (AI might wrap it in markdown code blocks)
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
    // Fallback to mock data in case of AI service failure
    return generateMockAIResponse(text);
  }
}

/**
 * Generate mock AI response for demo purposes
 */
function generateMockAIResponse(text) {
  console.log('Generating mock AI response for text length:', text.length);
  
  // Simple pattern matching for demo purposes
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const phoneMatch = text.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const idMatch = text.match(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/); // Simple SSN pattern

  return {
    personalInfo: {
      fullName: "Extracted from document",
      dateOfBirth: extractDateFromText(text),
      age: Math.floor(Math.random() * 50) + 18
    },
    contactInfo: {
      emails: emailMatch ? [emailMatch[0]] : [],
      phoneNumbers: phoneMatch ? [phoneMatch[0]] : []
    },
    addresses: extractAddressesFromText(text),
    identificationNumbers: idMatch ? [idMatch[0]] : [],
    keyDates: extractDatesFromText(text),
    summary: "This is a mock AI extraction demonstrating structured data extraction capabilities. Provide a real Gemini API key for actual AI processing.",
    note: "Mock data - real AI processing requires GEMINI_API_KEY"
  };
}

/**
 * Extract dates from text
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
  
  return dates.slice(0, 5);
}

/**
 * Extract a single date from text (for DOB)
 */
function extractDateFromText(text) {
  const dates = extractDatesFromText(text);
  return dates.length > 0 ? dates[0] : "Not found";
}

/**
 * Extract addresses from text
 */
function extractAddressesFromText(text) {
  // Basic address pattern matching
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