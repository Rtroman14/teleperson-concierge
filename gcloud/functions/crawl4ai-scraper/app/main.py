import nest_asyncio
import uvicorn
from app import app

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply() 