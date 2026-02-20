package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/syumai/workers"
	"github.com/syumai/workers/cloudflare/d1"
)

var db *sql.DB

func main() {
	var err error
	// Initialize D1
	connector, err := d1.OpenConnector("DB")
	if err != nil {
		log.Fatal("failed to open d1 connector:", err)
	}
	db = sql.OpenDB(connector)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(AuthMiddleware)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status": "ok"}`))
	})

	r.Post("/auth/register", registerHandler)
	r.Post("/auth/login", loginHandler)
	r.Get("/auth/google", authGoogleHandler)

	r.Get("/ships", listShipsHandler)
	r.Post("/ships", createShipHandler)
	r.Patch("/ships/{shipID}/share", shareShipHandler)

	workers.Serve(r)
}
