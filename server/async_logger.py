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

Asynchronous, structured logging module that does not slow down application
execution. Uses structlog for JSON output and an asynchronous queue for writing.
Includes information about file, line, class, and function where the log
originated.
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
    """Handler that writes logs asynchronously using a queue."""

    def __init__(self, queue: Queue):
        super().__init__()
        self.queue = queue

    def emit(self, record: logging.LogRecord) -> None:
        """Put the record into the queue without blocking."""
        try:
            self.queue.put_nowait(record)
        except Exception:
            self.handleError(record)


class AsyncLogWriter:
    """Background writer that consumes logs from the queue asynchronously."""

    def __init__(self, handlers: list):
        self.queue = Queue(maxsize=10000)  # Buffer for up to 10k messages
        self.handlers = handlers
        self.running = False
        self.thread: Optional[Thread] = None

    def start(self):
        """Start the background writer thread."""
        if self.running:
            return

        self.running = True
        self.thread = Thread(target=self._process_queue, daemon=True)
        self.thread.start()

    def stop(self):
        """Stop the background writer thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

    def _process_queue(self):
        """Continuously read log records from the queue and dispatch them."""
        while self.running:
            try:
                record = self.queue.get(timeout=0.1)
                for handler in self.handlers:
                    handler.handle(record)
            except Exception:  # nosec B112
                continue


def add_timestamp(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add an ISO8601 UTC timestamp to the log event."""
    event_dict["timestamp"] = datetime.utcnow().isoformat() + "Z"
    return event_dict


def add_log_level(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add the log level to the event."""
    event_dict["level"] = method_name.upper()
    return event_dict


def add_node_info(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add node information to the event, if available."""
    node_id = os.getenv("OSC_CLUSTER_NODE_ID", "unknown")
    event_dict["node_id"] = node_id
    return event_dict


def add_code_location(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    Add source code location information to the log event.

    Includes: file name, line number, function/method and a compact location
    string suitable for console output.
    """
    # structlog passes callsite information via CallsiteParameterAdder;
    # here the data is normalized into a clearer shape.

    filename = event_dict.pop("filename", None)
    lineno = event_dict.pop("lineno", None)
    func_name = event_dict.pop("func_name", None)

    if filename:
        # Use only the file name, without the full path
        event_dict["file"] = os.path.basename(filename)

    if lineno:
        event_dict["line"] = lineno

    if func_name:
        # If the function contains ".", it is usually a method
        # otherwise it is a plain function
        event_dict["function"] = func_name

    # Build a compact location string for console format
    if filename and lineno:
        location_parts = [os.path.basename(filename)]
        if func_name:
            location_parts.append(func_name)
        location_parts.append(str(lineno))
        event_dict["location"] = ":".join(location_parts)

    return event_dict


def _parse_log_level(level_str: str) -> int:
    """
    Convert a log level string into a logging module constant.

    Args:
        level_str: Level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Corresponding logging constant, defaulting to INFO if the value
        is invalid.
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

    # Warning for invalid level (uses print because logger is not configured yet)
    print(
        f"⚠️  OSC_LOG_LEVEL invalid: '{level_str}'. "
        "Accepted values: DEBUG, INFO, WARNING, ERROR, CRITICAL. Using INFO as default.",
        file=sys.stderr,
    )
    return logging.INFO


class StructuredLogger:
    """Main class for asynchronous, structured logging."""

    _instance: Optional["StructuredLogger"] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Read OSC_LOG_LEVEL with validation
        log_level_str = os.getenv("OSC_LOG_LEVEL", "INFO")
        self.log_level_int = _parse_log_level(log_level_str)
        self.log_level_name = logging.getLevelName(self.log_level_int)

        self.log_format = os.getenv("OSC_LOG_FORMAT", "json")  # json or console
        self.log_file = os.getenv("OSC_LOG_FILE", None)

        self._setup_logging()
        self._initialized = True

        # Initialization log message
        logger = self.get_logger(__name__)
        logger.info(
            "logging_initialized",
            level=self.log_level_name,
            format=self.log_format,
            file=self.log_file or "stdout",
            async_buffer_size=10000,
        )

    def _setup_logging(self):
        """Configure structlog and asynchronous logging."""

        # structlog processors configuration
        processors: list[Processor] = [
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            # IMPORTANT: Add file, line and function information
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
            add_code_location,  # Process location information
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
        ]

        # Output format
        if self.log_format == "json":
            processors.append(structlog.processors.JSONRenderer())
        else:
            processors.append(structlog.dev.ConsoleRenderer())

        # Handlers for asynchronous writing
        handlers = []

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.log_level_int)
        console_formatter = logging.Formatter("%(message)s")
        console_handler.setFormatter(console_formatter)
        handlers.append(console_handler)

        # File handler if configured
        if self.log_file:
            try:
                # Create directory if it does not exist
                log_dir = os.path.dirname(self.log_file)
                if log_dir and not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)

                file_handler = logging.handlers.RotatingFileHandler(
                    self.log_file,
                    maxBytes=100 * 1024 * 1024,  # 100MB
                    backupCount=5,
                    encoding="utf-8",
                )
                file_handler.setLevel(self.log_level_int)
                file_formatter = logging.Formatter("%(message)s")
                file_handler.setFormatter(file_formatter)
                handlers.append(file_handler)
            except Exception as e:
                print(
                    f"⚠️  Unable to create file handler for {self.log_file}: {e}",
                    file=sys.stderr,
                )

        # Start async writer
        self.async_writer = AsyncLogWriter(handlers)
        self.async_writer.start()

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(self.log_level_int)
        root_logger.handlers.clear()

        # Add async handler
        async_handler = AsyncQueueHandler(self.async_writer.queue)
        root_logger.addHandler(async_handler)

        # Configure structlog
        structlog.configure(
            processors=processors,
            wrapper_class=structlog.make_filtering_bound_logger(
                self.log_level_int
            ),
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    def get_logger(self, name: str = __name__) -> structlog.stdlib.BoundLogger:
        """Return a structured logger bound to the given name."""
        return structlog.get_logger(name)

    def get_log_level(self) -> str:
        """Return the current log level as a string."""
        return self.log_level_name

    def set_log_level(self, level: str):
        """
        Change the log level at runtime.

        Args:
            level: New level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        new_level_int = _parse_log_level(level)
        new_level_name = logging.getLevelName(new_level_int)

        # Update all handlers
        root_logger = logging.getLogger()
        root_logger.setLevel(new_level_int)

        for handler in root_logger.handlers:
            handler.setLevel(new_level_int)

        # Update instance state
        old_level = self.log_level_name
        self.log_level_int = new_level_int
        self.log_level_name = new_level_name

        # Log the change
        logger = self.get_logger(__name__)
        logger.info(
            "log_level_changed", old_level=old_level, new_level=new_level_name
        )

    def shutdown(self):
        """Shutdown the logging system gracefully."""
        if hasattr(self, "async_writer"):
            logger = self.get_logger(__name__)
            logger.info("logging_shutdown")
            self.async_writer.stop()


# Global instance
_logger_instance = StructuredLogger()


def get_logger(name: str = __name__) -> structlog.stdlib.BoundLogger:
    """
    Helper function to obtain a structured logger.

    Args:
        name: Logger name (typically __name__)

    Returns:
        A structured logger ready to use.

    Example:
        logger = get_logger(__name__)
        logger.info("operation_completed", user_id=123, duration_ms=45)
        logger.debug("debug_details", data={"key": "value"})
        logger.error("critical_error", error=str(e), exc_info=True)

    Example JSON output:
        {
            "timestamp": "2026-01-14T08:43:12.456Z",
            "level": "INFO",
            "event": "operation_completed",
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
    Return the current log level.

    Returns:
        Current level name (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    return _logger_instance.get_log_level()


def set_log_level(level: str):
    """
    Change the log level at runtime.

    Args:
        level: New level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Example:
        set_log_level("DEBUG")  # Enable detailed logging
        set_log_level("ERROR")  # Show only errors
    """
    _logger_instance.set_log_level(level)


def shutdown_logger():
    """Shutdown the logging system cleanly."""
    _logger_instance.shutdown()
