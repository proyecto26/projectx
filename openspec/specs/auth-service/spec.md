# auth-service Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: JWT-based authentication
The auth service SHALL provide JWT-based authentication using Passport.js. Access tokens SHALL be issued on successful login and validated on protected endpoints across all services.

#### Scenario: User login
- **WHEN** a user submits valid credentials
- **THEN** the auth service SHALL return a JWT access token and refresh token

#### Scenario: Token validation
- **WHEN** a request includes a valid JWT in the Authorization header
- **THEN** the `@projectx/core` auth guard SHALL validate the token and allow access

### Requirement: User registration with email verification
The auth service SHALL support user registration with email verification via SendGrid using the `@projectx/email` package.

#### Scenario: New user registration
- **WHEN** a new user registers with email and password
- **THEN** the system SHALL create the user account, send a verification email, and return a pending status

#### Scenario: Email verification
- **WHEN** a user clicks the verification link in their email
- **THEN** the auth service SHALL mark the account as verified and allow full access

### Requirement: User profile management
The auth service SHALL provide endpoints for retrieving and updating user profiles.

#### Scenario: Fetching user profile
- **WHEN** an authenticated user requests their profile
- **THEN** the auth service SHALL return the user's profile data from the database

### Requirement: Shared auth guard via @projectx/core
Authentication guards SHALL be provided by the `@projectx/core` package so all services can protect endpoints consistently.

#### Scenario: Protecting a service endpoint
- **WHEN** a backend service needs to protect an endpoint
- **THEN** it SHALL use the JwtAuthGuard from `@projectx/core` which validates tokens against the auth service

