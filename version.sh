#!/bin/bash
# Script per gestire le versioni di OpenSecureConf

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VERSION_FILE="$SCRIPT_DIR/VERSION"

# Funzione per mostrare la versione corrente
show_version() {
    cat "$VERSION_FILE"
}

# Funzione per sincronizzare versione
sync_version() {
    python3 "$SCRIPT_DIR/sync_version.py"
}

# Funzione per incrementare patch (2.3.0 -> 2.3.1)
bump_patch() {
    VERSION=$(cat "$VERSION_FILE")
    IFS='.' read -ra PARTS <<< "$VERSION"
    MAJOR="${PARTS[0]}"
    MINOR="${PARTS[1]}"
    PATCH="${PARTS[2]}"
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    echo "$NEW_VERSION" > "$VERSION_FILE"
    echo "✅ Versione aggiornata a $NEW_VERSION"
    sync_version
}

# Funzione per incrementare minor (2.3.0 -> 2.4.0)
bump_minor() {
    VERSION=$(cat "$VERSION_FILE")
    IFS='.' read -ra PARTS <<< "$VERSION"
    MAJOR="${PARTS[0]}"
    MINOR="${PARTS[1]}"
    NEW_MINOR=$((MINOR + 1))
    NEW_VERSION="$MAJOR.$NEW_MINOR.0"
    echo "$NEW_VERSION" > "$VERSION_FILE"
    echo "✅ Versione aggiornata a $NEW_VERSION"
    sync_version
}

# Funzione per incrementare major (2.3.0 -> 3.0.0)
bump_major() {
    VERSION=$(cat "$VERSION_FILE")
    IFS='.' read -ra PARTS <<< "$VERSION"
    MAJOR="${PARTS[0]}"
    NEW_MAJOR=$((MAJOR + 1))
    NEW_VERSION="$NEW_MAJOR.0.0"
    echo "$NEW_VERSION" > "$VERSION_FILE"
    echo "✅ Versione aggiornata a $NEW_VERSION"
    sync_version
}

# Menu principale
case "$1" in
    version)
        show_version
        ;;
    sync)
        sync_version
        ;;
    patch)
        bump_patch
        ;;
    minor)
        bump_minor
        ;;
    major)
        bump_major
        ;;
    *)
        echo "OpenSecureConf - Gestione Versioni"
        echo ""
        echo "Uso: $0 {version|sync|patch|minor|major}"
        echo ""
        echo "  version - Mostra versione corrente"
        echo "  sync    - Sincronizza versione in tutti i file"
        echo "  patch   - Incrementa versione patch (2.3.0 -> 2.3.1)"
        echo "  minor   - Incrementa versione minor (2.3.0 -> 2.4.0)"
        echo "  major   - Incrementa versione major (2.3.0 -> 3.0.0)"
        exit 1
        ;;
esac
