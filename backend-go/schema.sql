CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_types (
    name TEXT PRIMARY KEY,
    schema TEXT NOT NULL CHECK(json_valid(schema)),
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT,
    type TEXT NOT NULL,
    data TEXT CHECK(json_valid(data)),
    visibility TEXT DEFAULT 'private' CHECK(visibility IN ('private', 'group', 'public')),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS permissions (
    target_id TEXT NOT NULL,
    grantee_id TEXT NOT NULL,
    grantee_type TEXT DEFAULT 'user' CHECK(grantee_type IN ('user', 'group', 'app')),
    access_level TEXT NOT NULL CHECK(access_level IN ('read', 'write', 'admin')),
    created_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (target_id, grantee_id, grantee_type),
    FOREIGN KEY (target_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS update_resources_timestamp
AFTER UPDATE ON resources
BEGIN
    UPDATE resources SET updated_at = unixepoch() WHERE id = OLD.id;
END;
