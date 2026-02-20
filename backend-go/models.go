package main

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type RegisterUser struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginUser struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Ship struct {
	ID         string                 `json:"id"`
	OwnerID    string                 `json:"owner_id"`
	Name       string                 `json:"name"`
	Data       map[string]interface{} `json:"data"`
	Visibility string                 `json:"visibility"`
	CreatedAt  int64                  `json:"created_at"`
	UpdatedAt  int64                  `json:"updated_at"`
	Links      map[string]Link        `json:"_links"`
}

type CreateShip struct {
	Name       string                 `json:"name"`
	Data       map[string]interface{} `json:"data"`
	Visibility string                 `json:"visibility"`
}

type ShareShip struct {
	GranteeID   string `json:"grantee_id"`
	GranteeType string `json:"grantee_type"` // user, group, app
	AccessLevel string `json:"access_level"` // read, write, admin
}

type Link struct {
	Href   string `json:"href"`
	Rel    string `json:"rel"`
	Method string `json:"method"`
}

type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Exp   int64  `json:"exp"`
}
