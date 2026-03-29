import type { ColorScheme } from '@blocksuite/affine/model';
import { unsafeCSSVarV2 } from '@blocksuite/affine/shared/theme';
import type { NotificationService } from '@blocksuite/affine-shared/services';
import { PageIcon, ToolIcon } from '@blocksuite/icons/lit';
import type { BlockStdScope } from '@blocksuite/std';
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';

import { ArtifactTool } from './artifact-tool';
import type { ToolError } from './type';

interface DatabaseCreateToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string; // 'database_create'
  args: { title: string };
}

interface DatabaseCreateToolResult {
  type: 'tool-result';
  toolCallId: string;
  toolName: string; // 'database_create'
  args: { title: string };
  result:
    | {
        success: true;
        spec: {
          title: string;
          viewType: 'table' | 'kanban';
          columns: Array<{
            name: string;
            type: string;
            options?: string[];
          }>;
          rows?: Array<Record<string, string>>;
          groupByColumn?: string;
        };
      }
    | ToolError
    | null;
}

/**
 * Component to render database create tool call/result inside chat.
 */
export class DatabaseCreateTool extends ArtifactTool<
  DatabaseCreateToolCall | DatabaseCreateToolResult
> {
  static override styles = css`
    .database-create-result-preview {
      padding: 24px;
    }

    .database-create-result-preview-title {
      font-size: 24px;
      font-weight: 600;
      padding: 0 0 16px 0;
      margin-bottom: 16px;
      border-bottom: 1px solid ${unsafeCSSVarV2('divider')};
    }

    .database-schema-info {
      margin-bottom: 16px;
    }

    .database-schema-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${unsafeCSSVarV2('text/tertiary')};
      margin-bottom: 4px;
    }

    .database-schema-value {
      font-size: 14px;
      color: ${unsafeCSSVarV2('text/primary')};
      padding: 8px 12px;
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      border-radius: 4px;
    }

    .database-columns-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }

    .database-columns-table th,
    .database-columns-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid ${unsafeCSSVarV2('divider')};
    }

    .database-columns-table th {
      font-weight: 600;
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      color: ${unsafeCSSVarV2('text/primary')};
    }

    .database-columns-table td {
      color: ${unsafeCSSVarV2('text/secondary')};
    }

    .database-create-result-button {
      background: ${unsafeCSSVarV2('button/primary/background')};
      color: ${unsafeCSSVarV2('button/primary/text')};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
      height: 32px;
      font-weight: 500;
      margin-top: 16px;
    }

    .database-create-result-button:hover {
      background: ${unsafeCSSVarV2('button/primary/background/hover')};
    }

    .database-create-result-button:active {
      background: ${unsafeCSSVarV2('button/primary/background/pressed')};
    }
  `;

  @property({ attribute: false })
  accessor std: BlockStdScope | undefined;

  @property({ attribute: false })
  accessor notificationService!: NotificationService;

  private isCreating = false;

  protected getBanner(theme: ColorScheme) {
    return null;
  }

  protected getCardMeta() {
    return {
      title: this.data.args.title,
      className: 'database-create-result',
    };
  }

  protected override getIcon() {
    return PageIcon();
  }

  protected override getPreviewContent() {
    const resultData = this.data;
    const title = this.data.args.title;
    const result = resultData.type === 'tool-result' ? resultData.result : null;
    const successResult =
      result && 'success' in result && result.success ? result : null;

    if (!successResult) {
      return html`<div class="database-create-result-preview"></div>`;
    }

    const spec = successResult.spec;

    return html`
      <div class="database-create-result-preview">
        <div class="database-create-result-preview-title">${title}</div>

        <div class="database-schema-info">
          <div class="database-schema-label">View Type</div>
          <div class="database-schema-value">${spec.viewType}</div>
        </div>

        ${spec.groupByColumn
          ? html`<div class="database-schema-info">
              <div class="database-schema-label">Group By</div>
              <div class="database-schema-value">${spec.groupByColumn}</div>
            </div>`
          : ''}

        <div class="database-schema-info">
          <div class="database-schema-label">Columns</div>
          <table class="database-columns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${spec.columns.map(
                col =>
                  html`<tr>
                    <td>${col.name}</td>
                    <td>${col.type}</td>
                  </tr>`
              )}
            </tbody>
          </table>
        </div>

        ${spec.rows && spec.rows.length > 0
          ? html`<div class="database-schema-info">
              <div class="database-schema-label">
                Sample Rows (${spec.rows.length})
              </div>
            </div>`
          : ''}
      </div>
    `;
  }

  protected override getPreviewControls() {
    if (!this.std) return;

    const resultData = this.data;
    const result = resultData.type === 'tool-result' ? resultData.result : null;
    const successResult =
      result && 'success' in result && result.success ? result : null;

    if (!successResult) return;

    const createDatabase = async () => {
      try {
        if (this.isCreating) return;
        this.isCreating = true;

        const spec = successResult.spec;
        const store = this.std?.store;
        if (!store) {
          throw new Error('Store not available');
        }

        // Find a suitable parent (last note block)
        const noteBlocks = store.getBlocksByFlavour('affine:note');
        const parentId = noteBlocks[noteBlocks.length - 1]?.id;
        if (!parentId) {
          throw new Error('No note block found in document');
        }

        // Create database block
        const databaseId = store.addBlock(
          'affine:database' as any,
          {
            title: new store.Text(spec.title),
            columns: [],
            cells: {},
          },
          parentId
        );

        if (!databaseId) {
          throw new Error('Failed to create database block');
        }

        // Get the database model
        const databaseBlock = store.getBlock(databaseId);
        if (!databaseBlock) {
          throw new Error('Database block not found');
        }

        // Dynamically import DatabaseBlockDataSource
        const { DatabaseBlockDataSource } = await import(
          '@blocksuite/affine/blocks/database'
        );
        const datasource = new DatabaseBlockDataSource(databaseBlock.model);

        // Add columns
        for (const col of spec.columns) {
          datasource.propertyAdd('end', {
            type: col.type,
            name: col.name,
          });
        }

        // Add view (table or kanban)
        const viewType = spec.viewType === 'kanban' ? 'kanban' : 'table';
        datasource.viewManager.viewAdd(viewType);

        // Populate rows if provided
        if (spec.rows && spec.rows.length > 0) {
          const props = datasource.properties$.value;
          for (const row of spec.rows) {
            const rowId = datasource.rowAdd({ before: false });
            for (const prop of props) {
              const propName = prop.name$.value;
              const value = row[propName];
              if (value !== undefined) {
                datasource.cellValueChange(rowId, prop.id, value);
              }
            }
          }
        }

        this.notificationService.toast('Database created successfully!');
      } catch (e) {
        console.error('Failed to create database:', e);
        this.notificationService.toast(
          `Failed to create database: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
      } finally {
        this.isCreating = false;
      }
    };

    return this.data.type === 'tool-call'
      ? undefined
      : html`
          <button
            class="database-create-result-button"
            @click=${createDatabase}
            ?disabled=${this.isCreating}
          >
            ${DataTableIcon({
              width: '20',
              height: '20',
              style: `color: ${unsafeCSSVarV2('icon/primary')}`,
            })}
            ${this.isCreating ? 'Creating...' : 'Create Database'}
          </button>
        `;
  }

  protected override getErrorTemplate() {
    if (
      this.data.type === 'tool-result' &&
      this.data.result &&
      'type' in this.data.result &&
      (this.data.result as any).type === 'error'
    ) {
      return html`<tool-call-failed
        .name=${'Database creation failed'}
        .icon=${ToolIcon()}
      ></tool-call-failed>`;
    }
    return null;
  }
}
