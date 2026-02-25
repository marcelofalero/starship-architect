package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type ResourceType struct {
	Name      string          `json:"name"`
	Schema    json.RawMessage `json:"schema"`
	CreatedAt int64           `json:"created_at"`
}

func initTypes(db *sql.DB) {
	// Check if empty
	var count int
	err := db.QueryRow("SELECT count(*) FROM resource_types").Scan(&count)
	if err != nil {
		// Table might not exist yet if schema wasn't applied, but entrypoint applies it.
		// If running tests without full DB setup, this might fail.
		// For safety we log and return.
		log.Printf("Warning: initTypes check failed: %v", err)
		return
	}
	if count > 0 {
		return
	}

	// Insert defaults
	// We use plural names to match the REST API endpoints (e.g. /ships, /libraries)
	types := map[string]string{
		"ships":          `{"type": "object", "properties": {"configuration": {"type": "object"}, "manifest": {"type": "array"}}, "required": ["configuration", "manifest"]}`,
		"libraries":      `{"type": "object", "properties": {"components": {"type": "array"}, "ships": {"type": "array"}}}`,
		"hangars":        `{"type": "object", "properties": {"ships": {"type": "array"}}, "required": ["ships"]}`,
		"configurations": `{"type": "object"}`,
	}

	for name, schema := range types {
		_, err := db.Exec("INSERT INTO resource_types (name, schema) VALUES (?, ?)", name, schema)
		if err != nil {
			log.Printf("Failed to insert default type %s: %v", name, err)
		}
	}
}

func listTypesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT name, schema, created_at FROM resource_types")
	if err != nil {
		log.Printf("List types error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var types []ResourceType
	for rows.Next() {
		var t ResourceType
		var schemaStr string
		if err := rows.Scan(&t.Name, &schemaStr, &t.CreatedAt); err != nil {
			continue
		}
		t.Schema = json.RawMessage(schemaStr)
		types = append(types, t)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(types)
}

func createTypeHandler(w http.ResponseWriter, r *http.Request) {
	user := GetCurrentUser(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var t ResourceType
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	schemaBytes, _ := t.Schema.MarshalJSON()
	// Validate that schema is valid JSON? The DB check constraint handles it, but good to catch early.
	// We rely on DB constraint.

	_, err := db.Exec("INSERT INTO resource_types (name, schema) VALUES (?, ?)", t.Name, string(schemaBytes))
	if err != nil {
		log.Printf("Create type error: %v", err)
		http.Error(w, "Database error or duplicate type", http.StatusInternalServerError)
		return
	}

	// Invalidate cache
	schemaCache.Delete(t.Name)

	w.WriteHeader(http.StatusCreated)
}

func getTypeHandler(w http.ResponseWriter, r *http.Request) {
	typeName := chi.URLParam(r, "typeName")
	var t ResourceType
	var schemaStr string
	err := db.QueryRow("SELECT name, schema, created_at FROM resource_types WHERE name = ?", typeName).Scan(&t.Name, &schemaStr, &t.CreatedAt)
	if err == sql.ErrNoRows {
		http.Error(w, "Type not found", http.StatusNotFound)
		return
	}
	t.Schema = json.RawMessage(schemaStr)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(t)
}
