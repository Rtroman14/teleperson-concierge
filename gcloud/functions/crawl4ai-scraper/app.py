import asyncio
import nest_asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, BrowserConfig
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from bs4 import BeautifulSoup

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# Initialize FastAPI app
app = FastAPI()

# Define request/response models
class ScrapeRequest(BaseModel):
    urls: List[str]
    css_selector: Optional[str] = None
    excluded_selector: Optional[Union[str, List[str]]] = None

class ScrapeResult(BaseModel):
    url: str
    error: Optional[str]
    content: Optional[str]
    title: Optional[str]
    success: bool

class ScrapeResponse(BaseModel):
    success: bool
    data: Optional[List[ScrapeResult]]
    message: Optional[str]

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

async def clean_content(url, css_selector=None, excluded_selector=None):
    """
    Scrape and clean content from the provided URL.
    
    Args:
        url (str): The URL to scrape
        css_selector (str, optional): CSS selector to target specific content
        excluded_selector (list|str, optional): Selectors to exclude from scraping
        
    Returns:
        str: Cleaned markdown content
        
    Raises:
        Exception: If scraping or processing fails
    """
    async with AsyncWebCrawler(config=get_browser_config()) as crawler:
        result = await crawler.arun(
            url=url,
            config=get_crawler_config(css_selector, excluded_selector)
        )
        return result.markdown_v2.fit_markdown

async def clean_content_parallel(urls, css_selector=None, excluded_selector=None, max_concurrent=3):
    """
    Scrape and clean content from multiple URLs in parallel.
    Returns successful results and tracks failed URLs separately.
    """
    async with AsyncWebCrawler(config=get_browser_config()) as crawler:
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
                        'success': content is not None
                    })
        
        return results, has_errors

@app.post("/scrape", response_model=ScrapeResponse)
async def crawl_ai_scraper(request: ScrapeRequest):
    """FastAPI route to handle web scraping requests for multiple URLs."""
    try:
        results, has_errors = await clean_content_parallel(
            request.urls,
            css_selector=request.css_selector,
            excluded_selector=request.excluded_selector,
            max_concurrent=5
        )
        
        return ScrapeResponse(
            success=True,
            data=results,
            message='Some URLs failed to scrape' if has_errors else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to scrape URLs: {str(e)}'
        )

@app.get("/")
async def hello():
    """
    Simple GET route that returns Hello World.
    """
    return ScrapeResponse(
        success=True,
        data=["Hello World"],
        message='Successfully retrieved greeting'
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8080)
