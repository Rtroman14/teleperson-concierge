from crawl4ai import BrowserConfig

def get_browser_config():
    """Return browser configuration for the web crawler."""
    return BrowserConfig(
        browser_type="chromium",
        headless=True,
        extra_args=[
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ],
        viewport_width=1920,
        viewport_height=6500,
        verbose=True
    ) 