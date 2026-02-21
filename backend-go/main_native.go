//go:build !js || !wasm

package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "modernc.org/sqlite"
)

func main() {
	var err error
	// Initialize local SQLite
	db, err = sql.Open("sqlite", "swse.db")
	if err != nil {
		log.Fatal("failed to open sqlite db:", err)
	}

	// Read schema.sql and execute it.
	schema, err := os.ReadFile("schema.sql")
	if err == nil {
		_, err = db.Exec(string(schema))
		if err != nil {
			log.Printf("Warning: failed to apply schema: %v", err)
		} else {
			fmt.Println("Schema applied.")
		}
	} else {
		log.Printf("Warning: schema.sql not found: %v", err)
	}

	fmt.Println("Server starting (Native)...")
	r := setupRouter()

	fmt.Println("Listening on :8787")
	if err := http.ListenAndServe(":8787", r); err != nil {
		log.Fatal(err)
	}
}
