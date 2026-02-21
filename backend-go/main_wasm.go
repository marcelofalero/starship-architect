//go:build js && wasm

package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/syumai/workers"
	"github.com/syumai/workers/cloudflare/d1"
)

func main() {
	var err error
	// Initialize D1
	connector, err := d1.OpenConnector("DB")
	if err != nil {
		log.Fatal("failed to open d1 connector:", err)
	}
	db = sql.OpenDB(connector)

	fmt.Println("Server starting (WASM)...")

	r := setupRouter()

	workers.Serve(r)
}
