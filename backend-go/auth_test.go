package main

import (
	"encoding/hex"
	"strings"
	"testing"
)

func TestHashPassword(t *testing.T) {
	password := "password123"
	hash1, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword failed: %v", err)
	}

	if !strings.HasPrefix(hash1, "scrypt$") {
		t.Errorf("Expected hash to start with 'scrypt$', got %s", hash1)
	}

	parts := strings.Split(hash1, "$")
	if len(parts) != 6 {
		t.Errorf("Expected 6 parts in hash, got %d", len(parts))
	}

	// Verify n, r, p are correct
	if parts[1] != "4096" || parts[2] != "8" || parts[3] != "1" {
		t.Errorf("Expected scrypt parameters 4096, 8, 1, got %s, %s, %s", parts[1], parts[2], parts[3])
	}

	hash2, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword failed: %v", err)
	}

	if hash1 == hash2 {
		t.Error("hashPassword should return different hashes for the same password due to random salt")
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "secret-password"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword failed: %v", err)
	}

	tests := []struct {
		name     string
		hash     string
		password string
		want     bool
	}{
		{"Correct password", hash, password, true},
		{"Incorrect password", hash, "wrong-password", false},
		{"Empty password", hash, "", false},
		{"Invalid hash format", "invalid-hash", password, false},
		{
			"PBKDF2 format (valid check)",
			// Generated for password "password", salt "salt", 1000 iterations
			"pbkdf2$1000$73616c74$632c2812e46d4604102ba7618e9d6d7d2f8128f6266b4a03264d2a0460b7dcb3",
			"password",
			true,
		},
		{
			"PBKDF2 format (invalid password)",
			"pbkdf2$1000$73616c74$632c2812e46d4604102ba7618e9d6d7d2f8128f6266b4a03264d2a0460b7dcb3",
			"wrong",
			false,
		},
		{
			"Legacy salt$hash format (valid check)",
			// Generated for password "password", salt "salt", 100000 iterations
			"73616c74$0394a2ede332c9a13eb82e9b24631604c31df978b4e2f0fbd2c549944f9d79a5",
			"password",
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := verifyPassword(tt.hash, tt.password); got != tt.want {
				t.Errorf("verifyPassword() for %s: got %v, want %v", tt.name, got, tt.want)
			}
		})
	}
}

func TestGenerateSalt(t *testing.T) {
	salt1, err := generateSalt()
	if err != nil {
		t.Fatalf("generateSalt failed: %v", err)
	}
	if len(salt1) != 16 {
		t.Errorf("Expected salt length 16, got %d", len(salt1))
	}

	salt2, err := generateSalt()
	if err != nil {
		t.Fatalf("generateSalt failed: %v", err)
	}
	if hex.EncodeToString(salt1) == hex.EncodeToString(salt2) {
		t.Error("generateSalt should produce different salts")
	}
}
