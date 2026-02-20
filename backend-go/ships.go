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

// listShipsHandler
func listShipsHandler(w http.ResponseWriter, r *http.Request) {
    user := GetCurrentUser(r)
    var userID string
    if user != nil {
        userID = user.ID
    }

    var rows *sql.Rows
    var err error

    if userID != "" {
        query := `
        SELECT s.id, s.owner_id, s.name, s.data, s.visibility, s.created_at, s.updated_at,
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            WHEN p.access_level = 'write' THEN 2
            WHEN p.access_level = 'read' THEN 1
            ELSE 0
        END) as access_rank
        FROM ships s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.visibility = 'public'
           OR s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        GROUP BY s.id
        `
        rows, err = db.Query(query, userID, userID, userID, userID)
    } else {
        query := `SELECT id, owner_id, name, data, visibility, created_at, updated_at, 0 as access_rank FROM ships WHERE visibility = 'public'`
        rows, err = db.Query(query)
    }

    if err != nil {
        log.Printf("Query error: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    ships := []Ship{}
    for rows.Next() {
        var s Ship
        var dataStr string
        var accessRank int
        if err := rows.Scan(&s.ID, &s.OwnerID, &s.Name, &dataStr, &s.Visibility, &s.CreatedAt, &s.UpdatedAt, &accessRank); err != nil {
            continue
        }
        json.Unmarshal([]byte(dataStr), &s.Data)

        links := map[string]Link{
            "self": {Href: fmt.Sprintf("/ships/%s", s.ID), Rel: "self", Method: "GET"},
        }
        if accessRank >= 2 {
            links["update"] = Link{Href: fmt.Sprintf("/ships/%s", s.ID), Rel: "update", Method: "PUT"}
        }
        if accessRank >= 3 {
            links["share"] = Link{Href: fmt.Sprintf("/ships/%s/share", s.ID), Rel: "share", Method: "PATCH"}
            links["delete"] = Link{Href: fmt.Sprintf("/ships/%s", s.ID), Rel: "delete", Method: "DELETE"}
        }
        s.Links = links
        ships = append(ships, s)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(ships)
}

// createShipHandler
func createShipHandler(w http.ResponseWriter, r *http.Request) {
    user := GetCurrentUser(r)
    if user == nil {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    var req CreateShip
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    shipID := generateUUID()
    dataBytes, _ := json.Marshal(req.Data)

    _, err := db.Exec("INSERT INTO ships (id, owner_id, name, data, visibility) VALUES (?, ?, ?, ?, ?)",
        shipID, user.ID, req.Name, string(dataBytes), req.Visibility)

    if err != nil {
        log.Printf("Insert ship error: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // Return created ship
    links := map[string]Link{
        "self": {Href: fmt.Sprintf("/ships/%s", shipID), Rel: "self", Method: "GET"},
        "update": {Href: fmt.Sprintf("/ships/%s", shipID), Rel: "update", Method: "PUT"},
        "share": {Href: fmt.Sprintf("/ships/%s/share", shipID), Rel: "share", Method: "PATCH"},
        "delete": {Href: fmt.Sprintf("/ships/%s", shipID), Rel: "delete", Method: "DELETE"},
    }

    resp := Ship{
        ID: shipID,
        OwnerID: user.ID,
        Name: req.Name,
        Data: req.Data,
        Visibility: req.Visibility,
        CreatedAt: time.Now().Unix(),
        UpdatedAt: time.Now().Unix(),
        Links: links,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

// shareShipHandler
func shareShipHandler(w http.ResponseWriter, r *http.Request) {
    user := GetCurrentUser(r)
    if user == nil {
        http.Error(w, "Authentication required", http.StatusUnauthorized)
        return
    }

    shipID := chi.URLParam(r, "shipID")
    var req ShareShip
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
        FROM ships s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.id = ? AND (
           s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        )
        GROUP BY s.id
    `
    err := db.QueryRow(query, user.ID, shipID, user.ID, user.ID, user.ID).Scan(&accessRank)
    if err == sql.ErrNoRows {
        // Check if ship exists
        var exists int
        errCheck := db.QueryRow("SELECT 1 FROM ships WHERE id = ?", shipID).Scan(&exists)
        if errCheck == sql.ErrNoRows {
             http.Error(w, "Ship not found", http.StatusNotFound)
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
    _, err = db.Exec(query, shipID, req.GranteeID, req.GranteeType, req.AccessLevel)
    if err != nil {
         log.Printf("Share error: %v", err)
         http.Error(w, "Database error", http.StatusInternalServerError)
         return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
