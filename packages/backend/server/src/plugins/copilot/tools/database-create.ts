import { tool } from 'ai';
import { z } from 'zod';

export const createDatabaseCreateTool = () => {
  return tool({
    description:
      'Create a new AFFiNE database block with kanban or table view. Use this tool whenever the user asks to create a kanban board, task board, database, table, or any structured data view.',
    inputSchema: z.object({
      title: z
        .string()
        .describe(
          'The title/name of the database (e.g., "Project Tasks", "Inventory")'
        ),
      viewType: z
        .enum(['kanban', 'table'])
        .describe(
          'Type of view: "kanban" for a card-based kanban board, "table" for a spreadsheet-style table'
        ),
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum(['text', 'number', 'date', 'select', 'checkbox']),
          })
        )
        .describe(
          'Array of column definitions, each with name and type (text, number, date, select, or checkbox)'
        ),
    }),
    execute: async params => {
      return {
        success: true,
        spec: params,
      };
    },
  });
};
