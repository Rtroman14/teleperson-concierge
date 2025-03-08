# Dockerfile
FROM python:3.12-slim

# Set the working directory to root instead of /app
WORKDIR /

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from your local directory to root in the container
COPY . .

# Install Playwright and download browsers, and perform crawl4ai setup
RUN playwright install chromium && crawl4ai-setup

# Define the port number as an environment variable
ENV PORT 8080

# Set default values for proxy environment variables
ENV PROXY_SERVER=""
ENV PROXY_USERNAME=""
ENV PROXY_PASSWORD=""

# Inform Docker that the container will listen on port 8080
EXPOSE 8080

# Add CMD to run the FastAPI application with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

# # Add CMD to run the main.py file
# CMD ["python", "app/main.py"]
