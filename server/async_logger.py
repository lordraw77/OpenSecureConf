# pylint: disable=broad-except
# pylint: disable=unused-argument
# pylint: disable=line-too-long
# pylint: disable=unused-variable
# pylint: disable=unused-import
# pylint: disable=consider-using-with
# pylint: disable=no-else-return
# pylint: disable=too-many-instance-attributes
# pylint: disable=too-many-arguments
# pylint: disable=too-many-positional-arguments

"""
OpenSecureConf - Async Structured Logger Module

Modulo per logging strutturato e asincrono che non rallenta l'esecuzione.
Utilizza structlog per output JSON e una queue asincrona per la scrittura.
Include informazioni su file, riga, classe e funzione di origine del log.
"""

import os
from queue import Queue
from threading import Thread

import asyncio
import logging
import logging.handlers
import sys
from typing import Any, Dict, Optional
from datetime import datetime
import structlog
from structlog.types import EventDict, Processor



class AsyncQueueHandler(logging.Handler):
    """Handler che scrive i log in modo asincrono usando una queue."""

    def __init__(self, queue: Queue):
        super().__init__()
        self.queue = queue

    def emit(self, record: logging.LogRecord) -> None:
        """Mette il record nella queue senza bloccare."""
        try:
            self.queue.put_nowait(record)
        except Exception:
            self.handleError(record)


class AsyncLogWriter:
    """Scrive i log dalla queue in modo asincrono."""

    def __init__(self, handlers: list):
        self.queue = Queue(maxsize=10000)  # Buffer per 10k messaggi
        self.handlers = handlers
        self.running = False
        self.thread: Optional[Thread] = None

    def start(self):
        """Avvia il thread di scrittura."""
        if self.running:
            return

        self.running = True
        self.thread = Thread(target=self._process_queue, daemon=True)
        self.thread.start()

    def stop(self):
        """Ferma il thread di scrittura."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

    def _process_queue(self):
        """Processa i log dalla queue."""
        while self.running:
            try:
                record = self.queue.get(timeout=0.1)
                for handler in self.handlers:
                    handler.handle(record)
            except Exception: # nosec B112
                continue


def add_timestamp(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Aggiunge timestamp ISO8601 al log."""
    event_dict["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return event_dict


def add_log_level(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Aggiunge il livello di log."""
    event_dict["level"] = method_name.upper()
    return event_dict


def add_node_info(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Aggiunge informazioni sul nodo se disponibili."""
    node_id = os.getenv("OSC_CLUSTER_NODE_ID", "unknown")
    event_dict["node_id"] = node_id
    return event_dict


def add_code_location(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    Aggiunge informazioni sulla posizione del codice che ha generato il log.
    Include: file, riga, funzione/metodo e classe (se disponibile).
    """
    # structlog passa automaticamente le info dal frame tramite CallsiteParameterAdder
    # Qui le riorganizziamo in un formato più chiaro

    filename = event_dict.pop("filename", None)
    lineno = event_dict.pop("lineno", None)
    func_name = event_dict.pop("func_name", None)

    if filename:
        # Usa solo il nome del file senza path completo
        event_dict["file"] = os.path.basename(filename)

    if lineno:
        event_dict["line"] = lineno

    if func_name:
        # Se la funzione contiene "." è un metodo di classe
        # Altrimenti è una funzione normale
        event_dict["function"] = func_name

    # Costruisce una location compatta per console format
    if filename and lineno:
        location_parts = [os.path.basename(filename)]
        if func_name:
            location_parts.append(func_name)
        location_parts.append(str(lineno))
        event_dict["location"] = ":".join(location_parts)

    return event_dict


def _parse_log_level(level_str: str) -> int:
    """
    Converte una stringa di livello log in costante logging.

    Args:
        level_str: Stringa del livello (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Costante logging corrispondente, default INFO se invalido
    """
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "WARN": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
        "FATAL": logging.CRITICAL,
    }

    level_upper = level_str.upper().strip()

    if level_upper in level_map:
        return level_map[level_upper]

    # Log di warning per livello invalido (usa print perché il logger non è ancora configurato)
    print(f"⚠️  OSC_LOG_LEVEL invalido: '{level_str}'. Valori accettati: DEBUG, INFO, WARNING, ERROR, CRITICAL. Uso INFO come default.",
          file=sys.stderr)
    return logging.INFO


class StructuredLogger:
    """Classe principale per il logging strutturato e asincrono."""

    _instance: Optional['StructuredLogger'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Legge OSC_LOG_LEVEL con validazione
        log_level_str = os.getenv("OSC_LOG_LEVEL", "INFO")
        self.log_level_int = _parse_log_level(log_level_str)
        self.log_level_name = logging.getLevelName(self.log_level_int)

        self.log_format = os.getenv("OSC_LOG_FORMAT", "json")  # json or console
        self.log_file = os.getenv("OSC_LOG_FILE", None)

        self._setup_logging()
        self._initialized = True

        # Log di inizializzazione
        logger = self.get_logger(__name__)
        logger.info("logging_initialized",
                   level=self.log_level_name,
                   format=self.log_format,
                   file=self.log_file or "stdout",
                   async_buffer_size=10000)

    def _setup_logging(self):
        """Configura structlog e il logging asincrono."""

        # Configurazione processori structlog
        processors: list[Processor] = [
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            # IMPORTANTE: Aggiunge info su file, riga e funzione
            structlog.processors.CallsiteParameterAdder(
                parameters=[
                    structlog.processors.CallsiteParameter.FILENAME,
                    structlog.processors.CallsiteParameter.FUNC_NAME,
                    structlog.processors.CallsiteParameter.LINENO,
                ]
            ),
            add_timestamp,
            add_log_level,
            add_node_info,
            add_code_location,  # Processa le informazioni di location
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
        ]

        # Formato output
        if self.log_format == "json":
            processors.append(structlog.processors.JSONRenderer())
        else:
            processors.append(structlog.dev.ConsoleRenderer())

        # Setup handlers per scrittura asincrona
        handlers = []

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.log_level_int)
        console_formatter = logging.Formatter('%(message)s')
        console_handler.setFormatter(console_formatter)
        handlers.append(console_handler)

        # File handler se specificato
        if self.log_file:
            try:
                # Crea directory se non esiste
                log_dir = os.path.dirname(self.log_file)
                if log_dir and not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)

                file_handler = logging.handlers.RotatingFileHandler(
                    self.log_file,
                    maxBytes=100*1024*1024,  # 100MB
                    backupCount=5,
                    encoding='utf-8'
                )
                file_handler.setLevel(self.log_level_int)
                file_formatter = logging.Formatter('%(message)s')
                file_handler.setFormatter(file_formatter)
                handlers.append(file_handler)
            except Exception as e:
                print(f"⚠️  Impossibile creare file handler per {self.log_file}: {e}",
                      file=sys.stderr)

        # Avvia writer asincrono
        self.async_writer = AsyncLogWriter(handlers)
        self.async_writer.start()

        # Configura logging root
        root_logger = logging.getLogger()
        root_logger.setLevel(self.log_level_int)
        root_logger.handlers.clear()

        # Aggiungi async handler
        async_handler = AsyncQueueHandler(self.async_writer.queue)
        root_logger.addHandler(async_handler)

        # Configura structlog
        structlog.configure(
            processors=processors,
            wrapper_class=structlog.make_filtering_bound_logger(self.log_level_int),
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    def get_logger(self, name: str = __name__) -> structlog.stdlib.BoundLogger:
        """Ottiene un logger strutturato."""
        return structlog.get_logger(name)

    def get_log_level(self) -> str:
        """Ritorna il livello di log corrente come stringa."""
        return self.log_level_name

    def set_log_level(self, level: str):
        """
        Cambia il livello di log a runtime.

        Args:
            level: Nuovo livello (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        new_level_int = _parse_log_level(level)
        new_level_name = logging.getLevelName(new_level_int)

        # Aggiorna tutti gli handler
        root_logger = logging.getLogger()
        root_logger.setLevel(new_level_int)

        for handler in root_logger.handlers:
            handler.setLevel(new_level_int)

        # Aggiorna l'istanza
        old_level = self.log_level_name
        self.log_level_int = new_level_int
        self.log_level_name = new_level_name

        # Log del cambio
        logger = self.get_logger(__name__)
        logger.info("log_level_changed",
                   old_level=old_level,
                   new_level=new_level_name)

    def shutdown(self):
        """Chiude il sistema di logging."""
        if hasattr(self, 'async_writer'):
            logger = self.get_logger(__name__)
            logger.info("logging_shutdown")
            self.async_writer.stop()


# Istanza globale
_logger_instance = StructuredLogger()


def get_logger(name: str = __name__) -> structlog.stdlib.BoundLogger:
    """
    Funzione helper per ottenere un logger strutturato.

    Args:
        name: Nome del logger (solitamente __name__)

    Returns:
        Logger strutturato pronto all'uso

    Esempio:
        logger = get_logger(__name__)
        logger.info("operazione_completata", user_id=123, duration_ms=45)
        logger.debug("dettaglio_debug", data={"key": "value"})
        logger.error("errore_critico", error=str(e), exc_info=True)

    Output JSON includerà:
        {
            "timestamp": "2026-01-14T08:43:12.456Z",
            "level": "INFO",
            "event": "operazione_completata",
            "file": "api.py",
            "line": 142,
            "function": "create_configuration",
            "location": "api.py:create_configuration:142",
            "node_id": "node-9000",
            "user_id": 123,
            "duration_ms": 45
        }
    """
    return _logger_instance.get_logger(name)


def get_log_level() -> str:
    """
    Ritorna il livello di log corrente.

    Returns:
        Nome del livello corrente (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    return _logger_instance.get_log_level()


def set_log_level(level: str):
    """
    Cambia il livello di log a runtime.

    Args:
        level: Nuovo livello (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Esempio:
        set_log_level("DEBUG")  # Abilita logging dettagliato
        set_log_level("ERROR")  # Mostra solo errori
    """
    _logger_instance.set_log_level(level)


def shutdown_logger():
    """Chiude il sistema di logging in modo pulito."""
    _logger_instance.shutdown()
