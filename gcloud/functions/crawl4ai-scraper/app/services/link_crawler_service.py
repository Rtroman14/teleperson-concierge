import asyncio
from collections import deque
from typing import Dict, List, Set, Tuple
from crawl4ai.models import CrawlResult
from crawl4ai import AsyncWebCrawler
from urllib.parse import urljoin, urlparse, urlunparse
from app.config.browser_config import get_browser_config
from supabase import create_client, Client
import os

class SimpleWebsiteScraper:
    def __init__(self, crawler: AsyncWebCrawler):
        self.crawler = crawler
        self.base_url = None
        self.excluded_patterns = []
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key)

    def is_valid_internal_link(self, link: str) -> bool:
        if not link or link.startswith('#'):
            return False
        
        parsed_base = urlparse(self.base_url)
        parsed_link = urlparse(link)
        
        # Check if the URL has query parameters
        if parsed_link.query:
            return False
        
        # Convert link to lowercase only for pattern matching
        lowercase_link = link.lower()
        # Check if the URL contains any excluded patterns (case-insensitive)
        for pattern in self.excluded_patterns:
            if pattern.lower() in lowercase_link:
                return False
        
        return (parsed_base.netloc == parsed_link.netloc and
                parsed_link.path not in ['', '/'] and
                parsed_link.path.startswith(parsed_base.path))

    def normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        # Remove any fragments and query parameters
        parsed = parsed._replace(fragment='', query='')
        # Ensure the path doesn't end with a slash unless it's the root
        if parsed.path.endswith('/') and len(parsed.path) > 1:
            parsed = parsed._replace(path=parsed.path.rstrip('/'))
        return urlunparse(parsed)

    def join_url(self, base: str, url: str) -> str:
        joined = urljoin(base, url)
        parsed_base = urlparse(self.base_url)
        parsed_joined = urlparse(joined)
        
        # Ensure the joined URL starts with the base path
        if not parsed_joined.path.startswith(parsed_base.path):
            # If it doesn't, prepend the base path
            new_path = parsed_base.path.rstrip('/') + '/' + parsed_joined.path.lstrip('/')
            parsed_joined = parsed_joined._replace(path=new_path)
        
        return urlunparse(parsed_joined)

    async def scrape(self, start_url: str, max_depth: int, vendor_id: int, excluded_patterns: List[str] = None) -> Dict[str, CrawlResult]:
        self.base_url = self.normalize_url(start_url)
        self.excluded_patterns = excluded_patterns or []
        results: Dict[str, CrawlResult] = {}
        queue: deque = deque([(self.base_url, 0)])
        visited: Set[str] = set()

        while queue:
            current_url, current_depth = queue.popleft()
            
            if current_url in visited or current_depth > max_depth:
                continue
            
            visited.add(current_url)
            
            try:
                # Add 2-second delay before crawling each page
                await asyncio.sleep(2)
                result = await self.crawler.arun(current_url)
                
                if result.success:
                    results[current_url] = result
                    
                    # Pass vendor_id to upsert method
                    await self.upsert_url_to_supabase(current_url, result, vendor_id)
                    
                    if current_depth < max_depth:
                        internal_links = result.links.get('internal', [])
                        for link in internal_links:
                            full_url = self.join_url(current_url, link['href'])
                            normalized_url = self.normalize_url(full_url)

                            if self.is_valid_internal_link(normalized_url) and normalized_url not in visited:
                                queue.append((normalized_url, current_depth + 1))
            except Exception as e:
                print(f"Error crawling {current_url}: {str(e)}")
                continue
                    
        return results

    async def upsert_url_to_supabase(self, url: str, result: CrawlResult, vendor_id: int):
        """
        Upsert a crawled URL and its data to Supabase.
        
        Args:
            url (str): The URL that was crawled
            result (CrawlResult): The crawl result containing page data
            vendor_id (int): The ID of the vendor
        """
        try:
            url_data = {
                "url": url,
                # "title": result.title or "",
                # "num_characters": len(result.text) if result.text else 0,
                "vendor_id": vendor_id,
                # "description": result.description if hasattr(result, 'description') else None
            }
            
            # Remove the await - Supabase Python client doesn't return awaitable objects
            response = self.supabase.table("web_pages").upsert(url_data).execute()
            
            if hasattr(response, 'error') and response.error:
                print(f"Supabase upsert error for URL {url}: {response.error}")
            else:
                print(f"Successfully upserted URL to Supabase: {url}")
                
        except Exception as e:
            print(f"Error upserting URL to Supabase: {url}, Error: {str(e)}")

async def crawl_website_links(start_url: str, vendor_id: int, max_depth: int = 2, excluded_patterns: List[str] = None) -> Tuple[List[str], bool]:
    """
    Crawl a website starting from a URL and collect all unique internal links up to a maximum depth.
    
    Args:
        start_url (str): The URL to start crawling from
        vendor_id (int): The ID of the vendor
        max_depth (int): Maximum depth to crawl (default: 2)
        excluded_patterns (List[str]): List of URL patterns to exclude from crawling
        
    Returns:
        Tuple[List[str], bool]: A tuple of (unique_links, has_errors)
    """
    try:
        async with AsyncWebCrawler(config=get_browser_config()) as crawler:
            scraper = SimpleWebsiteScraper(crawler)
            results = await scraper.scrape(start_url, max_depth, vendor_id, excluded_patterns)
            
            # Collect all unique internal links
            unique_links = set()
            excluded_patterns = excluded_patterns or []
            
            for result in results.values():
                internal_links = [link['href'] for link in result.links.get('internal', [])]
                # Normalize each link before adding to the set
                normalized_links = [scraper.normalize_url(link) for link in internal_links]
                
                # Filter out links containing excluded patterns (case-insensitive)
                filtered_links = [
                    link for link in normalized_links 
                    if not any(pattern.lower() in link.lower() for pattern in excluded_patterns)
                ]
                
                unique_links.update(filtered_links)
                
            return list(unique_links), False
            
    except Exception as e:
        return [], True