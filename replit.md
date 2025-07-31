# FennTech Pricing System

## Overview

This is a full-stack web application for inventory pricing and management built for FennTech. The system allows users to upload PDF invoices, extract pricing information, apply category-based markups, calculate Jamaican Dollar (JMD) pricing, and generate reports. The application features a modern React frontend with a Node.js/Express backend using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client, server, and shared code:

- **Frontend**: React with TypeScript, Vite build system, shadcn/ui component library
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
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
- **Storage Strategy**: Implements both memory storage (development) and database storage interfaces

### Database Schema
- **Categories Table**: Stores product categories with markup percentages
- **Pricing Sessions Table**: Stores complete pricing calculations with invoice data, exchange rates, and item details
- **JSON Storage**: Items stored as JSONB for flexible pricing item structure

### Key Features
1. **PDF Invoice Processing**: Upload and extract item data from PDF invoices
2. **Category Management**: Create, edit, and manage product categories with markup percentages
3. **Dynamic Pricing Calculator**: Real-time price calculations with exchange rate conversion
4. **Pricing History**: Track and review previous pricing sessions
5. **Email Reports**: Send formatted pricing reports to management
6. **Responsive Design**: Mobile-first responsive interface

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