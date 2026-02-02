#!/bin/sh

set -e

# Default values
OSC_BASE_URL=${OSC_BASE_URL:-http://localhost:9000}
OSC_USER_KEY=${OSC_USER_KEY:-default-key-12345678}
OSC_API_KEY=${OSC_API_KEY:-cluster-secret-key-123}

# Replace environment variables in index.html
sed -i "s|\${OSC_BASE_URL}|${OSC_BASE_URL}|g" /usr/share/nginx/html/index.html
sed -i "s|\${OSC_USER_KEY}|${OSC_USER_KEY}|g" /usr/share/nginx/html/index.html
sed -i "s|\${OSC_API_KEY}|${OSC_API_KEY}|g" /usr/share/nginx/html/index.html

echo "Configuration:"
echo "  OSC_BASE_URL: ${OSC_BASE_URL}"
echo "  OSC_USER_KEY: ${OSC_USER_KEY}"
echo "  OSC_API_KEY: ${OSC_API_KEY:+***}"

exec "$@"
