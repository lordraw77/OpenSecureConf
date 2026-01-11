#!/bin/bash
# OpenSecureConf Multi-Platform Docker Build Script
# Supports multiple architectures: amd64, arm64, arm/v7

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default config file
CONFIG_FILE="${1:-build.config}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: Configuration file '$CONFIG_FILE' not found!${NC}"
    echo -e "${YELLOW}Usage: $0 [config_file]${NC}"
    echo -e "${YELLOW}Example: $0 build.config${NC}"
    exit 1
fi

# Load configuration
echo -e "${BLUE}Loading configuration from $CONFIG_FILE...${NC}"
source "$CONFIG_FILE"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate required variables
if [ -z "$IMAGE_NAME" ]; then
    print_error "IMAGE_NAME is not set in config file"
    exit 1
fi

if [ -z "$IMAGE_TAG" ]; then
    print_error "IMAGE_TAG is not set in config file"
    exit 1
fi

if [ -z "$PLATFORMS" ]; then
    print_error "PLATFORMS is not set in config file"
    exit 1
fi

# Build full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${DOCKER_USERNAME}/${IMAGE_NAME}"
else
    FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
fi

print_info "======================================"
print_info "OpenSecureConf Docker Multi-Build"
print_info "======================================"
print_info "Image: ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
print_info "Platforms: ${PLATFORMS}"
print_info "Push to registry: ${PUSH_TO_REGISTRY}"
print_info "Use cache: ${USE_CACHE}"
print_info "======================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    print_error "Docker buildx is not available"
    print_info "Please install Docker Desktop or enable buildx"
    exit 1
fi

# Create or use existing builder
BUILDER_NAME="opensecureconf-builder"
if ! docker buildx inspect "$BUILDER_NAME" &> /dev/null; then
    print_info "Creating new buildx builder: $BUILDER_NAME"
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap
else
    print_info "Using existing builder: $BUILDER_NAME"
fi

# Use the builder
docker buildx use "$BUILDER_NAME"

# Prepare build command
BUILD_CMD="docker buildx build"
BUILD_CMD="$BUILD_CMD --platform ${PLATFORMS}"
BUILD_CMD="$BUILD_CMD -t ${FULL_IMAGE_NAME}:${IMAGE_TAG}"

# Add version tag if enabled
if [ "$TAG_WITH_VERSION" = "true" ] && [ -n "$VERSION" ]; then
    BUILD_CMD="$BUILD_CMD -t ${FULL_IMAGE_NAME}:${VERSION}"
    print_info "Also tagging as: ${FULL_IMAGE_NAME}:${VERSION}"
fi

# Add latest tag
BUILD_CMD="$BUILD_CMD -t ${FULL_IMAGE_NAME}:latest"

# Add cache options
if [ "$USE_CACHE" = "true" ]; then
    BUILD_CMD="$BUILD_CMD --cache-from type=registry,ref=${FULL_IMAGE_NAME}:buildcache"
    BUILD_CMD="$BUILD_CMD --cache-to type=registry,ref=${FULL_IMAGE_NAME}:buildcache,mode=max"
fi

# Add build args if specified
if [ -n "$BUILD_ARGS" ]; then
    BUILD_CMD="$BUILD_CMD $BUILD_ARGS"
fi

# Add push option
if [ "$PUSH_TO_REGISTRY" = "true" ]; then
    BUILD_CMD="$BUILD_CMD --push"
    print_info "Will push to registry after build"
else
    BUILD_CMD="$BUILD_CMD --load"
    print_warning "Images will be built but NOT pushed to registry"
fi

# Add Dockerfile path
BUILD_CMD="$BUILD_CMD -f server/Dockerfile server/"

# Set BuildKit progress
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS="${BUILDKIT_PROGRESS:-plain}"

print_info "Starting build..."
echo ""

# Execute build
if eval "$BUILD_CMD"; then
    print_success "Build completed successfully!"
    echo ""
    print_info "Built images:"
    print_info "  - ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
    if [ "$TAG_WITH_VERSION" = "true" ] && [ -n "$VERSION" ]; then
        print_info "  - ${FULL_IMAGE_NAME}:${VERSION}"
    fi
    print_info "  - ${FULL_IMAGE_NAME}:latest"
    echo ""

    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        print_success "Images pushed to registry"
    else
        print_warning "To push images later, run:"
        echo "  docker push ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
        if [ "$TAG_WITH_VERSION" = "true" ] && [ -n "$VERSION" ]; then
            echo "  docker push ${FULL_IMAGE_NAME}:${VERSION}"
        fi
        echo "  docker push ${FULL_IMAGE_NAME}:latest"
    fi

    echo ""
    print_info "To test locally:"
    echo "  docker run -d -p 9000:9000 --name opensecureconf ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
else
    print_error "Build failed!"
    exit 1
fi
