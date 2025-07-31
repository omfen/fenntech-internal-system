# FennTech Pricing System

## Overview

This is a complete full-stack web application for inventory pricing and management built for FennTech. The system handles both PDF invoice processing and Amazon product pricing with two distinct calculation methods:

1. **PDF Invoice Pricing**: Processes invoices, extracts items, applies category markups, adds 15% GCT, and converts to JMD
2. **Amazon Pricing**: Validates Amazon URLs, extracts prices, applies Cost+7% formula, then markup based on item value (80% under $100, 120% over $100)

Both systems generate email reports to management and maintain comprehensive pricing history. The application features a modern React frontend with Node.js/Express backend using PostgreSQL for persistent storage.

**Status: Fully functional and operational** - All PDF and Amazon pricing features implemented and tested with 162 JMD exchange rate. Amazon pricing uses manual entry approach for maximum accuracy.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client, server, and shared code:

- **Frontend**: React with TypeScript, Vite build system, shadcn/ui component library
- **Backend**: Node.js with Express, TypeScript  
- **Database**: PostgreSQL with Drizzle ORM (migrated from in-memory storage)
- **Styling**: TailwindCSS with CSS variables for theming
- **State Management**: TanStack Query for server state, React hooks for local state

## Key Components

### Frontend Architecture
- **Component Structure**: Modern React with TypeScript using functional components and hooks
- **UI Framework**: shadcn/ui components built on Radix UI primitives for accessibility
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: TailwindCSS with custom design tokens and dark mode support

### Backend Architecture
- **API Design**: RESTful Express.js server with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL dialect
- **File Processing**: Multer for file uploads, pdf-parse for PDF text extraction
- **Email Integration**: Nodemailer for sending pricing reports
- **Storage Strategy**: PostgreSQL database with automatic schema migration and category initialization

### Database Schema
- **Categories Table**: Stores product categories with markup percentages for PDF invoice items
- **Pricing Sessions Table**: Stores complete PDF invoice calculations with exchange rates and item details
- **Amazon Pricing Sessions Table**: Stores Amazon product calculations with URLs, cost formulas, and markup logic
- **JSON Storage**: PDF items stored as JSONB for flexible pricing item structure

### Implemented Features

#### PDF Invoice System
1. **Enhanced PDF Invoice Processing**: Upload and extract item data from PDF invoices with detailed descriptions (2x longer text) and automatic category assignment based on keywords
2. **Smart Category Management**: Pre-loaded categories with automatic matching - Accessories-100%, Ink-45%, Sub Woofers-35%, Speakers-45%, Headphones-65%, UPS-50%, Laptop Bags-50%, Laptops-25%, Desktops-25%, Adaptors-65%, Routers-50%
3. **Dynamic Pricing Calculator**: Real-time calculations following the formula: (Item cost × exchange rate) + 15% GCT, then apply markup percentage
4. **Intelligent Item Recognition**: Auto-categorizes items based on description keywords (WiFi→Adaptors, Ink→Ink, UPS→UPS, etc.)
5. **Rounding Options**: Round final prices to nearest $100, $1,000, or $10,000 JMD
6. **PDF Pricing History**: Complete tracking and display of all PDF pricing sessions

#### Amazon Pricing System
7. **Amazon URL Validation**: Validates Amazon.com URLs and extracts product information
8. **Smart Markup Logic**: Automatically applies 80% markup for items under $100 USD, 120% markup for items over $100 USD
9. **Amazon Price Formula**: Calculates Amazon price as Cost + 7%, then applies markup percentage
10. **Manual Price Entry**: Allows manual cost entry when automatic extraction fails
11. **Weight & Tax Warnings**: Displays prominent warnings about considering weight and local taxes
12. **Amazon Pricing History**: Separate tracking for all Amazon pricing calculations

#### Shared Features
13. **Exchange Rate Management**: Updated to 162 JMD per USD (manual updates supported)
14. **Email Reports**: Automated email system sending detailed reports to management (omar.fennell@gmail.com) for both PDF and Amazon pricing
15. **Dual Navigation**: Easy switching between PDF Invoice and Amazon Pricing systems
16. **Professional UI**: Modern interface with system-specific branding and responsive design
17. **Persistent Storage**: PostgreSQL database with automatic schema migration and data persistence

## Data Flow

1. **Invoice Upload**: PDFs uploaded via multer, processed with pdf-parse
2. **Data Extraction**: Text parsing to identify product items and costs
3. **Category Assignment**: Manual assignment of categories to extracted items
4. **Price Calculation**: Apply markup percentages and exchange rate conversion
5. **Session Storage**: Save complete pricing sessions to database
6. **Report Generation**: Format and email pricing reports to stakeholders

## External Dependencies

### Core Framework Dependencies
- **React 18**: Modern React with concurrent features
- **Express.js**: Node.js web framework
- **Drizzle ORM**: Type-safe SQL ORM for PostgreSQL
- **Neon Database**: Serverless PostgreSQL hosting

### UI and Styling
- **Radix UI**: Accessible component primitives
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### File Processing and Communication
- **Multer**: File upload middleware
- **pdf-parse**: PDF text extraction
- **Nodemailer**: Email sending functionality

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast build tool and dev server
- **TanStack Query**: Server state management
- **Zod**: Runtime type validation

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

- **Development**: Uses Vite dev server with HMR and Express API
- **Production**: Builds static frontend assets and serves via Express
- **Database**: Requires PostgreSQL connection via DATABASE_URL environment variable
- **Environment Variables**: Email credentials (GMAIL_USER, GMAIL_PASS) for report functionality

### Build Process
1. Frontend builds to `dist/public` directory
2. Backend transpiles TypeScript to `dist/index.js`
3. Production serves static files and API from single Express server

### Configuration Files
- **Drizzle Config**: Points to shared schema with PostgreSQL dialect
- **Vite Config**: Handles path aliases and Replit-specific plugins
- **TailwindCSS**: Configured for client directory with custom design tokens