# TBA Inspection Checklist App

## Overview
This project is a full-stack, dual-interface property inspection management system designed to streamline property inspections and management. It features a mobile-first inspector app for field operations and a desktop admin portal for comprehensive management. The system aims to improve efficiency, accuracy, and communication in property maintenance and onboarding processes. Key capabilities include a Mobile Inspector App, Desktop Admin Portal, a read-only Owner Portal, Dual Authentication (JWT and cookie sessions), Internationalization (English/Spanish with server-side translation), Dynamic Inspections, Comprehensive Reporting, and Customizable Forms.

## User Preferences
- Mobile-first design for field operations
- Clean, professional UI appropriate for property management
- Demo mode available for testing all user roles
- Dark/light theme toggle

## System Architecture

### Frontend (client/)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Theme**: Light/dark mode with system preference detection
- **UI/UX Decisions**: Modern minimalist theme with Teal primary (#63A1A0) and coral accent, gradient icons. PM Portal uses a refined dark slate sidebar with teal accents and a clean white content area.
- **Technical Implementations**:
    - **Role-based Access**: Dynamic feature adjustment based on user roles (CLEANER, INSPECTOR, PM, ADMIN).
    - **Unit-Based Full Inspection**: Dynamically generated rooms with enhanced checklist items (COUNT_CONDITION, CONDITIONAL_YESNO, CONDITION_PRESET).
    - **Enhanced Onboarding Inspection**: Streamlined area-specific checklists with items starting empty and conditional media requirements.
    - **PM Inspection Report**: Executive Summary with high-level overview, Review & Categorize uses a card-based wizard, and an Owner Report Builder with live preview.
    - **Units Management**: Differentiates between "Onboarding Units" and "Active Units." PM assigns owner name/email directly on unit cards with inline fields. Auto-creates OWNER user accounts and onboarding records.
    - **Owner Onboarding Dashboard**: Owners with pending onboarding questionnaires see the questionnaire embedded in their dashboard. After completing, they see the regular dashboard to wait for inspection reports. Owner accounts are auto-created by PM and owners register with same email to set their password.
    - **Interactive Cost Tracking**: Integrates `estimatedCost` fields, quote presets, running total bar, and a cost summary card in owner reports. Supports vendor selection and service fee tracking.
    - **StructuredDescription Component**: Parses inspection description strings into structured labeled blocks for consistent display.
    - **Collapsible Report Sections**: Public owner report category sections are collapsible with item count badges.
    - **Service Bundles**: PM can group owner report items into named bundles with combined cost ranges and repair quotes, integrated into the running total calculation.
    - **Form Template Builder**: Provides a designer view for PM/Admin to create custom inspection forms with various field types and drag-and-drop ordering.
    - **Onboarding Workflow Hub**: Vertical phase-tracker sidebar for PM's onboarding inspection report page, with system-tracked and manual phases, progress rings, and sequential phase enforcement.

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Dual strategy using JWT tokens and `express-session` cookies.
- **File Uploads**: Multer for local storage of media.
- **PDF Generation**: pdfkit for comprehensive inspection reports.
- **Email**: Console logging, ready for SMTP integration.

### Shared (shared/)
- **Schema & Types**: Drizzle tables, Zod validation schemas, and TypeScript types inferred from Drizzle are shared.

### Core Architectural Decisions
- **Micro-frontend/Monorepo Structure**: Separation of client, server, and shared directories.
- **Database Schema**: Comprehensive PostgreSQL schema for users, units, inspection templates, tasks, responses, media, reports, notifications, and form templates.
- **API Endpoints**: Structured API for authentication, user management, units, inspections, and PDF generation.

## External Dependencies
- **PostgreSQL**: Primary database.
- **TanStack React Query**: Frontend state management.
- **shadcn/ui & Radix primitives**: UI component library.
- **Tailwind CSS**: Styling framework.
- **Wouter**: Client-side routing.
- **Express.js**: Backend web framework.
- **Drizzle ORM**: ORM for PostgreSQL.
- **Multer**: File upload handling.
- **pdfkit**: PDF generation.