import type { DocsService } from '@affine/core/modules/doc';
import type { GuardService } from '@affine/core/modules/permissions';
import type { WorkspaceService } from '@affine/core/modules/workspace';
import { Service } from '@toeverything/infra';
import { defer, map, type Observable, of, switchMap } from 'rxjs';

import type { FilterProvider } from '../../provider';
import type { FilterParams } from '../../types';

export class PermissionFilterProvider
  extends Service
  implements FilterProvider
{
  constructor(
    private readonly guardService: GuardService,
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();
  }

  filter$(params: FilterParams): Observable<Set<string>> {
    // This filter only works for system:permission with method 'is' and value 'true'
    // It filters out documents that the user doesn't have access to
    if (
      params.type === 'system' &&
      params.key === 'permission' &&
      params.method === 'is' &&
      params.value === 'true'
    ) {
      // Skip filtering for local workspaces - all docs are accessible
      if (this.workspaceService.workspace.flavour === 'local') {
        return this.docsService.allDocIds$().pipe(map(ids => new Set(ids)));
      }

      return this.docsService.allDocIds$().pipe(
        switchMap(docIds => {
          if (docIds.length === 0) {
            return of(new Set<string>());
          }

          console.log(
            '[PermissionFilter] Checking permissions for',
            docIds.length,
            'docs'
          );

          // Trigger permission loading for all docs first
          for (const docId of docIds) {
            this.guardService.revalidateCan('Doc_Read', docId);
          }

          // Check permission for all docs in parallel using async can()
          // This will wait for permissions to be loaded
          const permissionChecks = docIds.map(async docId => {
            try {
              // Wait a bit to ensure permission is loaded
              await new Promise(resolve => setTimeout(resolve, 100));
              const canRead = await this.guardService.can('Doc_Read', docId);
              console.log(
                `[PermissionFilter] Doc ${docId}: canRead = ${canRead}`
              );
              return { docId, canRead };
            } catch (error) {
              // If permission check fails, log and default to false (deny access)
              // This is safer - only show docs we know user can access
              console.error(
                `[PermissionFilter] Failed to check permission for doc ${docId}:`,
                error
              );
              return { docId, canRead: false };
            }
          });

          return defer(() => Promise.all(permissionChecks)).pipe(
            map(results => {
              const accessibleDocIds = new Set<string>();
              let allowedCount = 0;
              let deniedCount = 0;

              for (const { docId, canRead } of results) {
                // Only include docs where canRead is explicitly true
                // Docs with canRead === false are filtered out
                if (canRead === true) {
                  accessibleDocIds.add(docId);
                  allowedCount++;
                } else {
                  deniedCount++;
                }
              }

              console.log(
                `[PermissionFilter] Result: ${allowedCount} allowed, ${deniedCount} denied`
              );
              return accessibleDocIds;
            })
          );
        })
      );
    }

    // For other cases, return all docs (no filtering)
    return this.docsService.allDocIds$().pipe(map(ids => new Set(ids)));
  }
}
