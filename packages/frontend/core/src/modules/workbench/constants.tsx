import {
  AiIcon,
  AllDocsIcon,
  AttachmentIcon,
  DeleteIcon,
  EdgelessIcon,
  ExportToPdfIcon,
  PageIcon,
  TagIcon,
  TodayIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';
import type { ReactNode } from 'react';

export const iconNameToIcon = {
  allDocs: (
    <img
      src="/imgs/simple_fine.png"
      alt="simpleFine Logo"
      width={20}
      height={20}
      style={{ display: 'block' }}
    />
  ),
  collection: <ViewLayersIcon />,
  doc: <PageIcon />,
  page: <PageIcon />,
  edgeless: <EdgelessIcon />,
  journal: <TodayIcon />,
  tag: <TagIcon />,
  trash: <DeleteIcon />,
  attachment: <AttachmentIcon />,
  pdf: <ExportToPdfIcon />,
  ai: <AiIcon />,
} satisfies Record<string, ReactNode>;

export type ViewIconName = keyof typeof iconNameToIcon;
