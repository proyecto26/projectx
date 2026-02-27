# email-templates Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: MJML email templates with SendGrid
The system SHALL use MJML for email template authoring and SendGrid for email delivery, provided by the `@projectx/email` package.

#### Scenario: Sending a verification email
- **WHEN** a new user registers
- **THEN** the auth service SHALL use `@projectx/email` to render an MJML template and send it via SendGrid

#### Scenario: Template rendering
- **WHEN** an email needs to be sent
- **THEN** the MJML template SHALL be compiled to responsive HTML with dynamic data interpolation

