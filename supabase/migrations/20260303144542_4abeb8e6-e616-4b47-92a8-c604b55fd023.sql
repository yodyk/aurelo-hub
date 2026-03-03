DELETE FROM invoice_sequences WHERE workspace_id IN ('10a6a6a0-55aa-458c-bf39-d73781a6a321','5468e8cf-58b8-49f4-a85c-2652b88ea261','5f652f9d-6564-4e1b-a4b4-ea229e0a98e5');
DELETE FROM workspace_members WHERE workspace_id IN ('10a6a6a0-55aa-458c-bf39-d73781a6a321','5468e8cf-58b8-49f4-a85c-2652b88ea261','5f652f9d-6564-4e1b-a4b4-ea229e0a98e5');
DELETE FROM workspaces WHERE id IN ('10a6a6a0-55aa-458c-bf39-d73781a6a321','5468e8cf-58b8-49f4-a85c-2652b88ea261','5f652f9d-6564-4e1b-a4b4-ea229e0a98e5');
DELETE FROM auth.users WHERE id = 'a17c3ddf-3425-4740-acc7-0dfc6149acff';