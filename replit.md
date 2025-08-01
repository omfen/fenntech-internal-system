# FennTech Pricing System

## Overview

This full-stack web application, FennTech Pricing System, streamlines inventory pricing and management. It features two core functionalities: processing PDF invoices for Intcomex pricing with category-based markups and GCT, and calculating Amazon product prices using a Cost+7% formula with value-based markups. Both systems generate email reports and maintain comprehensive pricing histories. Beyond pricing, the system has evolved into a full-fledged operational hub, incorporating customer inquiry management, quotation requests, work orders with automated email notifications, a ticketing system, call logs, and comprehensive task management. It includes robust user authentication with role-based access control, multi-domain support, and a comprehensive change tracking system with detailed audit trails and an activity feed. The system uses SendGrid for reliable email delivery with admin@fenntechltd.com as the verified sender. The system aims to enhance operational efficiency, improve customer service, and provide comprehensive oversight for FennTech.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application is structured as a monorepo, separating client, server, and shared code.

### Core Technologies
-   **Frontend**: React with TypeScript, Vite, shadcn/ui, TailwindCSS.
-   **Backend**: Node.js with Express, TypeScript.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **State Management**: TanStack Query for server state.

### UI/UX Decisions
-   Modern, mobile-responsive design with card-based layouts.
-   shadcn/ui components built on Radix UI primitives for accessibility.
-   TailwindCSS with custom design tokens and dark mode support.
-   Unified navigation with clear dropdowns for Pricing and Customer features.
-   Dashboard displays due dates, activity feed, and daily motivational quotes.

### Technical Implementations
-   **Intcomex Invoice System**: Processes PDF invoices, extracts item data, applies category-based markups, GCT, and currency conversion (JMD with rounding options). Features smart category assignment and intelligent item recognition.
-   **Amazon Pricing System**: Validates Amazon.com URLs, extracts prices, applies a Cost+7% formula with dynamic markups based on item value, and allows manual price entry.
-   **Authentication & User Management**: Secure JWT-based authentication, role-based access control (Administrator/User), multi-domain email support, and an admin user management interface with approval workflows for new users.
-   **Customer Management**: Modules for tracking customer product inquiries, quotation requests, and call logs.
-   **Operational Management**: Systems for work orders (with status workflow and automated email notifications), internal tickets, and comprehensive task management with urgency/priority levels and assignment capabilities.
-   **Email System**: Complete SendGrid integration for reliable email delivery using admin@fenntechltd.com as verified sender. Handles pricing reports, quotation emails, invoice notifications, work order status updates, and system test emails.
-   **Data Tracking & Auditing**: Comprehensive change tracking system logs all create, update, and delete operations across entities with user attribution and timestamps. An advanced `ViewOptions` component provides filtering, sorting, view toggles, and export functionalities. An activity feed displays real-time system changes.
-   **Due Date Management**: Integrated system to track and display due dates across all entities with dashboard visibility for overdue, due today, due tomorrow, and due this week items.
-   **Persistent Storage**: PostgreSQL database handles all data, including detailed session histories, user information, and operational data, with automatic schema migration. PDF item details are stored as JSONB for flexibility.

### System Design Choices
-   RESTful API design for backend.
-   Multer for file uploads and pdf-parse for PDF text extraction.
-   SendGrid for professional email delivery (pricing reports, quotations, invoices, and notifications).
-   Client-side routing via Wouter.
-   Form management with React Hook Form and Zod validation.
-   Admin-only delete permissions across all entities with activity logging for security and accountability.

## External Dependencies

-   **React 18**: Frontend library.
-   **Express.js**: Backend web framework.
-   **Drizzle ORM**: PostgreSQL ORM.
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Radix UI**: UI component primitives.
-   **TailwindCSS**: CSS framework.
-   **Lucide React**: Icon library.
-   **Multer**: File upload middleware.
-   **pdf-parse**: PDF text extraction.
-   **Nodemailer**: Email sending.
-   **TypeScript**: Programming language.
-   **Vite**: Build tool.
-   **TanStack Query**: Server state management.
-   **Zod**: Runtime type validation.
```