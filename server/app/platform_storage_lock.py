"""Reentrant process/thread lock for the platform JSON transaction boundary."""

from pathlib import Path
import os
import threading
import time


class PlatformStorageLock:
    def __init__(self, path: Path):
        self.path = path.with_name(path.name + ".lock")
        self._thread_lock = threading.RLock()
        self._depth = 0
        self._file = None

    def __enter__(self):
        self._thread_lock.acquire()
        try:
            if self._depth == 0:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                handle = self.path.open("a+b")
                try:
                    # Windows byte-range locking needs a byte to lock. The file
                    # is persistent: unlinking it would allow two lock inodes.
                    if handle.seek(0, os.SEEK_END) == 0:
                        handle.write(b"\0")
                        handle.flush()
                    deadline = time.monotonic() + 5
                    while True:
                        handle.seek(0)
                        try:
                            if os.name == "nt":
                                import msvcrt
                                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                            else:
                                import fcntl
                                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                            break
                        except OSError:
                            if time.monotonic() >= deadline:
                                raise TimeoutError("Platform storage is busy") from None
                            time.sleep(.02)
                except BaseException:
                    handle.close()
                    raise
                self._file = handle
            self._depth += 1
            return self
        except BaseException:
            self._thread_lock.release()
            raise

    def __exit__(self, *_args):
        try:
            self._depth -= 1
            if self._depth == 0 and self._file is not None:
                try:
                    self._file.seek(0)
                    if os.name == "nt":
                        import msvcrt
                        msvcrt.locking(self._file.fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(self._file.fileno(), fcntl.LOCK_UN)
                finally:
                    self._file.close()
                    self._file = None
        finally:
            self._thread_lock.release()
