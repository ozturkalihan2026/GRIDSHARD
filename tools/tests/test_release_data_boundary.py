from __future__ import annotations

import unittest

from tools.package_release import ROOT, STATIC_SERVER_DATA_FILES, release_files


class ReleaseDataBoundaryTests(unittest.TestCase):
    def test_only_static_arena_data_enters_source_release(self) -> None:
        data_files = {
            path.relative_to(ROOT).as_posix()
            for path in release_files()
            if path.relative_to(ROOT).as_posix().startswith("server/data/")
        }
        self.assertEqual(data_files, STATIC_SERVER_DATA_FILES)


if __name__ == "__main__":
    unittest.main()
