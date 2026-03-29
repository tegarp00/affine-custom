import { tool } from 'ai';
import { z } from 'zod';

export const createDatabaseCreateTool = () => {
  return tool({
    description: `Create an AFFiNE database with table or kanban view.
Use this when users want to create structured data, task boards, or kanban views.
The spec will be rendered for user confirmation before creating the actual block.`,
    inputSchema: z.object({
      title: z.string().describe('Database title'),
      viewType: z
        .enum(['table', 'kanban'])
        .default('table')
        .describe('View type'),
      columns: z.array(
        z.object({
          name: z.string().describe('Column name'),
          type: z
            .enum(['text', 'number', 'date', 'select', 'checkbox', 'richText'])
            .describe('Column type'),
          options: z
            .array(z.string())
            .optional()
            .describe('Options for select type'),
        })
      ),
      rows: z
        .array(z.record(z.string()))
        .optional()
        .describe('Optional rows to populate'),
      groupByColumn: z
        .string()
        .optional()
        .describe('Column to group by for kanban view'),
    }),
    execute: async params => {
      return {
        success: true,
        spec: params,
      };
    },
  });
};
