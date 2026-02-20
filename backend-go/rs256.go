package main

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwksCache struct {
	Keys   []JWK     `json:"keys"`
	Expiry time.Time `json:"expiry"`
}

type JWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func getJWKS() ([]JWK, error) {
	if time.Now().Before(jwksCache.Expiry) {
		return jwksCache.Keys, nil
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v3/certs")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Keys []JWK `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	jwksCache.Keys = result.Keys
	jwksCache.Expiry = time.Now().Add(time.Hour)
	return jwksCache.Keys, nil
}

func verifyRS256Token(tokenString, clientID string, validIssuers []string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("missing kid header")
		}

		keys, err := getJWKS()
		if err != nil {
			return nil, err
		}

		for _, key := range keys {
			if key.Kid == kid {
				nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
				if err != nil {
					return nil, err
				}
				eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
				if err != nil {
					return nil, err
				}

				// Standard E is usually small (65537), handled as int
				eInt := 0
				for _, b := range eBytes {
					eInt = eInt<<8 + int(b)
				}

				pubKey := &rsa.PublicKey{
					N: new(big.Int).SetBytes(nBytes),
					E: eInt,
				}
				return pubKey, nil
			}
		}
		return nil, errors.New("key not found")
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Verify issuer
		iss, _ := claims["iss"].(string)
		isValidIssuer := false
		for _, v := range validIssuers {
			if v == iss {
				isValidIssuer = true
				break
			}
		}
		if !isValidIssuer {
			return nil, errors.New("invalid issuer")
		}

		// Verify audience
		aud, _ := claims["aud"].(string)
		if aud != clientID {
			return nil, errors.New("invalid audience")
		}

		return claims, nil
	}
	return nil, errors.New("invalid token")
}
