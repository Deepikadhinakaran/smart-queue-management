# 🏗️ System Architecture

## Flow Diagram
👤 User (Browser)
↓
🌐 S3 (React Frontend)
↓
🔀 API Gateway (REST API)
↓
⚡ AWS Lambda (Python)
↓
🗄️ DynamoDB (Database)

## Services Used

| Service | Role |
|---------|------|
| AWS S3 | Hosts React frontend |
| AWS API Gateway | Receives HTTP requests |
| AWS Lambda | Runs prediction logic |
| AWS DynamoDB | Stores queue records |
| AWS IAM | Manages permissions |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /predict | Submit queue data |
| GET | /history | Fetch all records |

## Region
ap-south-1 (Mumbai, India)
