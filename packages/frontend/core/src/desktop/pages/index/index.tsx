import { DefaultServerService } from '@affine/core/modules/cloud';
import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { WorkspacesService } from '@affine/core/modules/workspace';
import {
  buildShowcaseWorkspace,
  createFirstAppData,
  DEMO_WORKSPACE_STORAGE_KEY,
  SKIP_DEMO_WORKSPACE_KEY,
} from '@affine/core/utils/first-app-data';
import { DEFAULT_WORKSPACE_NAME } from '@affine/env/constant';
import { ServerFeature } from '@affine/graphql';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';
import { WorkspaceNavigator } from '../../../components/workspace-selector';
import { AuthService } from '../../../modules/cloud';
import { AppContainer } from '../../components/app-container';

/**
 * index page
 *
 * query string:
 * - initCloud: boolean, if true, when user is logged in, create a cloud workspace
 */
export const Component = ({
  defaultIndexRoute = 'all',
  children,
  fallback,
}: {
  defaultIndexRoute?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}) => {
  // navigating and creating may be slow, to avoid flickering, we show workspace fallback
  const [navigating, setNavigating] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const authService = useService(AuthService);
  const defaultServerService = useService(DefaultServerService);

  const sessionStatus = useLiveData(authService.session.status$);
  const loggedIn = useLiveData(
    authService.session.status$.map(s => s === 'authenticated')
  );
  const enableLocalWorkspace =
    useLiveData(
      defaultServerService.server.config$.selector(
        c =>
          c.features.includes(ServerFeature.LocalWorkspace) ||
          BUILD_CONFIG.isNative
      )
    ) ?? true;

  const workspacesService = useService(WorkspacesService);
  const list = useLiveData(workspacesService.list.workspaces$);
  const listIsLoading = useLiveData(workspacesService.list.isRevalidating$);
  const demoWorkspaceId =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(DEMO_WORKSPACE_STORAGE_KEY)
      : null;
  const availableWorkspaces =
    loggedIn && demoWorkspaceId
      ? list.filter(workspace => workspace.id !== demoWorkspaceId)
      : list;

  const { openPage, jumpToPage, jumpToSignIn } = useNavigateHelper();
  const [searchParams] = useSearchParams();

  // Set title and favicon for home page
  useEffect(() => {
    document.title = 'simpleFINE';

    // Remove existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());

    // Create new favicon links for better browser compatibility
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/png';
    faviconLink.href = '/imgs/simple_fine.png';
    document.getElementsByTagName('head')[0].appendChild(faviconLink);

    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/imgs/simple_fine.png';
    document.getElementsByTagName('head')[0].appendChild(appleTouchIcon);
  }, []);

  const createOnceRef = useRef(false);
  const openedOnceRef = useRef(false);

  const createCloudWorkspace = useCallback(() => {
    if (createOnceRef.current) return;
    createOnceRef.current = true;
    // TODO: support selfhosted
    buildShowcaseWorkspace(workspacesService, 'affine-cloud', 'AFFiNE Cloud')
      .then(({ meta, defaultDocId }) => {
        if (defaultDocId) {
          jumpToPage(meta.id, defaultDocId);
        } else {
          openPage(meta.id, defaultIndexRoute);
        }
      })
      .catch(err => console.error('Failed to create cloud workspace', err));
  }, [defaultIndexRoute, jumpToPage, openPage, workspacesService]);

  useLayoutEffect(() => {
    if (!navigating) {
      return;
    }

    if (creating) {
      return;
    }

    if (listIsLoading) {
      return;
    }

    if (!enableLocalWorkspace && !loggedIn) {
      localStorage.removeItem('last_workspace_id');
      jumpToSignIn();
      return;
    }

    // check is user logged in && has cloud workspace
    if (searchParams.get('initCloud') === 'true') {
      if (loggedIn) {
        if (availableWorkspaces.every(w => w.flavour !== 'affine-cloud')) {
          createCloudWorkspace();
          return;
        }

        // open first cloud workspace
        const openWorkspace =
          availableWorkspaces.find(w => w.flavour === 'affine-cloud') ??
          availableWorkspaces[0];
        openPage(openWorkspace.id, defaultIndexRoute);
      } else {
        return;
      }
    } else {
      if (availableWorkspaces.length === 0) {
        setNavigating(false);
        return;
      }
      // open last workspace
      const lastId = localStorage.getItem('last_workspace_id');

      const openWorkspace =
        availableWorkspaces.find(w => w.id === lastId) ??
        availableWorkspaces[0];
      openPage(openWorkspace.id, defaultIndexRoute, RouteLogic.REPLACE);
    }
  }, [
    enableLocalWorkspace,
    availableWorkspaces,
    creating,
    createCloudWorkspace,
    openPage,
    searchParams,
    jumpToSignIn,
    listIsLoading,
    loggedIn,
    navigating,
    defaultIndexRoute,
  ]);

  useEffect(() => {
    if (openedOnceRef.current) {
      return;
    }
    if (creating) {
      return;
    }
    if (listIsLoading) {
      return;
    }
    if (availableWorkspaces.length === 0) {
      return;
    }
    openedOnceRef.current = true;
    const lastId = localStorage.getItem('last_workspace_id');
    const openWorkspace =
      availableWorkspaces.find(w => w.id === lastId) ?? availableWorkspaces[0];
    openPage(openWorkspace.id, defaultIndexRoute, RouteLogic.REPLACE);
  }, [
    availableWorkspaces,
    creating,
    defaultIndexRoute,
    listIsLoading,
    openPage,
  ]);

  const desktopApi = useServiceOptional(DesktopApiService);

  useEffect(() => {
    let disposed = false;
    authService.session
      .waitForRevalidation()
      .catch(err => console.error('Auth revalidation failed', err))
      .finally(() => {
        if (!disposed) {
          setSessionReady(true);
        }
      });
    return () => {
      disposed = true;
    };
  }, [authService]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      localStorage.setItem(SKIP_DEMO_WORKSPACE_KEY, 'true');
    }
    if (sessionStatus === 'unauthenticated') {
      localStorage.removeItem('last_workspace_id');
    }
  }, [sessionStatus]);

  useEffect(() => {
    desktopApi?.handler.ui.pingAppLayoutReady().catch(console.error);
  }, [desktopApi]);

  useEffect(() => {
    if (
      listIsLoading ||
      availableWorkspaces.length > 0 ||
      !enableLocalWorkspace ||
      !sessionReady ||
      localStorage.getItem(SKIP_DEMO_WORKSPACE_KEY) === 'true' ||
      sessionStatus !== 'unauthenticated' ||
      loggedIn
    ) {
      return;
    }

    createFirstAppData(workspacesService)
      .then(createdWorkspace => {
        if (createdWorkspace) {
          if (createdWorkspace.defaultPageId) {
            jumpToPage(
              createdWorkspace.meta.id,
              createdWorkspace.defaultPageId
            );
          } else {
            openPage(createdWorkspace.meta.id, 'all');
          }
        }
      })
      .catch(err => {
        console.error('Failed to create first app data', err);
      })
      .finally(() => {
        setCreating(false);
      });
  }, [
    jumpToPage,
    jumpToSignIn,
    openPage,
    workspacesService,
    loggedIn,
    listIsLoading,
    availableWorkspaces,
    enableLocalWorkspace,
  ]);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (listIsLoading) {
      return;
    }

    if (!demoWorkspaceId) {
      return;
    }

    const demoWorkspace = list.find(w => w.id === demoWorkspaceId);
    if (!demoWorkspace) {
      // keep the key until list is loaded so we can retry deletion when data arrives
      if (!listIsLoading && list.length > 0) {
        localStorage.removeItem(DEMO_WORKSPACE_STORAGE_KEY);
      }
      return;
    }

    setCreating(true);
    workspacesService
      .deleteWorkspace(demoWorkspace)
      .catch(err => {
        console.error('Failed to remove demo workspace', err);
      })
      .finally(() => {
        localStorage.removeItem(DEMO_WORKSPACE_STORAGE_KEY);
        setCreating(false);
      });
  }, [demoWorkspaceId, list, listIsLoading, loggedIn, workspacesService]);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (listIsLoading) {
      return;
    }

    const localWorkspaces = list.filter(
      workspace => workspace.flavour === 'local'
    );
    if (localWorkspaces.length === 0) {
      return;
    }

    setCreating(true);
    (async () => {
      for (const workspaceMeta of localWorkspaces) {
        try {
          const { workspace, dispose } = workspacesService.open({
            metadata: workspaceMeta,
          });
          await workspace.engine.doc.waitForDocReady(workspaceMeta.id);
          const name =
            workspace.docCollection?.doc?.getMap('meta')?.get('name') ?? '';

          if (name === DEFAULT_WORKSPACE_NAME) {
            await workspacesService.deleteWorkspace(workspaceMeta);
          }

          dispose();
        } catch (err) {
          console.error('Failed to remove local demo workspace', err);
        }
      }
    })()
      .catch(err => {
        console.error('Unexpected error while cleaning demo workspace', err);
      })
      .finally(() => {
        setCreating(false);
      });
  }, [list, listIsLoading, loggedIn, workspacesService]);

  if (navigating || creating) {
    return fallback ?? <AppContainer fallback />;
  }

  // TODO(@eyhn): We need a no workspace page
  return (
    children ?? (
      <div
        style={{
          position: 'fixed',
          left: 'calc(50% - 150px)',
          top: '50%',
        }}
      >
        <WorkspaceNavigator
          open={true}
          menuContentOptions={{
            forceMount: true,
          }}
        />
      </div>
    )
  );
};
