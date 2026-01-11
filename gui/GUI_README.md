# OpenSecureConf Web GUI 🎨

A modern web-based graphical interface for managing OpenSecureConf configurations.

## Features

### 📋 Configuration Management
- **List View**: Browse all configurations with category filtering
- **Create**: Add new encrypted configurations with JSON editor
- **Read**: View detailed configuration information
- **Update**: Edit existing configurations
- **Delete**: Remove configurations with confirmation

### 📊 Dashboard
- **Statistics**: View total configurations, categories, and distribution
- **Category Filtering**: Quick filter by category
- **Real-time Updates**: Auto-refresh configuration list
- **Search**: Find configurations quickly

### 🎨 User Interface
- **Modern Design**: Clean and intuitive interface
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Automatic theme support
- **Color Coding**: Visual category badges

### 🔒 Security
- **Encrypted Connection**: HTTPS support
- **User Authentication**: User key validation
- **No Data Caching**: Secure session management
- **Connection Status**: Real-time connection indicator

## Installation

### Option 1: Local Installation

```bash
# Install dependencies
pip install -r gui-requirements.txt

# Run the GUI
streamlit run gui.py

# Or use the run script
chmod +x run-gui.sh
./run-gui.sh
```

The GUI will be available at `http://localhost:8501`

### Option 2: Docker

```bash
# Build and run
docker build -t opensecureconf-gui -f gui/Dockerfile gui/
docker run -d -p 8501:8501 opensecureconf-gui
```

### Option 3: Docker Compose (with Server)

```bash
# Start both server and GUI
docker-compose -f docker-compose-gui.yml up -d

# Server: http://localhost:9000
# GUI: http://localhost:8501
```

## Usage

### 1. Connect to Server

1. Enter the **API URL** (e.g., `http://localhost:9000`)
2. Enter your **User Key** (minimum 8 characters)
3. Click **Connect**

### 2. List Configurations

- View all configurations in the **List** tab
- Filter by category using the dropdown
- Click **View** to see configuration details
- Click **Delete** to remove a configuration

### 3. Create Configuration

1. Go to the **Create** tab
2. Enter a unique **Configuration Key**
3. Optionally enter a **Category**
4. Enter the **Value** as JSON
5. Click **Create**

### 4. Update Configuration

1. Go to the **Update** tab
2. Select a configuration from the dropdown
3. Modify the **Category** or **Value**
4. Click **Update**

### 5. View Statistics

The dashboard shows:
- Total number of configurations
- Number of categories
- Most used category
- Category distribution chart

## Configuration

### Environment Variables

- `DEFAULT_API_URL`: Default API URL (default: `http://localhost:9000`)

### Streamlit Configuration

Create `.streamlit/config.toml`:

```toml
[server]
port = 8501
address = "0.0.0.0"

[theme]
primaryColor = "#1f77b4"
backgroundColor = "#ffffff"
secondaryBackgroundColor = "#f0f2f6"
textColor = "#262730"
```

## Screenshots

### Connection Page
- Simple connection form
- Quick start guide
- Feature overview

### Dashboard
- Configuration statistics
- Category distribution chart
- Quick actions

### List View
- All configurations
- Category filtering
- View/Delete actions

### Create Form
- Key and category inputs
- JSON editor
- Validation

### Update Form
- Configuration selector
- Pre-filled values
- JSON editor

## Keyboard Shortcuts

- `Ctrl+K`: Focus search (when implemented)
- `Ctrl+N`: Create new configuration
- `Ctrl+R`: Refresh list
- `Esc`: Close modal

## API Requirements

The GUI requires OpenSecureConf API server to be running:

- **Endpoint**: `/configs`
- **Authentication**: `x-user-key` header
- **Methods**: GET, POST, PUT, DELETE

## Troubleshooting

### "Failed to connect"
- Check if the API server is running
- Verify the API URL is correct
- Check user key is at least 8 characters

### "Invalid JSON format"
- Ensure the value is valid JSON
- Use double quotes for strings
- Check for trailing commas

### Port already in use
```bash
# Change port in command
streamlit run gui.py --server.port 8502
```

## Development

### Run in development mode

```bash
# With auto-reload
streamlit run gui.py --server.runOnSave true

# With debugging
streamlit run gui.py --logger.level debug
```

### Custom styling

Edit the CSS in the `st.markdown()` section of `gui.py`

## License

MIT License - see main LICENSE file

## Support

For issues or questions:
- Check [main documentation](../README.md)
- Open an [issue](https://github.com/lordraw77/OpenSecureConf/issues)
