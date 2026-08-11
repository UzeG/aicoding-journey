import threading
import time
from datetime import datetime, timezone

# Snowflake ID generator
# Layout: [0] [41-bit timestamp] [5-bit datacenter] [5-bit machine] [12-bit sequence]

EPOCH = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)
DATACENTER_ID = 1
MACHINE_ID = 1
SEQUENCE_BITS = 12
MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1

_lock = threading.Lock()
_sequence = 0
_last_timestamp = -1


def _current_millis() -> int:
    return int(time.time() * 1000)


def generate_id() -> int:
    """Generate a Snowflake ID."""
    global _sequence, _last_timestamp

    with _lock:
        timestamp = _current_millis()

        if timestamp < _last_timestamp:
            # Clock moved backwards, wait until caught up
            timestamp = _last_timestamp

        if timestamp == _last_timestamp:
            _sequence = (_sequence + 1) & MAX_SEQUENCE
            if _sequence == 0:
                # Sequence exhausted, wait for next millisecond
                while timestamp <= _last_timestamp:
                    timestamp = _current_millis()
        else:
            _sequence = 0

        _last_timestamp = timestamp

        return (
            ((timestamp - EPOCH) << 22)
            | (DATACENTER_ID << 17)
            | (MACHINE_ID << 12)
            | _sequence
        )


# Base62 characters
BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


def to_base62(num: int) -> str:
    """Encode integer to Base62 string."""
    if num == 0:
        return BASE62[0]
    chars = []
    while num > 0:
        chars.append(BASE62[num % 62])
        num //= 62
    return "".join(reversed(chars))


def generate_short_code() -> str:
    """Generate a short code from Snowflake ID."""
    sid = generate_id()
    return to_base62(sid)[-7:]
