#!/usr/bin/env python3
"""
Script per sincronizzare la versione in tutti i file del progetto.
Legge VERSION e aggiorna:
- server/core/config.py (APP_VERSION)
- build.config (VERSION e TAG_WITH_VERSION)
- client-js/package.json (version)
- client-python/pyproject.toml (version)
"""

import re
import sys
from pathlib import Path

# Leggi versione corrente
version_file = Path(__file__).parent / "VERSION"
if not version_file.exists():
    print("❌ File VERSION non trovato!")
    sys.exit(1)

VERSION = version_file.read_text().strip()
print(f"📦 Versione corrente: {VERSION}")

# ============================================================================
# Aggiorna server/core/config.py
# ============================================================================
config_py = Path(__file__).parent / "server" / "core" / "config.py"
if config_py.exists():
    content = config_py.read_text()
    new_content = re.sub(
        r'APP_VERSION = "[^"]*"',
        f'APP_VERSION = "{VERSION}"',
        content
    )
    config_py.write_text(new_content)
    print(f"✅ Aggiornato server/core/config.py -> {VERSION}")
else:
    print(f"⚠️  File {config_py} non trovato")

# ============================================================================
# Aggiorna build.config
# ============================================================================
build_config = Path(__file__).parent / "build.config"
if build_config.exists():
    lines = build_config.read_text().split('\n')
    new_lines = []

    for line in lines:
        # Aggiorna solo la riga che inizia ESATTAMENTE con "VERSION="
        if line.startswith('VERSION='):
            new_lines.append(f'VERSION={VERSION}')
        # Assicurati che TAG_WITH_VERSION sia true
        elif line.startswith('TAG_WITH_VERSION='):
            new_lines.append('TAG_WITH_VERSION=true')
        else:
            new_lines.append(line)

    new_content = '\n'.join(new_lines)
    build_config.write_text(new_content)
    print(f"✅ Aggiornato build.config -> VERSION={VERSION}, TAG_WITH_VERSION=true")
else:
    print(f"⚠️  File {build_config} non trovato")
# ============================================================================
# Aggiorna client-js/package.json
# ============================================================================
package_json = Path(__file__).parent / "client-js" / "package.json"
if package_json.exists():
    content = package_json.read_text()
    new_content = re.sub(
        r'"version":\s*"[^"]*"',
        f'"version": "{VERSION}"',
        content
    )
    package_json.write_text(new_content)
    print(f"✅ Aggiornato client-js/package.json -> {VERSION}")
else:
    print(f"⚠️  File {package_json} non trovato")

# ============================================================================
# Aggiorna client-python/pyproject.toml
# ============================================================================
pyproject_toml = Path(__file__).parent / "client" / "pyproject.toml"
if pyproject_toml.exists():
    content = pyproject_toml.read_text()

    # Metodo più robusto: cerca la riga che inizia con "version ="
    lines = content.split('\n')
    new_lines = []
    in_project_section = False
    version_updated = False

    for line in lines:
        # Rileva la sezione [project]
        if line.strip() == '[project]':
            in_project_section = True
            new_lines.append(line)
        # Rileva fine sezione [project]
        elif line.strip().startswith('[') and line.strip() != '[project]':
            in_project_section = False
            new_lines.append(line)
        # Aggiorna la riga version nella sezione [project]
        elif in_project_section and line.strip().startswith('version ='):
            new_lines.append(f'version = "{VERSION}"')
            version_updated = True
        else:
            new_lines.append(line)

    new_content = '\n'.join(new_lines)
    pyproject_toml.write_text(new_content)

    if version_updated:
        print(f"✅ Aggiornato client-python/pyproject.toml -> {VERSION}")
    else:
        print(f"⚠️  Versione non trovata in pyproject.toml")
else:
    print(f"⚠️  File {pyproject_toml} non trovato")

# ============================================================================
# Aggiorna client-python/setup.py (legacy, se esiste)
# ============================================================================
setup_py = Path(__file__).parent / "client-python" / "setup.py"
if setup_py.exists():
    content = setup_py.read_text()
    new_content = re.sub(
        r'version=["\'][^"\']*["\']',
        f'version="{VERSION}"',
        content
    )
    setup_py.write_text(new_content)
    print(f"✅ Aggiornato client-python/setup.py -> {VERSION}")

print(f"\n🎉 Tutte le versioni sincronizzate a {VERSION}")
