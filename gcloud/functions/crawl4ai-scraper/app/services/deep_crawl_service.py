import asyncio
from typing import Dict, List, Tuple, Set, AsyncGenerator
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.models import CrawlResult
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.deep_crawling.filters import URLFilter, FilterChain, URLPatternFilter
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy

from app.config.browser_config import get_browser_config

async def process_crawl_result(crawl_data: Dict) -> None:
    """
    Process each crawl result as it's streamed.
    
    Args:
        crawl_data (Dict): Dictionary containing url, title, and description
    """
    if crawl_data.get('url'):
        print(f"--------- CRAWLED URL: {crawl_data['url']}")
        
        # Here you would add code to save to Supabase
        # For example:
        # await supabase_client.from('crawled_urls').insert(crawl_data)

async def deep_crawl_website(start_url: str, vendor_id: int, max_depth: int = 2, excluded_patterns: List[str] = None) -> Tuple[List[Dict], bool]:
    """
    Crawl a website starting from a URL and collect all unique internal links up to a maximum depth.
    Uses streaming to process results as they come in.
    
    Args:
        start_url (str): The URL to start crawling from
        max_depth (int): Maximum depth to crawl (default: 2)
        excluded_patterns (List[str]): List of URL patterns to exclude from crawling
        
    Returns:
        Tuple[List[Dict], bool]: A tuple of (list of crawl results, has_errors)
    """
    try:
        # Create a chain of filters
        # filter_chain = FilterChain([
            # Only follow URLs with specific patterns
            # URLPatternFilter(patterns=["*guide*", "*tutorial*"]),

            # Only crawl specific domains
            # DomainFilter(
            #     allowed_domains=["docs.example.com"],
            #     blocked_domains=["old.docs.example.com"]
            # ),

            # Only include specific content types
            # ContentTypeFilter(allowed_types=["text/html"])
        # ])

        # Set up the configuration
        config = CrawlerRunConfig(
            deep_crawl_strategy=BFSDeepCrawlStrategy(
                max_depth=max_depth,
                include_external=False
            ),
            scraping_strategy=LXMLWebScrapingStrategy(),
            stream=True,
            verbose=True
        )
        
        # Create and configure the crawler
        results = []
        
        async with AsyncWebCrawler(config=get_browser_config()) as crawler:
            # Start the deep crawl with streaming
            async for result in await crawler.arun(start_url, config=config):
                # Create dictionary of crawl data
                crawl_data = {
                    'url': result.url,
                    'title': result.metadata.get('title', ''),
                    'description': result.metadata.get('description', '')
                }

                # Process each result as it comes in
                await process_crawl_result(crawl_data)

                # Add to results list
                results.append(crawl_data)

        return results, False
            
    except Exception as e:
        print(f"Error during deep crawl: {str(e)}")
        return [], True
