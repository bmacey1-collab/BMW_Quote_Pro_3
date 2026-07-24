# Version 3.0 Data Safety

- Develop against a separate Supabase test project.
- Do not point the Alpha at the production database.
- No routine DROP TABLE, TRUNCATE, or blanket DELETE statements.
- Archive records instead of permanently deleting them.
- Save revisions as new records.
- Test export and restore before production migration.
