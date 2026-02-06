.PHONY: help up down logs build rebuild clean ps restart shell

COMPOSE := docker compose
COMPOSE_FILE := docker-compose.yml
SERVICE_NAME := opensecureconf-admin

help:
	@echo "OpenSecureConf GUI-ng Docker Commands:"
	@echo ""
	@echo "  make up        - Start the container"
	@echo "  make down      - Stop and remove the container"
	@echo "  make logs      - View container logs (follow mode)"
	@echo "  make build     - Build the Docker image"
	@echo "  make rebuild   - stop rebuild and restart the container with logs"
	@echo "  make restart   - Restart the container"
	@echo "  make ps        - Show container status"
	@echo "  make clean     - Remove containers, volumes, and images"
	@echo "  make shell     - Open shell in running container"

up:
	@echo "Starting OpenSecureConf GUI-ng..."
	@$(COMPOSE) -f $(COMPOSE_FILE) up -d
	@echo "✓ Container started"

down:
	@echo "Stopping OpenSecureConf GUI-ng..."
	@$(COMPOSE) -f $(COMPOSE_FILE) down
	@echo "✓ Container stopped"

logs:
	@$(COMPOSE) -f $(COMPOSE_FILE) logs -f

build:
	@echo "Building image..."
	@$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache
	@echo "✓ Build complete"

rebuild: down build up logs

restart:
	@$(COMPOSE) -f $(COMPOSE_FILE) restart

ps:
	@$(COMPOSE) -f $(COMPOSE_FILE) ps

clean: down
	@echo "Removing volumes and images..."
	@$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi local
	@echo "✓ Cleanup complete"

shell:
	@$(COMPOSE) -f $(COMPOSE_FILE) exec $(SERVICE_NAME) /bin/sh
