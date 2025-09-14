from datetime import datetime, timezone

def now_utc():
    """
    คืนค่าเวลาปัจจุบันแบบ timezone-aware (UTC)
    """
    return datetime.now(timezone.utc)
