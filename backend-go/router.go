package main

import (
	_ "embed"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

//go:embed docs/openapi.yaml
var openAPIContent []byte

//go:embed docs/index.html
var apiHTMLContent []byte

func setupRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(LoggerMiddleware)
	r.Use(middleware.Recoverer)
	r.Use(AuthMiddleware)

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

	// Ships
	r.Get("/ships", listResourcesHandler("ship"))
	r.Post("/ships", createResourceHandler("ship"))
	r.Get("/ships/{resourceID}", getResourceHandler)
	r.Put("/ships/{resourceID}", updateResourceHandler)
	r.Delete("/ships/{resourceID}", deleteResourceHandler)
	r.Patch("/ships/{resourceID}/share", shareResourceHandler)

	// Libraries
	r.Get("/libraries", listResourcesHandler("library"))
	r.Post("/libraries", createResourceHandler("library"))
	r.Get("/libraries/{resourceID}", getResourceHandler)
	r.Put("/libraries/{resourceID}", updateResourceHandler)
	r.Delete("/libraries/{resourceID}", deleteResourceHandler)
	r.Patch("/libraries/{resourceID}/share", shareResourceHandler)

	// Hangars
	r.Get("/hangars", listResourcesHandler("hangar"))
	r.Post("/hangars", createResourceHandler("hangar"))
	r.Get("/hangars/{resourceID}", getResourceHandler)
	r.Put("/hangars/{resourceID}", updateResourceHandler)
	r.Delete("/hangars/{resourceID}", deleteResourceHandler)
	r.Patch("/hangars/{resourceID}/share", shareResourceHandler)

	// Configurations
	r.Get("/configurations", listResourcesHandler("config"))
	r.Post("/configurations", createResourceHandler("config"))
	r.Get("/configurations/{resourceID}", getResourceHandler)
	r.Put("/configurations/{resourceID}", updateResourceHandler)
	r.Delete("/configurations/{resourceID}", deleteResourceHandler)
	r.Patch("/configurations/{resourceID}/share", shareResourceHandler)

	return r
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
