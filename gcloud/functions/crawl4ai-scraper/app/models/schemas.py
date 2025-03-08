from pydantic import BaseModel
from typing import List, Optional, Union

class ScrapeRequest(BaseModel):
    urls: List[str]
    css_selector: Optional[str] = None
    excluded_selector: Optional[Union[str, List[str]]] = None
    use_proxy: Optional[bool] = False

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

class CrawlLinksRequest(BaseModel):
    url: str
    max_depth: Optional[int] = 2
    excluded_patterns: Optional[List[str]] = None

class CrawlLinksResult(BaseModel):
    url: str
    internal_links: List[str]
    # external_links: List[str]
    success: bool
    error: Optional[str]

class CrawlLinksResponse(BaseModel):
    success: bool
    links: List[str]
    message: Optional[str] = None 