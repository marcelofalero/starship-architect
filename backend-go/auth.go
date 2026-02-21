package main

import (
	"context"
	"database/sql"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/pbkdf2"
	"golang.org/x/crypto/scrypt"
)

type contextKey string

const userContextKey contextKey = "user"

// --- Password Hashing ---

func generateSalt() ([]byte, error) {
	salt := make([]byte, 16)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, err
	}
	return salt, nil
}

func hashPassword(password string) (string, error) {
	// Prefer scrypt
	salt, err := generateSalt()
	if err != nil {
		return "", err
	}
	n, r, p := 4096, 8, 1
	dk, err := scrypt.Key([]byte(password), salt, n, r, p, 64)
	if err != nil {
		return "", err
	}
	saltHex := hex.EncodeToString(salt)
	hashHex := hex.EncodeToString(dk)
	return fmt.Sprintf("scrypt$%d$%d$%d$%s$%s", n, r, p, saltHex, hashHex), nil
}

func verifyPassword(storedHash, providedPassword string) bool {
	parts := strings.Split(storedHash, "$")

	// scrypt$n$r$p$salt$hash
	if len(parts) == 6 && parts[0] == "scrypt" {
		n, _ := strconv.Atoi(parts[1])
		r, _ := strconv.Atoi(parts[2])
		p, _ := strconv.Atoi(parts[3])
		saltHex := parts[4]
		storedHashHex := parts[5]

		salt, err := hex.DecodeString(saltHex)
		if err != nil {
			return false
		}
		dk, err := scrypt.Key([]byte(providedPassword), salt, n, r, p, 64)
		if err != nil {
			return false
		}
		return subtle.ConstantTimeCompare([]byte(storedHashHex), []byte(hex.EncodeToString(dk))) == 1
	}

	// pbkdf2$iterations$salt$hash
	if len(parts) == 4 && parts[0] == "pbkdf2" {
		iterations, _ := strconv.Atoi(parts[1])
		saltHex := parts[2]
		storedHashHex := parts[3]

		salt, err := hex.DecodeString(saltHex)
		if err != nil {
			return false
		}
		dk := pbkdf2.Key([]byte(providedPassword), salt, iterations, 32, sha256.New)
		return subtle.ConstantTimeCompare([]byte(storedHashHex), []byte(hex.EncodeToString(dk))) == 1
	}

	// Legacy PBKDF2: salt$hash (100000 iterations)
	if len(parts) == 2 {
		saltHex := parts[0]
		storedHashHex := parts[1]
		iterations := 100000
		salt, err := hex.DecodeString(saltHex)
		if err != nil {
			return false
		}
		dk := pbkdf2.Key([]byte(providedPassword), salt, iterations, 32, sha256.New)
		return subtle.ConstantTimeCompare([]byte(storedHashHex), []byte(hex.EncodeToString(dk))) == 1
	}

	return false
}

// --- JWT ---

func signHS256Token(claims jwt.MapClaims, secret string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func verifyHS256Token(tokenString, secret string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token")
}

// --- Auth Endpoints ---

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterUser
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check existing user
	var id string
	err := db.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&id)
	if err == nil {
		http.Error(w, "User already exists", http.StatusBadRequest)
		return
	} else if err != sql.ErrNoRows {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Hash password
	pwHash, err := hashPassword(req.Password)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	userID := generateUUID() // Need uuid implementation
	_, err = db.Exec("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)", userID, req.Email, req.Name, pwHash)
	if err != nil {
		log.Printf("Insert error: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "user_id": userID})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginUser
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user User
	var storedHash string
	err := db.QueryRow("SELECT id, email, name, password_hash FROM users WHERE email = ?", req.Email).Scan(&user.ID, &user.Email, &user.Name, &storedHash)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if !verifyPassword(storedHash, req.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	secret := os.Getenv("SESSION_SECRET")
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"name":  user.Name,
		"exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
	}

	token, err := signHS256Token(claims, secret)
	if err != nil {
		http.Error(w, "Failed to sign token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"access_token": token, "token_type": "bearer"})
}

// --- Helpers ---

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

// --- Middleware ---

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		parts := strings.Fields(authHeader)

		// Check for Bearer token (case-insensitive)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			// No token or invalid format, proceed as anonymous
			next.ServeHTTP(w, r)
			return
		}

		tokenString := parts[1]
		secret := os.Getenv("SESSION_SECRET")
		claims, err := verifyHS256Token(tokenString, secret)

		if err != nil {
			fmt.Printf("Token verification failed: %v\n", err)
			// Invalid token, proceed as anonymous
			next.ServeHTTP(w, r)
		} else {
			ctx := context.WithValue(r.Context(), userContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		}
	})
}

func GetCurrentUser(r *http.Request) *User {
	claims, ok := r.Context().Value(userContextKey).(jwt.MapClaims)
	if !ok {
		return nil
	}

	var sub string
	switch v := claims["sub"].(type) {
	case string:
		sub = v
	case float64:
		sub = fmt.Sprintf("%.0f", v)
	}

	email, _ := claims["email"].(string)
	name, _ := claims["name"].(string)

	if sub == "" {
		fmt.Printf("Missing 'sub' claim in token or invalid type: %T\n", claims["sub"])
		return nil
	}

	return &User{
		ID:    sub,
		Email: email,
		Name:  name,
	}
}

func authGoogleHandler(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Missing token", http.StatusBadRequest)
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	validIssuers := []string{"https://accounts.google.com", "accounts.google.com"}

	claims, err := verifyRS256Token(token, clientID, validIssuers)
	if err != nil {
		log.Printf("Google auth error: %v", err)
		http.Error(w, "Invalid token", http.StatusBadRequest)
		return
	}

	userID := claims["sub"].(string)
	email := claims["email"].(string)
	name, _ := claims["name"].(string)

	// Upsert user
	var existingID string
	err = db.QueryRow("SELECT id FROM users WHERE id = ?", userID).Scan(&existingID)
	if err == sql.ErrNoRows {
		// Check by email
		err = db.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&existingID)
		if err == sql.ErrNoRows {
			// Create user
			_, err = db.Exec("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", userID, email, name)
			if err != nil {
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
		} else if err == nil {
			userID = existingID
		}
	}

	// Create session token
	secret := os.Getenv("SESSION_SECRET")
	sessionClaims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"name":  name,
		"exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
	}

	sessionToken, err := signHS256Token(sessionClaims, secret)
	if err != nil {
		http.Error(w, "Failed to sign token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"access_token": sessionToken, "token_type": "bearer"})
}
