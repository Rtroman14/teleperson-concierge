from app.config.browser_config import get_browser_config, get_crawler_config
from crawl4ai import AsyncWebCrawler, RateLimiter, MemoryAdaptiveDispatcher

async def clean_content_parallel(urls, css_selector=None, excluded_selector=None, max_concurrent=3, use_proxy=False):
    """
    Scrape and clean content from multiple URLs in parallel using the dispatcher pattern.
    """
    dispatcher = MemoryAdaptiveDispatcher(
        memory_threshold_percent=70.0,
        check_interval=1.0,
        max_session_permit=max_concurrent,
        rate_limiter=RateLimiter(       # Optional rate limiting
            base_delay=(1.0, 2.0),
            max_delay=30.0,
            max_retries=2
        ),
    )

    async with AsyncWebCrawler(config=get_browser_config(use_proxy)) as crawler:
        # Get all results at once
        results = await crawler.arun_many(
            urls=urls,
            config=get_crawler_config(css_selector, excluded_selector),
            dispatcher=dispatcher
        )
        
        processed_results = []
        has_errors = False
        
        for result in results:
            if result.success:
                title = result.metadata.get("title") or None
                description = result.metadata.get("description") or None
                content = result.markdown.fit_markdown if result and hasattr(result, 'markdown') else None

                processed_results.append({
                    'url': result.url,
                    'error': 'No content retrieved' if content is None else None,
                    'content': content,
                    'title': title,
                    'description': description,
                    'success': content is not None
                })
            else:
                has_errors = True
                processed_results.append({
                    'url': result.url,
                    'error': str(result.error_message) if hasattr(result, 'error_message') else str(result),
                    'content': None,
                    'title': None,
                    'success': False
                })
        
        return processed_results, has_errors