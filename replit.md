# FennTech Pricing System

## Overview

This is a complete full-stack web application for inventory pricing and management built for FennTech. The system handles both PDF invoice processing and Amazon product pricing with two distinct calculation methods:

1. **Intcomex Invoice Pricing**: Processes invoices, extracts items, applies category markups, adds 15% GCT, and converts to JMD (defaults to nearest $100 rounding)
2. **Amazon Pricing**: Validates Amazon URLs, extracts prices, applies Cost+7% formula, then markup based on item value (80% under $100, 120% over $100)

Both systems generate email reports to management and maintain comprehensive pricing history. The application features a modern React frontend with Node.js/Express backend using PostgreSQL for persistent storage.

**Status: Fully functional and operational** - All Intcomex and Amazon pricing features implemented and tested with 162 JMD exchange rate. Amazon pricing uses manual entry approach for maximum accuracy. Mobile-responsive design completed with card-based layouts for all components. **New: Complete user authentication and management system implemented with role-based access control.** **Latest: Customer product inquiries, quotation management, work orders with automated status email notifications, tickets system, call logs, and comprehensive task management system all fully implemented. Enhanced user management now supports multiple email domains (@fenntechltd.com, @876get.com) with admin authentication for other domains.** **New Enhancement: Due date management system implemented across all entities with comprehensive dashboard visibility showing overdue items, due today, due tomorrow, and due this week. Daily motivation section added to dashboard with inspirational business quotes.** **Major Update: Comprehensive change tracking system implemented with user attribution and timestamps for all work order changes. Advanced ViewOptions component created with filtering, sorting, view toggle (cards/list), and export functionality across all sections.**

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
- **Users Table**: Stores user accounts with authentication data, roles (administrator/user), and account status
- **Sessions Table**: Manages user authentication sessions for secure login persistence
- **Categories Table**: Stores product categories with markup percentages for PDF invoice items
- **Pricing Sessions Table**: Stores complete PDF invoice calculations with exchange rates and item details
- **Amazon Pricing Sessions Table**: Stores Amazon product calculations with URLs, cost formulas, and markup logic
- **Customer Inquiries Table**: Stores customer product inquiries with name, telephone, item details, status, due dates, and history tracking
- **Quotation Requests Table**: Stores customer quotation requests with contact info, email, description, urgency, status, due dates, and history tracking
- **Call Logs Table**: Stores customer call information with type, purpose, duration, outcome, and follow-up dates
- **Work Orders Table**: Stores customer work orders with due dates, status tracking, and automated email notifications
- **Tickets Table**: Stores internal tickets with due dates, priority levels, and assignment capabilities
- **Status History Tables**: Track all status changes with timestamps and audit trails for customer inquiries, quotation requests, and tickets
- **JSON Storage**: PDF items stored as JSONB for flexible pricing item structure and status history tracking

### Implemented Features

#### Intcomex Invoice System
1. **Enhanced Intcomex Invoice Processing**: Upload and extract item data from PDF invoices with detailed descriptions (2x longer text) and automatic category assignment based on keywords
2. **Smart Category Management**: Pre-loaded categories with automatic matching - Accessories-100%, Ink-45%, Sub Woofers-35%, Speakers-45%, Headphones-65%, UPS-50%, Laptop Bags-50%, Laptops-25%, Desktops-25%, Adaptors-65%, Routers-50%
3. **Dynamic Pricing Calculator**: Real-time calculations following the formula: (Item cost × exchange rate) + 15% GCT, then apply markup percentage
4. **Intelligent Item Recognition**: Auto-categorizes items based on description keywords (WiFi→Adaptors, Ink→Ink, UPS→UPS, etc.)
5. **Rounding Options**: Round final prices to nearest $100 (default), $1,000, or $10,000 JMD
6. **Intcomex Pricing History**: Complete tracking and display of all pricing sessions with mobile-friendly card layouts

#### Amazon Pricing System
7. **Amazon URL Validation**: Validates Amazon.com URLs and extracts product information
8. **Smart Markup Logic**: Automatically applies 80% markup for items under $100 USD, 120% markup for items over $100 USD
9. **Amazon Price Formula**: Calculates Amazon price as Cost + 7%, then applies markup percentage
10. **Manual Price Entry**: Allows manual cost entry when automatic extraction fails
11. **Weight & Tax Warnings**: Displays prominent warnings about considering weight and local taxes
12. **Amazon Pricing History**: Separate tracking for all Amazon pricing calculations

#### Authentication & User Management System
13. **Complete User Authentication**: Secure JWT-based login/registration system with bcryptjs password hashing
14. **Role-Based Access Control**: Administrator and User roles with appropriate permissions and restrictions
15. **Multi-Domain Email Support**: Supports @fenntechltd.com and @876get.com email addresses for automatic registration, with admin authentication required for other domains
16. **Admin User Management**: Full CRUD operations for user accounts - view, edit roles, activate/deactivate, delete users, and create users from any domain
17. **User Approval System**: Users from non-approved domains require admin approval before gaining access
18. **Security Features**: Protection against self-demotion/deletion, secure session management, and token-based API authentication
19. **Default Admin Account**: Pre-created administrator account (admin@fenntechltd.com / FennTech2024!) for initial system access

#### Customer Management & Internal Operations Features
19. **Customer Product Inquiries**: Track customer name, telephone, and product items they're asking about
20. **Request for Quotation**: Manage customer quotation requests with contact details, email, quote description, and urgency levels (low, medium, high, urgent)
21. **Work Orders System**: Complete job tracking with status workflow (received → in_progress → testing → ready_for_pickup → completed)
22. **Automated Status Email Notifications**: Customers receive professional emails at each status change with detailed work order information and next steps
23. **Work Order Notes System**: Technicians can add and update notes throughout the repair process
24. **Tickets System**: Internal issue tracking with priority levels (low, medium, high, urgent) and user assignment capabilities
25. **Task Management System**: Comprehensive task tracking with urgency levels (low, medium, high, urgent), priority levels (low, normal, high, critical), assignment capabilities, due dates, and completion logging with automatic status tracking and audit trails
26. **Full CRUD Operations**: Create, view, edit, and delete work orders, tickets, customer inquiries, quotation requests, call logs, and tasks
27. **Call Log System**: Track incoming and outgoing customer calls with purpose, duration, outcome, and follow-up dates
28. **Status Management with History**: All customer interactions and tasks have status tracking with timestamps and audit trails
29. **Navigation Reorganization**: Customer features grouped under unified "Customers" dropdown for better organization
30. **Mobile-Responsive Design**: Card-based layouts optimized for mobile viewing and interaction
31. **Due Date Management System**: Comprehensive due date tracking across all entities with dashboard notifications for overdue, due today, due tomorrow, and due this week items
32. **Daily Motivation Dashboard**: Inspirational business quotes rotated daily to motivate team members with focus on excellence, customer service, and technology leadership
33. **Comprehensive Change Tracking System**: Complete audit trail for all work order changes with user attribution, timestamps, and detailed change descriptions stored in changeLogs table
34. **Advanced ViewOptions Component**: Unified component providing filtering, sorting, view switching (cards/list), and export functionality (CSV/JSON) across all data sections
35. **Activity Feed Dashboard**: Real-time activity feed displaying recent system changes with user information, timestamps, and entity details for complete visibility
36. **Enhanced Export Functionality**: Robust data export capabilities with CSV and JSON formats, including proper data formatting and file naming conventions

#### Shared Features
33. **Exchange Rate Management**: Updated to 162 JMD per USD (manual updates supported)
34. **Enhanced Email Systems**: Automated pricing reports to management and professional customer status update emails for work orders
35. **Unified Navigation**: Navigation system with Dashboard first, Pricing dropdown (Intcomex/Amazon), Customers dropdown (Inquiries/Quotes/Work Orders/Call Logs/Tickets), and role-based menu items
36. **Mobile-Responsive Design**: Fully responsive interface with mobile-friendly card layouts, collapsible sidebar, and optimized forms for all screen sizes
37. **Professional UI**: Modern interface with system-specific branding and responsive design
38. **Mobile-Friendly Price Trend Dashboard**: Comprehensive dashboard showing pricing trends, statistics, and recent sessions for both Intcomex and Amazon pricing with mobile-optimized card layouts
39. **Due Date Dashboard Integration**: Real-time visibility of all due dates across the system with color-coded urgency indicators and prioritized attention alerts
40. **Persistent Storage**: PostgreSQL database with automatic schema migration and data persistence

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