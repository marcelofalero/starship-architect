package main

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/syumai/workers"
	"github.com/syumai/workers/cloudflare/d1"
)

//go:embed docs/openapi.yaml
var openAPIContent []byte

//go:embed docs/index.html
var apiHTMLContent []byte

func main() {
	var err error
	// Initialize D1
	connector, err := d1.OpenConnector("DB")
	if err != nil {
		log.Fatal("failed to open d1 connector:", err)
	}
	db = sql.OpenDB(connector)

	// Initialize default types
	initTypes(db)

	r := chi.NewRouter()
	r.Use(LoggerMiddleware)
	r.Use(middleware.Recoverer)
	r.Use(AuthMiddleware)

	fmt.Println("Server starting...")

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status": "ok"}`))
	})

	// Docs
	r.Get("/docs/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/yaml")
		w.Write(openAPIContent)
	})
	r.Get("/docs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write(apiHTMLContent)
	})

	r.Post("/auth/register", registerHandler)
	r.Post("/auth/login", loginHandler)
	r.Get("/auth/google", authGoogleHandler)

	// Types API
	r.Get("/types", listTypesHandler)
	r.Post("/types", createTypeHandler)
	r.Get("/types/{typeName}", getTypeHandler)

	// Generic Resource API
	r.Route("/{resourceType}", func(r chi.Router) {
		r.Get("/", listResourcesHandler)
		r.Post("/", createResourceHandler)
		r.Route("/{resourceID}", func(r chi.Router) {
			r.Get("/", getResourceHandler)
			r.Put("/", updateResourceHandler)
			r.Delete("/", deleteResourceHandler)
			r.Patch("/share", shareResourceHandler)
		})
	})

	workers.Serve(r)
}

func LoggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		t1 := time.Now()
		defer func() {
			fmt.Printf("%s %s %d %v\n", r.Method, r.URL.Path, ww.Status(), time.Since(t1))
		}()
		next.ServeHTTP(ww, r)
	})
}
