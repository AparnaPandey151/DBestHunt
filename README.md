# DBestHunt

**Hunt the price. Catch the deal.**

DBestHunt is a full-stack product price tracking application that allows users to track products from e-commerce websites and monitor changes in their prices.

## Features

* Google-based user authentication
* Add and track products using product URLs
* Extract product details and pricing information using Firecrawl
* Store product and price data in PostgreSQL
* Monitor product price changes
* Maintain price history for tracked products
* Manually check the latest product price
* Automatically check product prices using Spring Scheduler
* Detect price drops
* Email notification integration for price-drop alerts
* View tracked products through a responsive React interface

## Tech Stack

### Frontend
- React
- JavaScript
- Vite
- CSS

### Backend

* Java
* Spring Boot
* Spring Security
* Spring Data JPA
* REST APIs
* Spring Scheduler

### Database

* PostgreSQL

### External Services

* Firecrawl
* Google OAuth
* Resend

## How It Works

1. The user signs in using Google authentication.
2. The user adds an e-commerce product URL.
3. The backend sends the URL to Firecrawl to extract product information.
4. Product details and the current price are stored in PostgreSQL.
5. The application keeps price history for the tracked product.
6. Product prices can be checked manually or automatically using Spring Scheduler.
7. When a price drop is detected, the application triggers the email notification integration.

## Project Structure

```text
DBestHunt/
├── backend/
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       └── resources/
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

## Environment Variables

The application uses environment variables for sensitive configuration such as database credentials and API keys.

Required configuration includes:

```text
DBESTHUNT_DB_USERNAME
DBESTHUNT_DB_PASSWORD
FIRECRAWL_API_KEY
RESEND_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Do not commit API keys, passwords, OAuth credentials, or other sensitive information to the repository.

## Running the Project

### Backend

Navigate to the backend directory:

```bash
cd backend
```

Run the Spring Boot application using Maven:

```bash
./mvnw spring-boot:run
```

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

The backend runs on:

```text
http://localhost:8080
```

### Frontend

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Project Status

DBestHunt is a learning-focused full-stack project built to practice Java, Spring Boot, React, PostgreSQL, REST APIs, authentication, external API integration, scheduled tasks, and price tracking workflows.
