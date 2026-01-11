# OpenSecureConf Docker Build Makefile

.PHONY: help build build-push build-local test clean setup

CONFIG_FILE ?= build.config

help:
	@echo "OpenSecureConf Docker Build Commands:"
	@echo ""
	@echo "  make setup        - Setup Docker buildx builder"
	@echo "  make build        - Build multi-platform images (no push)"
	@echo "  make build-push   - Build and push to registry"
	@echo "  make build-local  - Build for local platform only"
	@echo "  make test         - Test built image locally"
	@echo "  make clean        - Remove builder and images"
	@echo "  make inspect      - Inspect multi-arch image"
	@echo ""
	@echo "Configuration file: $(CONFIG_FILE)"

setup:
	@echo "Setting up Docker buildx builder..."
	@docker buildx create --name opensecureconf-builder --driver docker-container --bootstrap || true
	@docker buildx use opensecureconf-builder
	@docker buildx inspect --bootstrap
	@echo "Builder ready!"

build:
	@echo "Building multi-platform images (no push)..."
	@bash build.sh $(CONFIG_FILE)

build-push:
	@echo "Building and pushing multi-platform images..."
	@sed -i.bak 's/PUSH_TO_REGISTRY=false/PUSH_TO_REGISTRY=true/' $(CONFIG_FILE)
	@bash build.sh $(CONFIG_FILE)
	@mv $(CONFIG_FILE).bak $(CONFIG_FILE)

build-local:
	@echo "Building for local platform only..."
	@cd server && docker build -t opensecureconf:local .
	@echo "Local build complete: opensecureconf:local"

test:
	@echo "Testing image locally..."
	@docker run -d --name opensecureconf-test -p 9000:9000 lordraw77/opensecureconf:latest
	@echo "Waiting for service to start..."
	@sleep 5
	@curl -f http://localhost:9000/health || (echo "Health check failed!" && exit 1)
	@echo "Service is healthy!"
	@docker logs opensecureconf-test
	@docker stop opensecureconf-test
	@docker rm opensecureconf-test

inspect:
	@echo "Inspecting multi-arch image..."
	@docker buildx imagetools inspect lordraw77/opensecureconf:latest

clean:
	@echo "Cleaning up..."
	@docker buildx rm opensecureconf-builder || true
	@docker rmi lordraw77/opensecureconf:latest || true
	@echo "Cleanup complete!"

login:
	@echo "Logging into Docker Hub..."
	@docker login

.DEFAULT_GOAL := help
