import { NotificationCountService } from '@affine/core/modules/notification';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

export const DocumentTitle = () => {
  const notificationCountService = useService(NotificationCountService);
  const notificationCount = useLiveData(notificationCountService.count$);
  const workbenchService = useService(WorkbenchService);
  const workbenchView = useLiveData(workbenchService.workbench.activeView$);
  const viewTitle = useLiveData(workbenchView.title$);

  // Set favicon - run immediately and on mount
  useEffect(() => {
    const setFavicon = () => {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      existingLinks.forEach(link => link.remove());

      // Set favicon.ico first (most important for browsers)
      const faviconIco = document.createElement('link');
      faviconIco.rel = 'icon';
      faviconIco.type = 'image/x-icon';
      faviconIco.href = '/favicon.ico?v=' + Date.now();
      document.getElementsByTagName('head')[0].appendChild(faviconIco);

      const shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.type = 'image/x-icon';
      shortcutIcon.href = '/favicon.ico?v=' + Date.now();
      document.getElementsByTagName('head')[0].appendChild(shortcutIcon);

      // Also set PNG versions for PWA
      const faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      faviconLink.href = '/imgs/simple_fine.png?v=' + Date.now();
      document.getElementsByTagName('head')[0].appendChild(faviconLink);

      const appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.href = '/imgs/simple_fine.png?v=' + Date.now();
      document.getElementsByTagName('head')[0].appendChild(appleTouchIcon);
    };

    // Set immediately
    setFavicon();

    // Also set after a short delay to ensure it overrides any other favicon setting
    const timeout = setTimeout(setFavicon, 100);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const prefix = notificationCount > 0 ? `(${notificationCount}) ` : '';
    // Remove any existing "simpleFINE" from viewTitle to avoid duplication
    let cleanTitle = viewTitle || '';
    // Remove "simpleFINE" from start and end, and any " - simpleFINE" pattern
    cleanTitle = cleanTitle.replace(/^simpleFINE\s*-\s*/i, '');
    cleanTitle = cleanTitle.replace(/\s*-\s*simpleFINE$/i, '');
    cleanTitle = cleanTitle.replace(/^simpleFINE\s*/i, '');
    cleanTitle = cleanTitle.trim();

    const title = cleanTitle ? `${cleanTitle} - simpleFINE` : 'simpleFINE';
    document.title = prefix + title;

    return () => {
      document.title = 'simpleFINE';
    };
  }, [notificationCount, viewTitle]);

  return null;
};
