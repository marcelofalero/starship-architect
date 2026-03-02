package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

func getBasePath(resourceType string) string {
	// Generic base path is just /{resourceType}
	// Note: Existing frontend might expect plural forms (e.g. /ships).
	// Ideally the type name in DB should be plural if that's the convention,
	// or we map it. For a generic engine, we use the type name as the path.
	return "/" + resourceType
}

// listResourcesHandler
func listResourcesHandler(w http.ResponseWriter, r *http.Request) {
	resourceType := chi.URLParam(r, "resourceType")
	if resourceType == "" {
		http.Error(w, "Resource type required", http.StatusBadRequest)
		return
	}

	user := GetCurrentUser(r)
	var userID string
	if user != nil {
		userID = user.ID
	}

	var rows *sql.Rows
	var err error

	if userID != "" {
		query := `
            SELECT s.id, s.owner_id, s.name, s.type, s.data, s.visibility, s.created_at, s.updated_at,
            MAX(CASE
                WHEN s.owner_id = ? THEN 3
                WHEN p.access_level = 'admin' THEN 3
                WHEN p.access_level = 'write' THEN 2
                WHEN p.access_level = 'read' THEN 1
                ELSE 0
            END) as access_rank
            FROM resources s
            LEFT JOIN permissions p ON s.id = p.target_id
            LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
            WHERE s.type = ? AND (
               s.visibility = 'public'
               OR s.owner_id = ?
               OR (p.grantee_id = ? AND p.grantee_type = 'user')
               OR (gm.user_id = ?)
            )
            GROUP BY s.id
            `
		rows, err = db.Query(query, userID, resourceType, userID, userID, userID)
	} else {
		query := `SELECT id, owner_id, name, type, data, visibility, created_at, updated_at, 0 as access_rank FROM resources WHERE type = ? AND visibility = 'public'`
		rows, err = db.Query(query, resourceType)
	}

	if err != nil {
		log.Printf("Query error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resources := []Resource{}
	for rows.Next() {
		var s Resource
		var dataStr string
		var accessRank int
		if err := rows.Scan(&s.ID, &s.OwnerID, &s.Name, &s.Type, &dataStr, &s.Visibility, &s.CreatedAt, &s.UpdatedAt, &accessRank); err != nil {
			continue
		}
		json.Unmarshal([]byte(dataStr), &s.Data)

		basePath := getBasePath(s.Type)

		links := map[string]Link{
			"self": {Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "self", Method: "GET"},
		}
		if accessRank >= 2 {
			links["update"] = Link{Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "update", Method: "PUT"}
		}
		if accessRank >= 3 {
			links["share"] = Link{Href: fmt.Sprintf("%s/%s/share", basePath, s.ID), Rel: "share", Method: "PATCH"}
			links["delete"] = Link{Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "delete", Method: "DELETE"}
		}
		s.Links = links
		resources = append(resources, s)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resources)
}

// createResourceHandler
func createResourceHandler(w http.ResponseWriter, r *http.Request) {
	resourceType := chi.URLParam(r, "resourceType")
	if resourceType == "" {
		http.Error(w, "Resource type required", http.StatusBadRequest)
		return
	}

	user := GetCurrentUser(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	var req CreateResource
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate type matches URL param? Or we trust URL param.
	// We force the type to be the URL param.
	req.Type = resourceType

	if err := validateResourceData(resourceType, req.Data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	resourceID := generateUUID()
	dataBytes, _ := json.Marshal(req.Data)

	_, err := db.Exec("INSERT INTO resources (id, owner_id, name, type, data, visibility) VALUES (?, ?, ?, ?, ?, ?)",
		resourceID, user.ID, req.Name, req.Type, string(dataBytes), req.Visibility)

	if err != nil {
		log.Printf("Insert resource error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	basePath := getBasePath(req.Type)

	links := map[string]Link{
		"self":   {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "self", Method: "GET"},
		"update": {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "update", Method: "PUT"},
		"share":  {Href: fmt.Sprintf("%s/%s/share", basePath, resourceID), Rel: "share", Method: "PATCH"},
		"delete": {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "delete", Method: "DELETE"},
	}

	resp := Resource{
		ID:         resourceID,
		OwnerID:    user.ID,
		Name:       req.Name,
		Type:       req.Type,
		Data:       req.Data,
		Visibility: req.Visibility,
		CreatedAt:  time.Now().Unix(),
		UpdatedAt:  time.Now().Unix(),
		Links:      links,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// getResourceHandler
func getResourceHandler(w http.ResponseWriter, r *http.Request) {
	user := GetCurrentUser(r)
	resourceID := chi.URLParam(r, "resourceID")
	// urlType := chi.URLParam(r, "resourceType") // Optional: verify matches DB

	var userID string
	if user != nil {
		userID = user.ID
	}

	var s Resource
	var dataStr string
	var accessRank int
	var query string

	if userID != "" {
		query = `
            SELECT s.id, s.owner_id, s.name, s.type, s.data, s.visibility, s.created_at, s.updated_at,
            MAX(CASE
                WHEN s.owner_id = ? THEN 3
                WHEN p.access_level = 'admin' THEN 3
                WHEN p.access_level = 'write' THEN 2
                WHEN p.access_level = 'read' THEN 1
                ELSE 0
            END) as access_rank
            FROM resources s
            LEFT JOIN permissions p ON s.id = p.target_id
            LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
            WHERE s.id = ? AND (
               s.visibility = 'public'
               OR s.owner_id = ?
               OR (p.grantee_id = ? AND p.grantee_type = 'user')
               OR (gm.user_id = ?)
            )
            GROUP BY s.id
        `
		err := db.QueryRow(query, userID, resourceID, userID, userID, userID).Scan(&s.ID, &s.OwnerID, &s.Name, &s.Type, &dataStr, &s.Visibility, &s.CreatedAt, &s.UpdatedAt, &accessRank)
		if err == sql.ErrNoRows {
			http.Error(w, "Resource not found or access denied", http.StatusNotFound)
			return
		}
	} else {
		query = `SELECT id, owner_id, name, type, data, visibility, created_at, updated_at, 0 as access_rank FROM resources WHERE id = ? AND visibility = 'public'`
		err := db.QueryRow(query, resourceID).Scan(&s.ID, &s.OwnerID, &s.Name, &s.Type, &dataStr, &s.Visibility, &s.CreatedAt, &s.UpdatedAt, &accessRank)
		if err == sql.ErrNoRows {
			http.Error(w, "Resource not found", http.StatusNotFound)
			return
		}
	}

	json.Unmarshal([]byte(dataStr), &s.Data)
	basePath := getBasePath(s.Type)

	links := map[string]Link{
		"self": {Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "self", Method: "GET"},
	}
	if accessRank >= 2 {
		links["update"] = Link{Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "update", Method: "PUT"}
	}
	if accessRank >= 3 {
		links["share"] = Link{Href: fmt.Sprintf("%s/%s/share", basePath, s.ID), Rel: "share", Method: "PATCH"}
		links["delete"] = Link{Href: fmt.Sprintf("%s/%s", basePath, s.ID), Rel: "delete", Method: "DELETE"}
	}
	s.Links = links

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

// updateResourceHandler
func updateResourceHandler(w http.ResponseWriter, r *http.Request) {
	user := GetCurrentUser(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	resourceID := chi.URLParam(r, "resourceID")

	var req CreateResource
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check permissions and get type
	var accessRank int
	var resourceType string
	query := `
        SELECT
        s.type,
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            WHEN p.access_level = 'write' THEN 2
            ELSE 0
        END) as access_rank
        FROM resources s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.id = ? AND (
           s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        )
        GROUP BY s.id
    `
	err := db.QueryRow(query, user.ID, resourceID, user.ID, user.ID, user.ID).Scan(&resourceType, &accessRank)
	if err == sql.ErrNoRows || accessRank < 2 {
		http.Error(w, "Not authorized", http.StatusForbidden)
		return
	}

	if err := validateResourceData(resourceType, req.Data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dataBytes, _ := json.Marshal(req.Data)
	_, err = db.Exec("UPDATE resources SET name = ?, data = ?, visibility = ?, updated_at = unixepoch() WHERE id = ?",
		req.Name, string(dataBytes), req.Visibility, resourceID)

	if err != nil {
		log.Printf("Update error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	basePath := getBasePath(resourceType)
	links := map[string]Link{
		"self": {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "self", Method: "GET"},
		"update": {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "update", Method: "PUT"},
		"share": {Href: fmt.Sprintf("%s/%s/share", basePath, resourceID), Rel: "share", Method: "PATCH"},
		"delete": {Href: fmt.Sprintf("%s/%s", basePath, resourceID), Rel: "delete", Method: "DELETE"},
	}

	resp := Resource{
		ID: resourceID,
		OwnerID: user.ID,
		Name: req.Name,
		Type: resourceType,
		Data: req.Data,
		Visibility: req.Visibility,
		UpdatedAt: time.Now().Unix(),
		Links: links,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// shareResourceHandler
func shareResourceHandler(w http.ResponseWriter, r *http.Request) {
	user := GetCurrentUser(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	resourceID := chi.URLParam(r, "resourceID")
	var req ShareResource
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check permissions
	var accessRank int
	query := `
        SELECT
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            ELSE 0
        END) as access_rank
        FROM resources s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.id = ? AND (
           s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        )
        GROUP BY s.id
    `
	err := db.QueryRow(query, user.ID, resourceID, user.ID, user.ID, user.ID).Scan(&accessRank)
	if err == sql.ErrNoRows {
		// Check if resource exists
		var exists int
		errCheck := db.QueryRow("SELECT 1 FROM resources WHERE id = ?", resourceID).Scan(&exists)
		if errCheck == sql.ErrNoRows {
			http.Error(w, "Resource not found", http.StatusNotFound)
		} else {
			http.Error(w, "Not authorized", http.StatusForbidden)
		}
		return
	}

	if accessRank < 3 {
		http.Error(w, "Not authorized to share", http.StatusForbidden)
		return
	}

	// Upsert permission
	query = `
        INSERT INTO permissions (target_id, grantee_id, grantee_type, access_level)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(target_id, grantee_id, grantee_type)
        DO UPDATE SET access_level = excluded.access_level
    `
	_, err = db.Exec(query, resourceID, req.GranteeID, req.GranteeType, req.AccessLevel)
	if err != nil {
		log.Printf("Share error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// deleteResourceHandler
func deleteResourceHandler(w http.ResponseWriter, r *http.Request) {
    user := GetCurrentUser(r)
    if user == nil {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    resourceID := chi.URLParam(r, "resourceID")

    // Check permissions (admin or owner)
    var accessRank int
    query := `
        SELECT
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            ELSE 0
        END) as access_rank
        FROM resources s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.id = ? AND (
           s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        )
        GROUP BY s.id
    `
    err := db.QueryRow(query, user.ID, resourceID, user.ID, user.ID, user.ID).Scan(&accessRank)
    if err == sql.ErrNoRows {
         http.Error(w, "Resource not found", http.StatusNotFound)
         return
    }

    if accessRank < 3 {
        http.Error(w, "Not authorized to delete", http.StatusForbidden)
        return
    }

    _, err = db.Exec("DELETE FROM resources WHERE id = ?", resourceID)
    if err != nil {
         log.Printf("Delete error: %v", err)
         http.Error(w, "Database error", http.StatusInternalServerError)
         return
    }

    w.WriteHeader(http.StatusNoContent)
}
