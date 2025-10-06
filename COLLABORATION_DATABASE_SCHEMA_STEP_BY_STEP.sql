-- ===== COLLABORATION CALENDAR SYSTEM - STEP BY STEP SETUP =====
-- Execute these commands one by one in Supabase SQL Editor

-- ===== STEP 1: CREATE TABLES =====

-- Table 1: Creator Availability
CREATE TABLE creator_availability (
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

-- ===== STEP 2: CREATE COLLABORATION REQUESTS TABLE =====

-- Table 2: Collaboration Requests
CREATE TABLE collaboration_requests (
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

-- ===== STEP 3: ADD PROFILE COLUMNS =====

-- Enhanced profiles fields
ALTER TABLE profiles 
ADD COLUMN collaboration_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN auto_decline_unavailable BOOLEAN DEFAULT TRUE,
ADD COLUMN min_notice_days INTEGER DEFAULT 7;

-- ===== STEP 4: CREATE INDEXES =====

-- Indexes for creator_availability
CREATE INDEX idx_creator_availability_creator_id ON creator_availability(creator_id);
CREATE INDEX idx_creator_availability_dates ON creator_availability(start_date, end_date);
CREATE INDEX idx_creator_availability_is_available ON creator_availability(is_available);

-- Indexes for collaboration_requests
CREATE INDEX idx_collaboration_requests_requester ON collaboration_requests(requester_id);
CREATE INDEX idx_collaboration_requests_creator ON collaboration_requests(creator_id);
CREATE INDEX idx_collaboration_requests_availability ON collaboration_requests(availability_id);
CREATE INDEX idx_collaboration_requests_status ON collaboration_requests(status);
CREATE INDEX idx_collaboration_requests_dates ON collaboration_requests(proposed_start_date, proposed_end_date);

-- ===== STEP 5: ENABLE ROW LEVEL SECURITY =====

-- Enable RLS on tables
ALTER TABLE creator_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;

-- ===== STEP 6: CREATE RLS POLICIES FOR CREATOR_AVAILABILITY =====

-- RLS Policies for creator_availability
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

-- ===== STEP 7: CREATE RLS POLICIES FOR COLLABORATION_REQUESTS =====

-- RLS Policies for collaboration_requests
CREATE POLICY "Users can view collaboration requests they're involved in" 
    ON collaboration_requests FOR SELECT 
    USING (auth.uid() = creator_id OR auth.uid() = requester_id);

CREATE POLICY "Users can insert collaboration requests" 
    ON collaboration_requests FOR INSERT 
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Creators can update requests they receive" 
    ON collaboration_requests FOR UPDATE 
    USING (auth.uid() = creator_id);

-- ===== STEP 8: CREATE TRIGGERS =====

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to creator_availability
CREATE TRIGGER update_creator_availability_updated_at
    BEFORE UPDATE ON creator_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to collaboration_requests
CREATE TRIGGER update_collaboration_requests_updated_at
    BEFORE UPDATE ON collaboration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== STEP 9: VERIFICATION =====

-- Verify tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('creator_availability', 'collaboration_requests')
ORDER BY tablename;

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('creator_availability', 'collaboration_requests')
ORDER BY tablename, policyname;

-- ===== SUCCESS MESSAGE =====
-- If you see results from the verification queries above, 
-- the collaboration system database is ready! 🎉
