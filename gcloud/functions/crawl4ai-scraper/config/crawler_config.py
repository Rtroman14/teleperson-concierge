from crawl4ai import CrawlerRunConfig, CacheMode
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

def get_crawler_config(css_selector=None, excluded_selector=None):
    """Return crawler configuration with content filtering and markdown generation settings."""
    base_excluded = ".nav, .footer"
    final_excluded = base_excluded
    if excluded_selector:
        if isinstance(excluded_selector, list):
            final_excluded = f"{base_excluded}, {', '.join(excluded_selector)}"
        else:
            final_excluded = f"{base_excluded}, {excluded_selector}"

    return CrawlerRunConfig(
        cache_mode=CacheMode.ENABLED,
        excluded_tags=[
            'nav', 'footer', 'aside', 'header',
            'button', 'input', 'script', 'style', 'img'
        ],
        excluded_selector=final_excluded,
        css_selector=css_selector,
        remove_forms=True,
        remove_overlay_elements=True,
        exclude_external_links=False,
        exclude_social_media_links=True,
        exclude_external_images=True,
        scan_full_page=True,
        markdown_generator=DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(
                threshold=0.48,
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