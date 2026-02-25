package main

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

var schemaCache sync.Map

// validateResourceData checks if the provided data map conforms to the schema for the given resource type.
func validateResourceData(resourceType string, data map[string]interface{}) error {
	// Check cache
	if val, ok := schemaCache.Load(resourceType); ok {
		schema := val.(*jsonschema.Schema)
		if err := schema.Validate(data); err != nil {
			return fmt.Errorf("validation failed: %v", err)
		}
		return nil
	}

	// Load from DB
	// We rely on the global 'db' variable defined in main.go
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	var schemaStr string
	err := db.QueryRow("SELECT schema FROM resource_types WHERE name = ?", resourceType).Scan(&schemaStr)
	if err == sql.ErrNoRows {
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}
	if err != nil {
		return fmt.Errorf("database error: %v", err)
	}

	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("schema.json", strings.NewReader(schemaStr)); err != nil {
		return fmt.Errorf("failed to load schema: %v", err)
	}
	schema, err := compiler.Compile("schema.json")
	if err != nil {
		return fmt.Errorf("failed to compile schema: %v", err)
	}

	schemaCache.Store(resourceType, schema)

	if err := schema.Validate(data); err != nil {
		return fmt.Errorf("validation failed: %v", err)
	}
	return nil
}
