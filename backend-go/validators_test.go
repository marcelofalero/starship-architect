package main

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func TestValidateResourceData(t *testing.T) {
	// Setup in-memory DB
	var err error
	db, err = sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open db: %v", err)
	}
	defer db.Close()

	// Create table
	_, err = db.Exec(`CREATE TABLE resource_types (name TEXT, schema TEXT)`)
	if err != nil {
		t.Fatalf("Failed to create table: %v", err)
	}

	// Insert type
	_, err = db.Exec(`INSERT INTO resource_types (name, schema) VALUES ('test', '{"type": "object", "properties": {"foo": {"type": "string"}}}')`)
	if err != nil {
		t.Fatalf("Failed to insert type: %v", err)
	}

	// Valid data
	err = validateResourceData("test", map[string]interface{}{"foo": "bar"})
	if err != nil {
		t.Errorf("Expected valid, got error: %v", err)
	}

	// Invalid data
	err = validateResourceData("test", map[string]interface{}{"foo": 123})
	if err == nil {
		t.Error("Expected invalid, got nil")
	}

	// Unknown type
	err = validateResourceData("unknown", map[string]interface{}{})
	if err == nil {
		t.Error("Expected error for unknown type, got nil")
	}
}
