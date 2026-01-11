"""
OpenSecureConf Web GUI

A web-based graphical interface for managing encrypted configurations.
Built with Streamlit for easy deployment and usage.
"""

import streamlit as st
import requests
from typing import Dict, List, Optional
import json
import pandas as pd
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="OpenSecureConf Manager",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .category-badge {
        background-color: #e1f5ff;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        color: #0277bd;
    }
    .success-box {
        padding: 1rem;
        background-color: #d4edda;
        border-left: 4px solid #28a745;
        border-radius: 0.25rem;
        margin: 1rem 0;
    }
    .error-box {
        padding: 1rem;
        background-color: #f8d7da;
        border-left: 4px solid #dc3545;
        border-radius: 0.25rem;
        margin: 1rem 0;
    }
    .info-box {
        padding: 1rem;
        background-color: #d1ecf1;
        border-left: 4px solid #17a2b8;
        border-radius: 0.25rem;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)


class OpenSecureConfClient:
    """Client for OpenSecureConf API"""

    def __init__(self, base_url: str, user_key: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "x-user-key": user_key,
            "Content-Type": "application/json"
        }

    def get_service_info(self) -> Dict:
        """Get service information"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Failed to connect: {str(e)}")

    def create(self, key: str, value: Dict, category: Optional[str] = None) -> Dict:
        """Create a new configuration"""
        payload = {"key": key, "value": value, "category": category}
        response = requests.post(
            f"{self.base_url}/configs",
            headers=self.headers,
            json=payload,
            timeout=10
        )
        if response.status_code != 201:
            raise Exception(f"Error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return response.json()

    def read(self, key: str) -> Dict:
        """Read a configuration"""
        response = requests.get(
            f"{self.base_url}/configs/{key}",
            headers=self.headers,
            timeout=10
        )
        if response.status_code != 200:
            raise Exception(f"Error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return response.json()

    def update(self, key: str, value: Dict, category: Optional[str] = None) -> Dict:
        """Update a configuration"""
        payload = {"value": value, "category": category}
        response = requests.put(
            f"{self.base_url}/configs/{key}",
            headers=self.headers,
            json=payload,
            timeout=10
        )
        if response.status_code != 200:
            raise Exception(f"Error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return response.json()

    def delete(self, key: str) -> Dict:
        """Delete a configuration"""
        response = requests.delete(
            f"{self.base_url}/configs/{key}",
            headers=self.headers,
            timeout=10
        )
        if response.status_code != 200:
            raise Exception(f"Error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return response.json()

    def list_all(self, category: Optional[str] = None) -> List[Dict]:
        """List all configurations"""
        params = {"category": category} if category else {}
        response = requests.get(
            f"{self.base_url}/configs",
            headers=self.headers,
            params=params,
            timeout=10
        )
        if response.status_code != 200:
            raise Exception(f"Error {response.status_code}: {response.json().get('detail', 'Unknown error')}")
        return response.json()


def initialize_session_state():
    """Initialize session state variables"""
    if 'connected' not in st.session_state:
        st.session_state.connected = False
    if 'client' not in st.session_state:
        st.session_state.client = None
    if 'configs' not in st.session_state:
        st.session_state.configs = []
    if 'selected_config' not in st.session_state:
        st.session_state.selected_config = None
    if 'refresh_trigger' not in st.session_state:
        st.session_state.refresh_trigger = 0


def show_connection_sidebar():
    """Show connection configuration in sidebar"""
    st.sidebar.title("🔐 OpenSecureConf")
    st.sidebar.markdown("---")

    # Connection settings
    st.sidebar.subheader("Connection Settings")

    base_url = st.sidebar.text_input(
        "API URL",
        value=st.session_state.get('base_url', 'http://localhost:9000'),
        help="OpenSecureConf server URL"
    )

    user_key = st.sidebar.text_input(
        "User Key",
        type="password",
        value=st.session_state.get('user_key', ''),
        help="Encryption key (min 8 characters)"
    )

    col1, col2 = st.sidebar.columns(2)

    with col1:
        if st.button("🔌 Connect", use_container_width=True):
            if len(user_key) < 8:
                st.sidebar.error("User key must be at least 8 characters")
            else:
                try:
                    client = OpenSecureConfClient(base_url, user_key)
                    info = client.get_service_info()

                    st.session_state.connected = True
                    st.session_state.client = client
                    st.session_state.base_url = base_url
                    st.session_state.user_key = user_key
                    st.session_state.service_info = info

                    st.sidebar.success("✅ Connected!")
                    st.rerun()
                except Exception as e:
                    st.sidebar.error(f"❌ Connection failed: {str(e)}")

    with col2:
        if st.button("🔌 Disconnect", use_container_width=True):
            st.session_state.connected = False
            st.session_state.client = None
            st.rerun()

    # Show connection status
    if st.session_state.connected:
        st.sidebar.markdown("---")
        st.sidebar.success("🟢 **Status:** Connected")
        info = st.session_state.get('service_info', {})
        st.sidebar.info(f"**Service:** {info.get('service', 'N/A')}\n**Version:** {info.get('version', 'N/A')}")
    else:
        st.sidebar.markdown("---")
        st.sidebar.warning("🔴 **Status:** Disconnected")


def load_configurations(category_filter: Optional[str] = None):
    """Load configurations from server"""
    try:
        configs = st.session_state.client.list_all(category=category_filter)
        st.session_state.configs = configs
        return configs
    except Exception as e:
        st.error(f"Failed to load configurations: {str(e)}")
        return []


def show_configurations_list():
    """Show list of configurations"""
    st.subheader("📋 Configurations")

    # Filter by category
    configs = st.session_state.configs
    categories = list(set([c.get('category', 'None') for c in configs]))
    categories.insert(0, "All")

    col1, col2 = st.columns([3, 1])
    with col1:
        selected_category = st.selectbox(
            "Filter by Category",
            categories,
            key="category_filter"
        )
    with col2:
        if st.button("🔄 Refresh", use_container_width=True):
            category = None if selected_category == "All" else selected_category
            load_configurations(category)
            st.rerun()

    # Load configurations
    if not configs or st.session_state.refresh_trigger:
        category = None if selected_category == "All" else selected_category
        configs = load_configurations(category)
        st.session_state.refresh_trigger = 0

    if not configs:
        st.info("No configurations found. Create your first one!")
        return

    # Display as cards
    for config in configs:
        with st.container():
            col1, col2, col3, col4 = st.columns([3, 2, 1, 1])

            with col1:
                st.markdown(f"**🔑 {config['key']}**")

            with col2:
                category = config.get('category', 'None')
                st.markdown(f'<span class="category-badge">{category}</span>', unsafe_allow_html=True)

            with col3:
                if st.button("👁️ View", key=f"view_{config['id']}", use_container_width=True):
                    st.session_state.selected_config = config
                    st.session_state.show_modal = "view"
                    st.rerun()

            with col4:
                if st.button("🗑️", key=f"delete_{config['id']}", use_container_width=True):
                    st.session_state.selected_config = config
                    st.session_state.show_modal = "delete"
                    st.rerun()

            st.divider()


def show_create_form():
    """Show create configuration form"""
    st.subheader("➕ Create New Configuration")

    with st.form("create_form", clear_on_submit=True):
        key = st.text_input("Configuration Key *", help="Unique identifier")
        category = st.text_input("Category", help="Optional grouping category")

        st.markdown("**Configuration Value (JSON)**")
        value_json = st.text_area(
            "Value",
            value='{"example": "value"}',
            height=150,
            help="Enter configuration data as JSON"
        )

        col1, col2 = st.columns([1, 4])
        with col1:
            submitted = st.form_submit_button("✅ Create", use_container_width=True)

        if submitted:
            if not key:
                st.error("Configuration key is required")
            else:
                try:
                    value = json.loads(value_json)
                    result = st.session_state.client.create(
                        key=key,
                        value=value,
                        category=category if category else None
                    )
                    st.success(f"✅ Configuration '{key}' created successfully!")
                    st.session_state.refresh_trigger = 1
                    st.rerun()
                except json.JSONDecodeError:
                    st.error("Invalid JSON format")
                except Exception as e:
                    st.error(f"Error: {str(e)}")


def show_update_form():
    """Show update configuration form"""
    st.subheader("✏️ Update Configuration")

    configs = st.session_state.configs
    if not configs:
        st.info("No configurations available to update")
        return

    config_keys = [c['key'] for c in configs]
    selected_key = st.selectbox("Select Configuration", config_keys)

    if selected_key:
        # Load current config
        try:
            current_config = st.session_state.client.read(selected_key)

            with st.form("update_form"):
                category = st.text_input(
                    "Category",
                    value=current_config.get('category', '')
                )

                st.markdown("**Configuration Value (JSON)**")
                value_json = st.text_area(
                    "Value",
                    value=json.dumps(current_config['value'], indent=2),
                    height=200
                )

                col1, col2 = st.columns([1, 4])
                with col1:
                    submitted = st.form_submit_button("💾 Update", use_container_width=True)

                if submitted:
                    try:
                        value = json.loads(value_json)
                        result = st.session_state.client.update(
                            key=selected_key,
                            value=value,
                            category=category if category else None
                        )
                        st.success(f"✅ Configuration '{selected_key}' updated successfully!")
                        st.session_state.refresh_trigger = 1
                        st.rerun()
                    except json.JSONDecodeError:
                        st.error("Invalid JSON format")
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
        except Exception as e:
            st.error(f"Error loading configuration: {str(e)}")


def show_view_modal():
    """Show configuration details modal"""
    if st.session_state.get('show_modal') == 'view' and st.session_state.selected_config:
        config = st.session_state.selected_config

        st.subheader(f"🔍 Configuration Details: {config['key']}")

        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"**ID:** {config['id']}")
        with col2:
            st.markdown(f"**Category:** {config.get('category', 'None')}")

        st.markdown("**Value:**")
        st.json(config['value'])

        col1, col2, col3 = st.columns([1, 1, 3])
        with col1:
            if st.button("✏️ Edit", use_container_width=True):
                st.session_state.show_modal = None
                st.session_state.current_tab = "Update"
                st.rerun()
        with col2:
            if st.button("❌ Close", use_container_width=True):
                st.session_state.show_modal = None
                st.session_state.selected_config = None
                st.rerun()


def show_delete_modal():
    """Show delete confirmation modal"""
    if st.session_state.get('show_modal') == 'delete' and st.session_state.selected_config:
        config = st.session_state.selected_config

        st.warning(f"⚠️ Are you sure you want to delete configuration **'{config['key']}'**?")
        st.markdown("This action cannot be undone!")

        col1, col2, col3 = st.columns([1, 1, 3])
        with col1:
            if st.button("🗑️ Delete", use_container_width=True, type="primary"):
                try:
                    st.session_state.client.delete(config['key'])
                    st.success(f"✅ Configuration '{config['key']}' deleted successfully!")
                    st.session_state.show_modal = None
                    st.session_state.selected_config = None
                    st.session_state.refresh_trigger = 1
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        with col2:
            if st.button("❌ Cancel", use_container_width=True):
                st.session_state.show_modal = None
                st.session_state.selected_config = None
                st.rerun()


def show_stats():
    """Show statistics"""
    configs = st.session_state.configs

    if not configs:
        return

    # Calculate stats
    total = len(configs)
    categories = {}
    for config in configs:
        cat = config.get('category', 'None')
        categories[cat] = categories.get(cat, 0) + 1

    # Display stats
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("📊 Total Configurations", total)

    with col2:
        st.metric("📁 Categories", len(categories))

    with col3:
        most_common = max(categories.items(), key=lambda x: x[1]) if categories else ("None", 0)
        st.metric("🏆 Most Used Category", f"{most_common[0]} ({most_common[1]})")

    # Category distribution
    if len(categories) > 0:
        st.markdown("**Category Distribution**")
        df = pd.DataFrame([
            {"Category": k, "Count": v} for k, v in categories.items()
        ])
        st.bar_chart(df.set_index("Category"))


def main():
    """Main application"""
    initialize_session_state()

    # Sidebar
    show_connection_sidebar()

    # Main content
    st.markdown('<h1 class="main-header">🔐 OpenSecureConf Manager</h1>', unsafe_allow_html=True)

    if not st.session_state.connected:
        st.info("👈 Please connect to OpenSecureConf server using the sidebar")
        st.markdown("---")

        # Quick start guide
        st.subheader("🚀 Quick Start")
        st.markdown("""
        1. Enter your **OpenSecureConf API URL** (e.g., `http://localhost:9000`)
        2. Enter your **User Key** (minimum 8 characters)
        3. Click **Connect**
        4. Start managing your encrypted configurations!
        """)

        # Features
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### ✨ Features")
            st.markdown("""
            - 📋 List all configurations
            - 🔍 View configuration details
            - ➕ Create new configurations
            - ✏️ Update existing configurations
            - 🗑️ Delete configurations
            - 📁 Filter by category
            """)

        with col2:
            st.markdown("### 🔒 Security")
            st.markdown("""
            - 🔐 End-to-end encryption
            - 🔑 User key authentication
            - 💾 Secure storage
            - 🛡️ HTTPS support
            - 🔄 No data caching
            """)

        return

    # Show modals if needed
    if st.session_state.get('show_modal') == 'view':
        show_view_modal()
        st.markdown("---")
    elif st.session_state.get('show_modal') == 'delete':
        show_delete_modal()
        st.markdown("---")

    # Statistics
    show_stats()
    st.markdown("---")

    # Tabs for different operations
    tab1, tab2, tab3 = st.tabs(["📋 List", "➕ Create", "✏️ Update"])

    with tab1:
        show_configurations_list()

    with tab2:
        show_create_form()

    with tab3:
        show_update_form()


if __name__ == "__main__":
    main()
