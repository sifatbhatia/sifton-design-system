"""Shared browser configuration for the opt-in browser checks.

Serve the repository yourself; SIFTION_BASE_URL defaults to http://127.0.0.1:4186/.
SIFTION_BROWSER_EXECUTABLE overrides discovery (path or executable on PATH).
On Windows, installed Edge is preferred; otherwise use Playwright Chromium.
Install the fallback explicitly: uv run --with playwright python -m playwright install chromium
No browser is launched, downloaded, or server started when importing this module.
"""
from __future__ import annotations

import os
from pathlib import Path
import shutil
import sys
from typing import TYPE_CHECKING
from urllib.parse import urlsplit
import warnings

if TYPE_CHECKING:
    from playwright.sync_api import Browser, Playwright

DEFAULT_BASE_URL = "http://127.0.0.1:4186/"


def base_url() -> str:
    """Return a validated HTTP(S) project URL with one trailing slash."""
    value = os.environ.get("SIFTION_BASE_URL", DEFAULT_BASE_URL).strip()
    try:
        parsed = urlsplit(value)
        parsed.port  # Validate a supplied port as well as the host.
    except ValueError as error:
        raise ValueError(f"Invalid SIFTION_BASE_URL: {value!r}") from error
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname
            or parsed.query or parsed.fragment):
        raise ValueError("SIFTION_BASE_URL must be an HTTP(S) URL without a query or fragment")
    return value.rstrip("/") + "/"


def _configured_executable(value: str) -> str:
    candidate = Path(os.path.expandvars(value)).expanduser()
    if candidate.is_file():
        return str(candidate.resolve())
    found = shutil.which(str(candidate))
    if found:
        return found
    raise FileNotFoundError(
        f"SIFTION_BROWSER_EXECUTABLE does not name an existing executable: {value!r}"
    )


def _windows_edge() -> str | None:
    if sys.platform != "win32":
        return None
    for variable in ("PROGRAMFILES(X86)", "PROGRAMFILES", "LOCALAPPDATA"):
        directory = os.environ.get(variable)
        if directory:
            candidate = Path(directory) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
            if candidate.is_file():
                return str(candidate)
    return shutil.which("msedge.exe")


def launch_browser(playwright: Playwright, *, headless: bool = True) -> Browser:
    """Launch the explicit browser, discovered Edge, or managed Chromium.

    An invalid explicit override is an error, never a silent fallback. A failed
    auto-discovered Edge launch is reported before trying managed Chromium.
    """
    from playwright.sync_api import Error

    configured = os.environ.get("SIFTION_BROWSER_EXECUTABLE")
    if configured is not None:
        executable = _configured_executable(configured)
        try:
            return playwright.chromium.launch(executable_path=executable, headless=headless)
        except Error as error:
            raise RuntimeError(
                f"Could not launch SIFTION_BROWSER_EXECUTABLE={configured!r}; "
                "use an Edge or Chromium-compatible executable"
            ) from error

    edge = _windows_edge()
    if edge:
        try:
            return playwright.chromium.launch(executable_path=edge, headless=headless)
        except Error as error:
            warnings.warn(f"Installed Edge could not launch; trying Playwright Chromium: {error}",
                          RuntimeWarning, stacklevel=2)
    try:
        return playwright.chromium.launch(headless=headless)
    except Error as error:
        raise RuntimeError(
            "Could not launch Playwright Chromium. Install its browser with "
            "`uv run --with playwright python -m playwright install chromium` "
            "(Linux may also need `python -m playwright install-deps chromium`), "
            "or set SIFTION_BROWSER_EXECUTABLE to an Edge/Chromium executable."
        ) from error
