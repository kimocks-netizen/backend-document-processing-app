// backend/services/aiProcessor.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAvIci1fEDUFa58BpcDUx6_W47D7umozP8');

/**
 * Process extracted text with AI for enhanced data extraction
 * @param {string} text - Raw extracted text
 * @param {string} providedDob - Date of birth provided by user (YYYY-MM-DD)
 * @returns {Promise<Object>} AI extracted structured data
 */
async function processWithAI(text, providedDob) {
  try {
    console.log('AI Processor: Starting with text length:', text.length, 'and DOB:', providedDob);
    
    // If no API key is provided, use mock data for development
    if (!process.env.GEMINI_API_KEY) {
      console.log('AI Processor: No GEMINI_API_KEY found, using mock data');
      return generateMockAIResponse(text, providedDob);
    }

    console.log('AI Processor: GEMINI_API_KEY found, proceeding with real AI processing...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      Analyze the following text extracted from a document and extract structured information.
      IMPORTANT: Use the provided date of birth (${providedDob}) for age calculation, don't try to extract DOB from the text.
      
      Look for:
      1. Personal details (name, but use provided DOB)
      2. Contact information (emails, phone numbers)
      3. Addresses
      4. Identification numbers
      5. Key dates (other than DOB)
      6. Document summary
      
      Return ONLY a JSON object with this structure:
      {
        "personalInfo": {
          "fullName": "extracted full name if found",
          "dateOfBirth": "${providedDob}",
          "age": ${calculateAgeFromDob(providedDob)}
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

    console.log('AI Processor: Sending request to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    console.log('AI Processor: Received AI response:', aiText.substring(0, 200) + '...');
    
    // Try to parse JSON from AI response
    try {
      const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/({[\s\S]*})/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiText;
      const parsedData = JSON.parse(jsonString);
      
      // Ensure we use the correct DOB and age
      parsedData.personalInfo = parsedData.personalInfo || {};
      parsedData.personalInfo.dateOfBirth = providedDob;
      parsedData.personalInfo.age = calculateAgeFromDob(providedDob);
      
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
    // Fallback to standard extraction in case of AI service failure
    return generateMockAIResponse(text, providedDob);
  }
}

/**
 * Calculate age from date of birth
 */
function calculateAgeFromDob(dobString) {
  const today = new Date();
  const birthDate = new Date(dobString);
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Generate mock AI response for demo purposes
 */
function generateMockAIResponse(text, providedDob) {
  console.log('AI Processor: Generating mock AI response for text length:', text.length, 'and DOB:', providedDob);
  
  // Simple pattern matching for demo purposes
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const phoneMatch = text.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
  const idMatch = text.match(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/);

  const mockResponse = {
    personalInfo: {
      fullName: "Extracted from document",
      dateOfBirth: providedDob,
      age: calculateAgeFromDob(providedDob)
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

  console.log('AI Processor: Mock response generated successfully:', mockResponse);
  return mockResponse;
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