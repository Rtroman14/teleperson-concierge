from fastapi import HTTPException
from app.models.schemas import (
    ScrapeRequest, ScrapeResponse, ScrapeResult,
    CrawlLinksRequest, CrawlLinksResponse, CrawlLinksResult,
    DeepCrawlRequest, DeepCrawlResponse
)
from app.services.crawler_service import clean_content_parallel
from app.services.link_crawler_service import crawl_website_links
from app.services.deep_crawl_service import deep_crawl_website
from app import app

@app.post("/scrape", response_model=ScrapeResponse)
async def crawl_ai_scraper(request: ScrapeRequest):
    """FastAPI route to handle web scraping requests for multiple URLs."""
    try:
        results, has_errors = await clean_content_parallel(
            request.urls,
            css_selector=request.css_selector,
            excluded_selector=request.excluded_selector,
            max_concurrent=5,
            use_proxy=request.use_proxy
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

@app.post("/crawl-links", response_model=CrawlLinksResponse)
async def crawl_links(request: CrawlLinksRequest):
    """FastAPI route to crawl a website and collect all unique internal links."""
    try:
        unique_links, has_errors = await crawl_website_links(
            request.url,
            vendor_id=request.vendor_id,
            max_depth=request.max_depth,
            excluded_patterns=request.excluded_patterns
        )

        return CrawlLinksResponse(
            success=True,
            links=unique_links,
            message='Some URLs failed to crawl' if has_errors else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to crawl website: {str(e)}'
        )

@app.get("/")
async def hello():
    """Simple GET route that returns Hello World."""
    result = ScrapeResult(
        url="hello",
        content="Hello World",
        success=True,
        error=None,
        title="Greeting"
    )
    return ScrapeResponse(
        success=True,
        data=[result],
        message='Successfully retrieved greeting'
    ) 

@app.post("/deep-crawl", response_model=DeepCrawlResponse)
async def deep_crawl_route(request: DeepCrawlRequest):
    """FastAPI route to perform deep crawling of a website with content extraction."""
    try:
        results, has_errors = await deep_crawl_website(
            request.url,
            vendor_id=request.vendor_id,
            max_depth=request.max_depth,
            excluded_patterns=request.excluded_patterns
        )
        
        return DeepCrawlResponse(
            success=True,
            data=results,
            message='Some URLs failed to crawl' if has_errors else 'Successfully completed deep crawl'
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f'Failed to deep crawl website: {str(e)}'
        ) 