import { PanelBottom, PanelLeft, PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAppStore, {
  handleMenuAction,
  toggleBottomPanelVisibility,
  toggleLeftPanelVisibility,
  toggleRightPanelVisibility,
} from '@/app/actions/app';
import useProject, { DEFAULT_PROJECT_NAME } from '@/app/actions/project';
import LanguageSelector from '@/app/components/window/LanguageSelector';
import { env } from '@/app/global';
import { Button } from '@/components/ui/button';

export default function TitleBar() {
  const { t } = useTranslation(undefined, { keyPrefix: 'titleBar' });
  const isLeftPanelVisible = useAppStore(state => state.isLeftPanelVisible);
  const isBottomPanelVisible = useAppStore(state => state.isBottomPanelVisible);
  const isRightPanelVisible = useAppStore(state => state.isRightPanelVisible);
  const projectName = useProject(state => state.projectName);
  const title = projectName && projectName !== DEFAULT_PROJECT_NAME ? projectName : t('defaultProjectName');

  const panelButtons = [
    {
      key: 'left',
      label: isLeftPanelVisible ? t('hideLayersPanel') : t('showLayersPanel'),
      isVisible: isLeftPanelVisible,
      icon: PanelLeft,
      onClick: toggleLeftPanelVisibility,
    },
    {
      key: 'bottom',
      label: isBottomPanelVisible ? t('hidePlayerPanel') : t('showPlayerPanel'),
      isVisible: isBottomPanelVisible,
      icon: PanelBottom,
      onClick: toggleBottomPanelVisibility,
    },
    {
      key: 'right',
      label: isRightPanelVisible ? t('hideControlsPanel') : t('showControlsPanel'),
      isVisible: isRightPanelVisible,
      icon: PanelRight,
      onClick: toggleRightPanelVisibility,
    },
  ];

  return (
    <div className={'flex items-center relative h-10 bg-neutral-900 border-b border-b-neutral-700'}>
      <div className={'flex items-center gap-1.5 ml-3 max-w-[45vw]'}>
        <img
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0 opacity-90"
          draggable={false}
          src="/icon.svg"
        />
        <Button
          variant="ghost"
          size="sm"
          className="bg-transparent text-neutral-400 truncate max-w-[32vw] hover:text-neutral-100 hover:bg-neutral-800"
          onClick={() => handleMenuAction('edit-canvas')}
        >
          {title}
        </Button>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 text-sm leading-10 tracking-widest uppercase cursor-default max-[700px]:hidden text-neutral-400">
        {env.APP_NAME}
      </div>
      <div className="absolute top-1 right-2 flex items-center gap-1">
        {panelButtons.map(button => {
          const Icon = button.icon;

          return (
            <Button
              key={button.key}
              variant="ghost"
              size="icon-sm"
              className={`${
                button.isVisible
                  ? 'bg-transparent text-neutral-400'
                  : 'bg-transparent text-neutral-500'
              } hover:bg-neutral-800 hover:text-neutral-100`}
              aria-label={button.label}
              aria-pressed={button.isVisible}
              onClick={button.onClick}
            >
              <Icon size={16} />
            </Button>
          );
        })}
        <LanguageSelector />
      </div>
    </div>
  );
}
