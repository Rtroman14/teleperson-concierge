import asyncio
from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler
from app.config.browser_config import get_browser_config, get_crawler_config

async def clean_content(url, css_selector=None, excluded_selector=None, use_proxy=False):
    """
    Scrape and clean content from the provided URL.
    """
    async with AsyncWebCrawler(config=get_browser_config(use_proxy)) as crawler:
        result = await crawler.arun(
            url=url,
            config=get_crawler_config(css_selector, excluded_selector)
        )
        return result.markdown_v2.fit_markdown

async def clean_content_parallel(urls, css_selector=None, excluded_selector=None, max_concurrent=3, use_proxy=False):
    """
    Scrape and clean content from multiple URLs in parallel.
    """
    async with AsyncWebCrawler(config=get_browser_config(use_proxy)) as crawler:
        results = []
        has_errors = False
        
        for i in range(0, len(urls), max_concurrent):
            batch = urls[i:i + max_concurrent]
            tasks = []
            
            for j, url in enumerate(batch):
                session_id = f"parallel_session_{i + j}"
                task = crawler.arun(
                    url=url,
                    config=get_crawler_config(css_selector, excluded_selector),
                    session_id=session_id
                )
                tasks.append(task)
            
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for url, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    has_errors = True
                    results.append({
                        'url': url,
                        'error': str(result),
                        'content': None,
                        'title': None,
                        'success': False
                    })
                else:
                    soup = BeautifulSoup(result.html, 'html.parser')
                    title = soup.title.string if soup.title else None
                    content = result.markdown_v2.fit_markdown if result and hasattr(result.markdown_v2, 'fit_markdown') else None

                    results.append({
                        'url': url,
                        'error': 'No content retrieved' if content is None else None,
                        'content': content,
                        'title': title,
                        'success': content is not None  # Only true if we actually got content
                    })
        
        return results, has_errors