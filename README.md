# Document Processing Backend API

A robust Node.js/Express backend service for processing documents using AI (Google Gemini) and standard OCR (Tesseract) extraction methods.

## 🚀 Features

- **AI-Powered Extraction**: Uses Google Gemini API for intelligent document text extraction
- **Standard OCR Processing**: Tesseract-based OCR for scanned documents and images
- **Multi-Format Support**: Handles PDF, image files (PNG, JPG, JPEG)
- **File Management**: Secure file upload and storage with Supabase
- **Health Monitoring**: Built-in health checks for PDF processing tools
- **Cross-Platform**: Docker support for Linux, macOS, and Windows

## 🛠️ Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **AI Processing**: Google Generative AI (Gemini)
- **OCR Engine**: Tesseract 4.1.1
- **PDF Processing**: Poppler utilities (pdftoppm)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- Docker (for containerized deployment)
- Supabase account and project
- Google Gemini API key

## 🔧 Installation

### **Local Development**

```bash
# Clone the repository
git clone <repository-url>
cd backend-document-processing-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your credentials

# Start development server
npm run dev
```

### **Docker Deployment**

#### **Standard Deployment (Linux/macOS)**
```bash
# Build and run with Docker Compose
docker-compose --env-file env.local up -d --build

# Or build manually
docker build -t doc-processor-backend .
docker run -d -p 3001:3001 --env-file env.local doc-processor-backend
```

#### **Windows Deployment**
```bash
# Use Windows-compatible Dockerfile
docker build -f Dockerfile.windows -t doc-processor-backend:windows .

# Or use Windows Docker Compose
docker-compose -f docker-compose.windows.yml --env-file env.local up -d --build
```

## ⚙️ Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Server Configuration
PORT=3001
NODE_ENV=development
```

## 🐳 Docker Configuration

### **Main Dockerfile**
- **Base**: Node.js 18 Alpine (Linux/macOS optimized)
- **PDF Tools**: Poppler utilities, Tesseract OCR
- **Security**: Non-root user execution
- **Health Checks**: PDF tool availability verification

### **Windows Dockerfile**
- **Base**: Node.js 18 Ubuntu (Windows compatibility)
- **PDF Tools**: Same tools, different package manager
- **Consistent**: Same structure and security as main Dockerfile

## 📊 API Endpoints

### **Health Check**
```
GET /api/health
```
Returns service status and PDF tool availability.

### **File Upload**
```
POST /api/upload
```
Upload and process documents with AI or standard extraction.

**Body**: `multipart/form-data`
- `file`: Document file (PDF, PNG, JPG, JPEG)
- `firstName`: User's first name
- `lastName`: User's last name
- `dob`: Date of birth
- `processingMethod`: `ai` or `standard`

### **Results**
```
GET /api/results
```
Retrieve all processing results.

```
DELETE /api/results/:jobId
```
Delete a specific processing job and associated files.

## 🔍 Health Monitoring

The service includes comprehensive health checks:

```bash
# Check container health
docker inspect <container_name> | grep -A 10 "Health"

# Manual health check
curl http://localhost:3001/api/health

# Test PDF tools in container
docker exec -it <container_name> /bin/bash
pdftoppm -v
tesseract --version
```

## 🚀 Deployment

### **Development**
```bash
npm run dev          # Start with nodemon
npm start            # Start production server
npm run build        # Build for production
```

### **Production with Docker**
```bash
# Build production image
docker build -t doc-processor-backend:prod .

# Run with environment variables
docker run -d \
  --name doc-processor-backend \
  -p 3001:3001 \
  --env-file env.production \
  doc-processor-backend:prod
```

### **Docker Compose**
```bash
# Start all services
docker-compose --env-file env.production up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test.pdf" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "dob=1990-01-01" \
  -F "processingMethod=ai"
```

## 🔧 Troubleshooting

### **Common Issues**

1. **PDF Tools Not Available**
   ```bash
   # Check container health
   docker inspect <container_name> | grep Health
   
   # Verify tools in container
   docker exec -it <container_name> /bin/bash
   pdftoppm -v
   tesseract --version
   ```

2. **Permission Errors**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   
   # Rebuild container
   docker-compose down
   docker-compose up -d --build
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :3001
   
   # Kill conflicting process
   kill -9 <PID>
   ```

### **Logs and Debugging**
```bash
# View container logs
docker logs <container_name>

# Follow logs in real-time
docker logs -f <container_name>

# Check container status
docker ps -a
```

## 📁 Project Structure

```
backend-document-processing-app/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/       # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   └── utils/           # Utility functions
├── Dockerfile           # Standard Dockerfile
├── Dockerfile.windows   # Windows-compatible Dockerfile
├── docker-compose.yml   # Docker Compose configuration
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review Docker logs
- Verify environment variables
- Ensure PDF tools are available in container

---

**Note**: This backend service is designed to work with the Document Processing Frontend application. Ensure both services are properly configured and running for full functionality.
