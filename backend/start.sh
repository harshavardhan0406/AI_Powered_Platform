#!/bin/bash

# Use Gunicorn to start the FastAPI application
# -w 4: Use 4 worker processes (recommended for production)
# -k uvicorn.workers.UvicornWorker: Specifies the Uvicorn worker class
# main:app: Points to the 'app' object in the 'main.py' file
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT
