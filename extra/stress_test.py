#!/usr/bin/env python3
"""
Stress test per OpenSecureConf cluster
- Scrive 300 configurazioni random
- Le rilegge tutte per verificare
- Test concorrenti per stressare il load balancer
- Cleanup opzionale delle chiavi create
"""

import requests
import random
import string
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Configurazione
BASE_URL = "http://192.168.0.215:9000"
API_KEY = "cluster-secret-key-123"
USER_KEY = "test-encryption-key-12345"
NUM_CONFIGS = 300
MAX_WORKERS = 20  # Thread concorrenti

CATEGORIES = ["database", "api", "service", "cache", "queue", "storage", "network"]

def check_cluster_status():
    """Verifica configurazione e stato del cluster"""
    print("\n" + "=" * 70)
    print("📡 STATO CLUSTER")
    print("=" * 70)

    # Health check
    try:
        response = requests.get(f"{BASE_URL}/cluster/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"✓ Nodo attivo: {health.get('node_id', 'N/A')}")
            print(f"  Status: {health.get('status', 'N/A')}")
        else:
            print(f"⚠️  Health check fallito: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cluster non raggiungibile: {e}")
        return False

    # Cluster status (configurazione)
    try:
        headers = {"X-API-Key": API_KEY}
        response = requests.get(f"{BASE_URL}/cluster/status", headers=headers, timeout=10)
        if response.status_code == 200:
            status = response.json()
            print(f"\n🔧 CONFIGURAZIONE CLUSTER:")
            print(f"  • Cluster abilitato: {status.get('enabled', 'N/A')}")
            print(f"  • Modalità: {status.get('mode', 'N/A').upper()}")
            print(f"  • Node ID: {status.get('node_id', 'N/A')}")
            print(f"  • Nodi totali: {status.get('total_nodes', 'N/A')}")
            print(f"  • Nodi healthy: {status.get('healthy_nodes', 'N/A')}")

            if 'nodes' in status and status['nodes']:
                print(f"\n  📋 Nodi nel cluster:")
                for node in status['nodes']:
                    health_icon = "✓" if node.get('is_healthy') else "✗"
                    print(f"     {health_icon} {node.get('node_id')} (healthy: {node.get('is_healthy')})")
        else:
            print(f"⚠️  Impossibile ottenere cluster status: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Errore nel recupero cluster status: {e}")

    print("=" * 70)
    return True

def generate_random_config():
    """Genera una configurazione random"""
    key = f"test_key_{random.randint(10000, 99999)}"
    value = {
        "host": f"server-{random.randint(1, 100)}.example.com",
        "port": random.randint(1000, 9999),
        "username": ''.join(random.choices(string.ascii_lowercase, k=8)),
        "password": ''.join(random.choices(string.ascii_letters + string.digits, k=16)),
        "enabled": random.choice([True, False]),
        "timeout": random.randint(10, 300),
        "metadata": {
            "created": datetime.now().isoformat(),
            "version": f"{random.randint(1,5)}.{random.randint(0,9)}.{random.randint(0,20)}"
        }
    }
    category = random.choice(CATEGORIES)
    return key, value, category

def create_config(data):
    """Crea una singola configurazione"""
    idx, key, value, category = data
    headers = {
        "X-API-Key": API_KEY,
        "X-User-Key": USER_KEY,
        "Content-Type": "application/json"
    }
    payload = {"key": key, "value": value, "category": category}

    try:
        response = requests.post(
            f"{BASE_URL}/configs",
            headers=headers,
            json=payload,
            timeout=30
        )
        if response.status_code in [200, 201]:
            return {"success": True, "key": key, "idx": idx}
        else:
            return {"success": False, "key": key, "idx": idx, "error": response.text}
    except Exception as e:
        return {"success": False, "key": key, "idx": idx, "error": str(e)}

def read_config(data):
    """Legge una singola configurazione"""
    idx, key = data
    headers = {"X-API-Key": API_KEY, "X-User-Key": USER_KEY}

    try:
        response = requests.get(f"{BASE_URL}/configs/{key}", headers=headers, timeout=10)
        if response.status_code == 200:
            return {"success": True, "key": key, "idx": idx, "data": response.json()}
        else:
            return {"success": False, "key": key, "idx": idx, "error": response.status_code}
    except Exception as e:
        return {"success": False, "key": key, "idx": idx, "error": str(e)}

def delete_config(key):
    """Elimina una singola configurazione"""
    headers = {"X-API-Key": API_KEY, "X-User-Key": USER_KEY}

    try:
        response = requests.delete(f"{BASE_URL}/configs/{key}", headers=headers, timeout=10)
        if response.status_code in [200, 204]:
            return {"success": True, "key": key}
        else:
            return {"success": False, "key": key, "error": response.status_code}
    except Exception as e:
        return {"success": False, "key": key, "error": str(e)}

def list_all_configs():
    """Lista tutte le configurazioni"""
    headers = {"X-API-Key": API_KEY, "X-User-Key": USER_KEY}

    try:
        response = requests.get(f"{BASE_URL}/configs", headers=headers, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            return []
    except Exception as e:
        print(f"⚠️  Errore nel listing: {e}")
        return []

def cleanup_configs(keys_to_delete):
    """Cancella le configurazioni specificate"""
    print("\n" + "=" * 70)
    print("🗑️  CLEANUP - Cancellazione configurazioni")
    print("=" * 70)
    print(f"\nConfigurazioni da cancellare: {len(keys_to_delete)}")

    start_time = time.time()
    deleted_count = 0
    error_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(delete_config, key) for key in keys_to_delete]

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result["success"]:
                deleted_count += 1
            else:
                error_count += 1

            if i % 50 == 0:
                print(f"   Progresso: {i}/{len(keys_to_delete)} - Cancellate: {deleted_count}, Errori: {error_count}")

    cleanup_duration = time.time() - start_time

    print(f"\n   ✓ Cleanup completato in {cleanup_duration:.2f}s")
    print(f"   ✓ Cancellate: {deleted_count}/{len(keys_to_delete)}")
    print(f"   ✓ Errori: {error_count}")
    print(f"   ✓ Velocità: {deleted_count/cleanup_duration:.2f} delete/sec")

    return deleted_count, error_count

def run_stress_test(args):
    """Esegue lo stress test completo"""
    print("=" * 70)
    print("🚀 STRESS TEST OpenSecureConf Cluster")
    print("=" * 70)

    # Verifica stato cluster
    if not check_cluster_status():
        print("\n❌ Impossibile procedere: cluster non disponibile")
        return

    # Genera configurazioni
    print(f"\n📝 Generazione di {NUM_CONFIGS} configurazioni random...")
    configs_data = []
    for i in range(NUM_CONFIGS):
        key, value, category = generate_random_config()
        configs_data.append((i, key, value, category))

    created_keys = []

    # FASE 1: Scrittura concorrente
    print(f"\n✍️  FASE 1: Scrittura concorrente ({MAX_WORKERS} thread)...")
    start_time = time.time()
    success_count = 0
    error_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(create_config, data) for data in configs_data]

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result["success"]:
                success_count += 1
                created_keys.append(result["key"])
            else:
                error_count += 1

            if i % 50 == 0:
                print(f"   Progresso: {i}/{NUM_CONFIGS} - Success: {success_count}, Errori: {error_count}")

    write_duration = time.time() - start_time
    write_rate = success_count / write_duration if write_duration > 0 else 0

    print(f"\n   ✓ Scritture completate in {write_duration:.2f}s")
    print(f"   ✓ Success: {success_count}/{NUM_CONFIGS} ({success_count/NUM_CONFIGS*100:.1f}%)")
    print(f"   ✓ Errori: {error_count}")
    print(f"   ✓ Velocità: {write_rate:.2f} write/sec")

    # FASE 2: Lettura concorrente
    print(f"\n📖 FASE 2: Lettura concorrente ({MAX_WORKERS} thread)...")
    start_time = time.time()
    read_success = 0
    read_errors = 0

    read_data = [(i, key) for i, key in enumerate(created_keys)]

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(read_config, data) for data in read_data]

        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result["success"]:
                read_success += 1
            else:
                read_errors += 1

            if i % 50 == 0:
                print(f"   Progresso: {i}/{len(created_keys)} - Success: {read_success}, Errori: {read_errors}")

    read_duration = time.time() - start_time
    read_rate = read_success / read_duration if read_duration > 0 else 0

    print(f"\n   ✓ Letture completate in {read_duration:.2f}s")
    print(f"   ✓ Success: {read_success}/{len(created_keys)} ({read_success/len(created_keys)*100:.1f}%)")
    print(f"   ✓ Errori: {read_errors}")
    print(f"   ✓ Velocità: {read_rate:.2f} read/sec")

    # FASE 3: List all
    print(f"\n📋 FASE 3: List di tutte le configurazioni...")
    start_time = time.time()
    all_configs = list_all_configs()
    list_duration = time.time() - start_time

    print(f"   ✓ List completato in {list_duration:.2f}s")
    print(f"   ✓ Configurazioni totali nel cluster: {len(all_configs)}")

    # FASE 4: Burst test
    print(f"\n⚡ FASE 4: Burst test (100 richieste in parallelo)...")
    start_time = time.time()
    burst_keys = random.sample([(i, k) for i, k in enumerate(created_keys)], min(100, len(created_keys)))
    burst_success = 0

    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(read_config, data) for data in burst_keys]
        for future in as_completed(futures):
            if future.result()["success"]:
                burst_success += 1

    burst_duration = time.time() - start_time
    burst_rate = burst_success / burst_duration if burst_duration > 0 else 0

    print(f"   ✓ Burst completato in {burst_duration:.2f}s")
    print(f"   ✓ Velocità burst: {burst_rate:.2f} req/sec")

    # Riepilogo finale
    print("\n" + "=" * 70)
    print("📊 RIEPILOGO STRESS TEST")
    print("=" * 70)
    print(f"Configurazioni scritte:  {success_count}/{NUM_CONFIGS} ({success_count/NUM_CONFIGS*100:.1f}%)")
    print(f"Configurazioni lette:    {read_success}/{len(created_keys)} ({read_success/len(created_keys)*100:.1f}%)")
    print(f"Velocità scrittura:      {write_rate:.2f} write/sec")
    print(f"Velocità lettura:        {read_rate:.2f} read/sec")
    print(f"Velocità burst:          {burst_rate:.2f} req/sec")
    print(f"Tempo totale:            {write_duration + read_duration + list_duration + burst_duration:.2f}s")

    # Cleanup se richiesto
    if args.cleanup:
        deleted, errors = cleanup_configs(created_keys)
        print(f"\n✅ Stress test completato + cleanup ({deleted} chiavi cancellate)")
    else:
        print(f"\n✅ Stress test completato!")
        print(f"\n💡 Per cancellare le {len(created_keys)} chiavi create, esegui:")
        print(f"   python3 stress_test.py --cleanup-all")

    print("=" * 70)

def cleanup_all_test_keys():
    """Cancella tutte le chiavi di test (che iniziano con test_key_)"""
    print("=" * 70)
    print("🗑️  CLEANUP COMPLETO - Ricerca chiavi di test")
    print("=" * 70)

    # Lista tutte le configurazioni
    print("\n📋 Recupero lista configurazioni...")
    all_configs = list_all_configs()

    # Filtra solo le chiavi di test
    test_keys = [cfg.get('key') for cfg in all_configs if cfg.get('key', '').startswith('test_key_')]

    if not test_keys:
        print("\n✓ Nessuna chiave di test trovata da cancellare")
        return

    print(f"\n🔍 Trovate {len(test_keys)} chiavi di test da cancellare")

    # Conferma utente
    response = input(f"\n⚠️  Confermi la cancellazione di {len(test_keys)} chiavi? (yes/no): ")
    if response.lower() != 'yes':
        print("\n❌ Operazione annullata")
        return

    # Procedi con la cancellazione
    deleted, errors = cleanup_configs(test_keys)

    print(f"\n✅ Cleanup completato: {deleted} chiavi cancellate, {errors} errori")

def main():
    parser = argparse.ArgumentParser(
        description='Stress test per OpenSecureConf cluster',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi:
  %(prog)s                    # Esegue stress test senza cleanup
  %(prog)s --cleanup          # Esegue stress test e cancella le chiavi create
  %(prog)s --cleanup-all      # Cancella TUTTE le chiavi di test esistenti
  %(prog)s --status-only      # Mostra solo lo stato del cluster
        """
    )

    parser.add_argument(
        '--cleanup',
        action='store_true',
        help='Cancella le chiavi create dopo il test'
    )

    parser.add_argument(
        '--cleanup-all',
        action='store_true',
        help='Cancella TUTTE le chiavi di test (test_key_*) senza eseguire il test'
    )

    parser.add_argument(
        '--status-only',
        action='store_true',
        help='Mostra solo lo stato del cluster senza eseguire il test'
    )

    args = parser.parse_args()

    if args.status_only:
        # Solo verifica stato
        check_cluster_status()
    elif args.cleanup_all:
        # Solo cleanup completo
        cleanup_all_test_keys()
    else:
        # Esegue lo stress test
        run_stress_test(args)

if __name__ == "__main__":
    main()


# # Installare dipendenze
# pip install requests

# # Eseguire il test base (senza cancellare)
# python3 stress_test.py

# # Eseguire il test E cancellare le chiavi dopo
# python3 stress_test.py --cleanup

# # Solo vedere lo stato del cluster
# python3 stress_test.py --status-only

# # Cancellare tutte le chiavi test_key_* esistenti
# python3 stress_test.py --cleanup-all
