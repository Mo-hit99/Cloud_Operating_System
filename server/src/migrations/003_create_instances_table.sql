-- Create instances table
CREATE TABLE IF NOT EXISTS instances (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    container_id VARCHAR(255),
    container_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_started TIMESTAMP WITH TIME ZONE,
    access_url TEXT,
    ports JSONB,
    specs JSONB,
    UNIQUE(container_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON instances(user_id);
CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_template_id ON instances(template_id);