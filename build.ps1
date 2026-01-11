# OpenSecureConf Multi-Platform Docker Build Script (PowerShell)
# Supports multiple architectures: amd64, arm64, arm/v7

param(
    [string]$ConfigFile = "build.config"
)

# Colors
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Print-Info($message) {
    Write-Host "${Blue}[INFO]${Reset} $message"
}

function Print-Success($message) {
    Write-Host "${Green}[SUCCESS]${Reset} $message"
}

function Print-Warning($message) {
    Write-Host "${Yellow}[WARNING]${Reset} $message"
}

function Print-Error($message) {
    Write-Host "${Red}[ERROR]${Reset} $message"
}

# Check if config file exists
if (-not (Test-Path $ConfigFile)) {
    Print-Error "Configuration file '$ConfigFile' not found!"
    Write-Host "${Yellow}Usage: .\build.ps1 [config_file]${Reset}"
    Write-Host "${Yellow}Example: .\build.ps1 build.config${Reset}"
    exit 1
}

# Load configuration
Print-Info "Loading configuration from $ConfigFile..."
Get-Content $ConfigFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Validate required variables
if (-not $IMAGE_NAME) {
    Print-Error "IMAGE_NAME is not set in config file"
    exit 1
}

if (-not $IMAGE_TAG) {
    Print-Error "IMAGE_TAG is not set in config file"
    exit 1
}

if (-not $PLATFORMS) {
    Print-Error "PLATFORMS is not set in config file"
    exit 1
}

# Build full image name
if ($REGISTRY) {
    $FULL_IMAGE_NAME = "$REGISTRY/$DOCKER_USERNAME/$IMAGE_NAME"
} else {
    $FULL_IMAGE_NAME = "$DOCKER_USERNAME/$IMAGE_NAME"
}

Print-Info "======================================"
Print-Info "OpenSecureConf Docker Multi-Build"
Print-Info "======================================"
Print-Info "Image: ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
Print-Info "Platforms: ${PLATFORMS}"
Print-Info "Push to registry: ${PUSH_TO_REGISTRY}"
Print-Info "Use cache: ${USE_CACHE}"
Print-Info "======================================"

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Print-Error "Docker is not installed or not in PATH"
    exit 1
}

# Check if buildx is available
try {
    docker buildx version | Out-Null
} catch {
    Print-Error "Docker buildx is not available"
    Print-Info "Please install Docker Desktop or enable buildx"
    exit 1
}

# Create or use existing builder
$BUILDER_NAME = "opensecureconf-builder"
$builderExists = docker buildx inspect $BUILDER_NAME 2>&1
if ($LASTEXITCODE -ne 0) {
    Print-Info "Creating new buildx builder: $BUILDER_NAME"
    docker buildx create --name $BUILDER_NAME --driver docker-container --bootstrap
} else {
    Print-Info "Using existing builder: $BUILDER_NAME"
}

# Use the builder
docker buildx use $BUILDER_NAME

# Build command array
$buildArgs = @(
    "buildx", "build",
    "--platform", $PLATFORMS,
    "-t", "${FULL_IMAGE_NAME}:${IMAGE_TAG}"
)

# Add version tag if enabled
if ($TAG_WITH_VERSION -eq "true" -and $VERSION) {
    $buildArgs += "-t", "${FULL_IMAGE_NAME}:${VERSION}"
    Print-Info "Also tagging as: ${FULL_IMAGE_NAME}:${VERSION}"
}

# Add latest tag
$buildArgs += "-t", "${FULL_IMAGE_NAME}:latest"

# Add cache options
if ($USE_CACHE -eq "true") {
    $buildArgs += "--cache-from", "type=registry,ref=${FULL_IMAGE_NAME}:buildcache"
    $buildArgs += "--cache-to", "type=registry,ref=${FULL_IMAGE_NAME}:buildcache,mode=max"
}

# Add push option
if ($PUSH_TO_REGISTRY -eq "true") {
    $buildArgs += "--push"
    Print-Info "Will push to registry after build"
} else {
    $buildArgs += "--load"
    Print-Warning "Images will be built but NOT pushed to registry"
}

# Add Dockerfile path
$buildArgs += "-f", "server/Dockerfile", "server/"

# Set environment
$env:DOCKER_BUILDKIT = "1"
if ($BUILDKIT_PROGRESS) {
    $env:BUILDKIT_PROGRESS = $BUILDKIT_PROGRESS
}

Print-Info "Starting build..."
Write-Host ""

# Execute build
$result = & docker @buildArgs

if ($LASTEXITCODE -eq 0) {
    Print-Success "Build completed successfully!"
    Write-Host ""
    Print-Info "Built images:"
    Print-Info "  - ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
    if ($TAG_WITH_VERSION -eq "true" -and $VERSION) {
        Print-Info "  - ${FULL_IMAGE_NAME}:${VERSION}"
    }
    Print-Info "  - ${FULL_IMAGE_NAME}:latest"
    Write-Host ""

    if ($PUSH_TO_REGISTRY -eq "true") {
        Print-Success "Images pushed to registry"
    } else {
        Print-Warning "To push images later, run:"
        Write-Host "  docker push ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
        if ($TAG_WITH_VERSION -eq "true" -and $VERSION) {
            Write-Host "  docker push ${FULL_IMAGE_NAME}:${VERSION}"
        }
        Write-Host "  docker push ${FULL_IMAGE_NAME}:latest"
    }

    Write-Host ""
    Print-Info "To test locally:"
    Write-Host "  docker run -d -p 9000:9000 --name opensecureconf ${FULL_IMAGE_NAME}:${IMAGE_TAG}"
} else {
    Print-Error "Build failed!"
    exit 1
}
