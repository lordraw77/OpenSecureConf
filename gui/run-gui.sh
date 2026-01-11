#!/bin/bash
# Run OpenSecureConf Web GUI

echo "Starting OpenSecureConf Web GUI..."
echo "=================================="
echo ""

# Check if streamlit is installed
if ! command -v streamlit &> /dev/null; then
    echo "Streamlit not found. Installing dependencies..."
    pip install -r gui-requirements.txt
fi

# Run the app
streamlit run gui.py --server.port 8501 --server.address 0.0.0.0

echo ""
echo "GUI stopped."
