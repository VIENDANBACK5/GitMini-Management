/*
  GITMINI PHASE 4 MIGRATION
  PR governance: reviewer approvals for protected branch merge policy.

  Safe to run on an existing development database. Does not reset data.
*/

CREATE TABLE IF NOT EXISTS pull_request_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('approved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pull_request_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_pr_reviews_pull_request ON pull_request_reviews(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer ON pull_request_reviews(reviewer_id);
