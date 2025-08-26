# Stop the current backend container
docker stop doc-processor-backend
docker rm doc-processor-backend

# Rebuild with the cleaned Dockerfile
docker build -t doc-processor-backend:test .

# Run the new container
docker run -d \
  --name doc-processor-backend \
  -p 3001:3001 \
  --env-file ../env.local \
  doc-processor-backend:test

# Check if it's running
docker ps

# Check the logs
docker logs doc-processor-backend

# Test the health endpoint
curl http://localhost:3001/api/health


#Verify PDF Tools 
# Enter the container
docker exec -it doc-processor-backend /bin/bash

# Test the tools we actually use
pdftoppm -v
tesseract --version

# Exit
exit