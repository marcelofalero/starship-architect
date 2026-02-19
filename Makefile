# Makefile for SWSE Starship Architect

COMPOSE = docker compose

.PHONY: help start stop restart logs test build clean

help:
	@echo "Available commands:"
	@echo "  make start    - Start the application (backend & frontend) in background"
	@echo "  make stop     - Stop the application"
	@echo "  make restart  - Restart the application"
	@echo "  make logs     - View logs (follow)"
	@echo "  make test     - Run the test suite"
	@echo "  make build    - Build docker images"
	@echo "  make clean    - Stop application and remove volumes"

start:
	$(COMPOSE) up -d --remove-orphans

stop:
	$(COMPOSE) down

restart: stop start

logs:
	$(COMPOSE) logs -f

test:
	$(COMPOSE) run --rm tests

build:
	$(COMPOSE) build

clean:
	$(COMPOSE) down -v --remove-orphans
