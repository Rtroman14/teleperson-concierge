from crawl4ai import BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_browser_config(use_proxy=False):
    """Return browser configuration for the web crawler."""

    proxy_config = None

    if use_proxy:
        proxy_config = {
            "server": os.getenv('PROXY_SERVER_DATACENTER'),
            "username": os.getenv('PROXY_USERNAME_DATACENTER'),
            "password": os.getenv('PROXY_PASSWORD_DATACENTER')
        }
        # proxy_config = {
        #     "server": os.getenv('PROXY_SERVER'),
        #     "username": os.getenv('PROXY_USERNAME'),
        #     "password": os.getenv('PROXY_PASSWORD')
        # }
    
    # print(f"PROXY_CONFIG: {proxy_config}")

    return BrowserConfig(
        browser_type="chromium",
        proxy_config=proxy_config,
        headless=True,
        text_mode=True,
        java_script_enabled=True,
        ignore_https_errors=True,
        # use_persistent_context=True, # throws an error
        # use_managed_browser=True, # required for use_persistent_context=True
        extra_args=[
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox"
        ],
        viewport_width=1920,
        viewport_height=1080,
        verbose=True,
        user_agent="random"
        # user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0"
    )

def get_crawler_config(css_selector=None, excluded_selector=None):
    """Return crawler configuration with content filtering and markdown generation settings."""
    base_excluded = """.nav, .footer, .elementor-button, [data-elementor-type="header"], 
        [style*="display: none"], [style*="visibility: hidden"]"""
    final_excluded = base_excluded
    if excluded_selector:
        if isinstance(excluded_selector, list):
            final_excluded = f"{base_excluded}, {', '.join(excluded_selector)}"
        else:
            final_excluded = f"{base_excluded}, {excluded_selector}"

    return CrawlerRunConfig(
        # cache_mode=CacheMode.ENABLED,
        cache_mode=CacheMode.DISABLED,
        excluded_tags=[
            'nav', 'footer', 'aside', 'header',
            'button', 'input', 'script', 'style', 'img', 'iframe', 'aside'
        ],
        excluded_selector=final_excluded,
        css_selector=css_selector,
        remove_forms=True,
        remove_overlay_elements=True,
        exclude_external_links=False,
        exclude_social_media_links=True,
        exclude_external_images=True,
        # override_navigator=True,
        scan_full_page=True,
        scroll_delay=1,
        page_timeout=60000,
        magic=True,
        wait_until="domcontentloaded",
        delay_before_return_html=0.5,
        adjust_viewport_to_content=False,
        process_iframes=False,
        simulate_user=True,
        # wait_for_images=True,
        markdown_generator=DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(
                threshold=0.5,
                threshold_type="fixed",
                min_word_threshold=0
            ),
            options={
                "ignore_links": False,
                "ignore_images": True,
                "skip_internal_links": False,
                "escape_html": True,
                "protect_links": False
            }
        )
    )