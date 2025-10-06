-- ===== COLLABORATION CALENDAR SYSTEM DATABASE SCHEMA =====
-- Execute this SQL in Supabase SQL Editor to create the collaboration system tables

-- Table 1: Creator Availability
CREATE TABLE IF NOT EXISTS creator_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    max_requests_per_slot INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_max_requests CHECK (max_requests_per_slot > 0)
);

-- Indexes for creator_availability
CREATE INDEX IF NOT EXISTS idx_creator_availability_creator_id ON creator_availability(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_availability_dates ON creator_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_creator_availability_is_available ON creator_availability(is_available);

-- Table 2: Collaboration Requests
CREATE TABLE IF NOT EXISTS collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    availability_id UUID NOT NULL REFERENCES creator_availability(id) ON DELETE CASCADE,
    proposed_start_date TIMESTAMPTZ NOT NULL,
    proposed_end_date TIMESTAMPTZ NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    response_message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_proposed_dates CHECK (proposed_end_date > proposed_start_date),
    CONSTRAINT no_self_collaboration CHECK (requester_id != creator_id)
);

-- Indexes for collaboration_requests
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_requester ON collaboration_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_creator ON collaboration_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_availability ON collaboration_requests(availability_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_status ON collaboration_requests(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_requests_dates ON collaboration_requests(proposed_start_date, proposed_end_date);

-- Table 3: Enhanced profiles fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_decline_unavailable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS min_notice_days INTEGER DEFAULT 7;

-- ===== ROW LEVEL SECURITY (RLS) POLICIES =====

-- Enable RLS on tables
ALTER TABLE creator_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_availability
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view creator availability" ON creator_availability;
DROP POLICY IF EXISTS "Users can insert their own availability" ON creator_availability;
DROP POLICY IF EXISTS "Users can update their own availability" ON creator_availability;
DROP POLICY IF EXISTS "Users can delete their own availability" ON creator_availability;

-- Create new policies
CREATE POLICY "Users can view creator availability" 
    ON creator_availability FOR SELECT USING (true);

CREATE POLICY "Users can insert their own availability" 
    ON creator_availability FOR INSERT 
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own availability" 
    ON creator_availability FOR UPDATE 
    USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own availability" 
    ON creator_availability FOR DELETE 
    USING (auth.uid() = creator_id);

-- RLS Policies for collaboration_requests
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view collaboration requests they're involved in" ON collaboration_requests;
DROP POLICY IF EXISTS "Users can insert collaboration requests" ON collaboration_requests;
DROP POLICY IF EXISTS "Creators can update requests they receive" ON collaboration_requests;

-- Create new policies
CREATE POLICY "Users can view collaboration requests they're involved in" 
    ON collaboration_requests FOR SELECT 
    USING (auth.uid() = creator_id OR auth.uid() = requester_id);

CREATE POLICY "Users can insert collaboration requests" 
    ON collaboration_requests FOR INSERT 
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Creators can update requests they receive" 
    ON collaboration_requests FOR UPDATE 
    USING (auth.uid() = creator_id);

-- ===== TRIGGERS =====

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to creator_availability
DROP TRIGGER IF EXISTS update_creator_availability_updated_at ON creator_availability;
CREATE TRIGGER update_creator_availability_updated_at
    BEFORE UPDATE ON creator_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to collaboration_requests
DROP TRIGGER IF EXISTS update_collaboration_requests_updated_at ON collaboration_requests;
CREATE TRIGGER update_collaboration_requests_updated_at
    BEFORE UPDATE ON collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== SAMPLE DATA (Optional - for testing) =====

-- Insert sample availability slots (uncomment to use)
/*
INSERT INTO creator_availability (creator_id, start_date, end_date, max_requests_per_slot, notes)
SELECT 
    id as creator_id,
    NOW() + INTERVAL '7 days' as start_date,
    NOW() + INTERVAL '7 days' + INTERVAL '8 hours' as end_date,
    3 as max_requests_per_slot,
    'Available for music collaborations' as notes
FROM profiles 
WHERE role = 'creator' 
LIMIT 5;
*/

-- ===== VERIFICATION QUERIES =====

-- Check if tables were created successfully
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('creator_availability', 'collaboration_requests')
ORDER BY tablename;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('creator_availability', 'collaboration_requests')
ORDER BY tablename, policyname;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('creator_availability', 'collaboration_requests')
ORDER BY tablename, indexname;

-- ===== CLEANUP (if needed) =====
/*
-- Uncomment to drop tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS collaboration_requests CASCADE;
DROP TABLE IF EXISTS creator_availability CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS collaboration_enabled;
ALTER TABLE profiles DROP COLUMN IF EXISTS auto_decline_unavailable;
ALTER TABLE profiles DROP COLUMN IF EXISTS min_notice_days;
*/
