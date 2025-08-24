// backend/services/supabaseService.js
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL || "https://biklzpyuarncssdbwfmk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Store uploaded file in Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Public URL of the stored file
 */
async function storeFile(fileBuffer, fileName, mimeType) {
  const fileExt = fileName.split('.').pop();
  const filePath = `${uuidv4()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('my-files')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('my-files')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Store document metadata and processing results in Supabase
 * @param {Object} params - Document and processing data
 * @returns {Promise<string>} Job ID
 */
async function storeDocumentMetadata(params) {
  const {
    jobId,
    fileUrl,
    fileName,
    mimeType,
    userData,
    processingMethod,
    status = 'processing'
  } = params;

  const { data, error } = await supabase
    .from('document_processing_jobs')
    .insert([
      {
        job_id: jobId,
        file_url: fileUrl,
        file_name: fileName,
        mime_type: mimeType,
        first_name: userData.firstName,
        last_name: userData.lastName,
        date_of_birth: userData.dob,
        processing_method: processingMethod,
        status: status,
        created_at: new Date().toISOString(),
      }
    ])
    .select();

  if (error) {
    throw new Error(`Failed to store document metadata: ${error.message}`);
  }

  return jobId;
}

/**
 * Update processing results in Supabase
 * @param {string} jobId - Job identifier
 * @param {Object} results - Processing results
 */
async function updateProcessingResults(jobId, results) {
  const { error } = await supabase
    .from('document_processing_jobs')
    .update({
      status: 'completed',
      raw_text: results.rawText,
      ai_extracted_data: results.aiExtractedData,
      full_name: results.fullName,
      age: results.age,
      completed_at: new Date().toISOString(),
    })
    .eq('job_id', jobId);

  if (error) {
    throw new Error(`Failed to update processing results: ${error.message}`);
  }
}

/**
 * Get processing result by job ID
 * @param {string} jobId - Job identifier
 * @returns {Promise<Object|null>} Processing result or null if not found
 */
async function getProcessingResult(jobId) {
  const { data, error } = await supabase
    .from('document_processing_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows found
      return null;
    }
    throw new Error(`Failed to fetch processing result: ${error.message}`);
  }

  return {
    jobId: data.job_id,
    status: data.status,
    fullName: data.full_name || `${data.first_name} ${data.last_name}`,
    age: data.age,
    rawText: data.raw_text,
    aiExtractedData: data.ai_extracted_data,
    processingMethod: data.processing_method,
    fileName: data.file_name,
  };
}

/**
 * Get all processing jobs from Supabase
 * @returns {Promise<Array>} Array of processing jobs
 */
async function getAllProcessingJobs() {
  const { data, error } = await supabase
    .from('document_processing_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch processing jobs: ${error.message}`);
  }

  return data.map(job => ({
    jobId: job.job_id,
    fileName: job.file_name,
    fullName: job.full_name || `${job.first_name} ${job.last_name}`,
    status: job.status,
    processingMethod: job.processing_method,
    createdAt: job.created_at
  }));
}

module.exports = {
  storeFile,
  storeDocumentMetadata,
  updateProcessingResults,
  getProcessingResult,
  getAllProcessingJobs,
  
};