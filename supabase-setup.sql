-- Survey Voting App - Supabase Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create surveys table
CREATE TABLE surveys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create images table
CREATE TABLE images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_images_survey_id ON images(survey_id);
CREATE INDEX idx_votes_survey_id ON votes(survey_id);
CREATE INDEX idx_votes_image_id ON votes(image_id);

-- Enable Row Level Security (RLS)
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for this prototype
-- Surveys: Allow read and insert for everyone
CREATE POLICY "Allow public read access on surveys"
    ON surveys FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access on surveys"
    ON surveys FOR INSERT
    WITH CHECK (true);

-- Images: Allow read and insert for everyone
CREATE POLICY "Allow public read access on images"
    ON images FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access on images"
    ON images FOR INSERT
    WITH CHECK (true);

-- Votes: Allow read and insert for everyone
CREATE POLICY "Allow public read access on votes"
    ON votes FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access on votes"
    ON votes FOR INSERT
    WITH CHECK (true);

-- Storage bucket setup instructions:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Create a new bucket called "survey-images"
-- 3. Make it PUBLIC (toggle public access on)
-- 4. Add this policy for uploads (in bucket policies):
--    - Policy name: "Allow public uploads"
--    - Allowed operation: INSERT
--    - Policy definition: true
--
-- Or run this SQL for storage policies:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('survey-images', 'survey-images', true);
