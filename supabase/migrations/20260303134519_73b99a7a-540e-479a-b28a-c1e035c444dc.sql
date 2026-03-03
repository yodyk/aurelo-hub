
-- Clean up duplicate workspaces for joe@knaggsdesigns.com, keep only the first one
DELETE FROM workspace_members WHERE workspace_id IN ('1c8729be-ab3f-499b-8098-931e3185312f', 'a5b4e5e0-e343-41ac-91e0-422f63be8fe3', '8a7e0cd8-4913-42f0-82f1-c6c22f6d5424', 'c487e7fc-1490-4a89-b8e1-3ffb15f9302a');
DELETE FROM invoice_sequences WHERE workspace_id IN ('1c8729be-ab3f-499b-8098-931e3185312f', 'a5b4e5e0-e343-41ac-91e0-422f63be8fe3', '8a7e0cd8-4913-42f0-82f1-c6c22f6d5424', 'c487e7fc-1490-4a89-b8e1-3ffb15f9302a');
DELETE FROM workspaces WHERE id IN ('1c8729be-ab3f-499b-8098-931e3185312f', 'a5b4e5e0-e343-41ac-91e0-422f63be8fe3', '8a7e0cd8-4913-42f0-82f1-c6c22f6d5424', 'c487e7fc-1490-4a89-b8e1-3ffb15f9302a');
