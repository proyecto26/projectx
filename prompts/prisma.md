I need you to review the Prisma models from the "libs/backend/db/prisma/schema.prisma" path of this monorepo, the library is a NestJS project using PostgreSQL.

- Analyze them to identify potential improvements, such as missing or incorrect field types (e.g., using Numeric for currency), optimization of indexes for common queries, adding necessary constraints (like unique or foreign keys), and suggesting improvements for database performance.
- Also, look for missing fields, potential errors in relations, and whether fields like createdAt and updatedAt are correctly mapped for time tracking. 
- Ensure that relation fields are correctly defined using @relation, with both fields and references specified. Review relationships between models (one-to-many, many-to-many, etc.) to ensure integrity.
- Verify that primary keys are properly defined with @id and @default(autoincrement()) for auto-increment fields. Ensure that other fields requiring default values are using @default.
- Use Enums for fields with a fixed set of values (e.g., status fields). This improves data integrity and clarity when working with finite value sets.
- Ensure fields like emails, usernames, etc., that must be unique are marked with @unique. Also, check if commonly queried fields have @@index to improve query performance.
- Review the field types to make sure they match the database you’re using (e.g., PostgreSQL). Use database-specific types like @db.VarChar or @db.Numeric where necessary.
- Ensure that timestamp fields such as createdAt and updatedAt are defined and correctly using @default(now()) for creation and @updatedAt for automatic update tracking.
- Verify that onDelete and onUpdate rules are appropriately defined in @relation annotations. Use cascade rules like Cascade, SetNull, or NoAction to maintain referential integrity.