# Bread Shop - Installation Guide

## Requirements
- Node.js v18+
- MongoDB (local or Atlas)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/username/repo-name.git
cd repo-name
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```
MONGODB_URI=mongodb://localhost:27017/pshop
SESSION_SECRET=your_secret_key_here
PORT=3000
```

### 4. Run the project
```bash
node app.js
```
หรือถ้าใช้ nodemon
```bash
npx nodemon app.js
```

### 5. Open browser
```
http://localhost:3000
```