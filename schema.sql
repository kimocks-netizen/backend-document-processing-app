-- backend/db/schema.sql
-- Create document_processing_jobs table
CREATE TABLE IF NOT EXISTS document_processing_jobs (
  id SERIAL PRIMARY KEY,
  job_id UUID NOT NULL UNIQUE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  processing_method TEXT NOT NULL CHECK (processing_method IN ('standard', 'ai')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  raw_text TEXT,
  ai_extracted_data JSONB,
  full_name TEXT,
  age INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_id ON document_processing_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON document_processing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_status ON document_processing_jobs(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_document_processing_jobs_updated_at
    BEFORE UPDATE ON document_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE document_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public insert" ON document_processing_jobs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON document_processing_jobs
    FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON document_processing_jobs
    FOR UPDATE USING (true);

-- Create storage bucket for files (run this in Supabase dashboard if not exists)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('my-files', 'my-files', true);

-- Create storage policies
CREATE POLICY "Allow public upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'my-files');

CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'my-files');