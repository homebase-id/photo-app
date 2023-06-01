import { FC, useRef, useState } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import useOutsideTrigger from '../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import ConfirmDialog from '../../Dialog/ConfirmDialog/ConfirmDialog';
import ActionButton, { ActionButtonProps } from './ActionButton';

export interface ActionGroupOptionProps {
  icon?: FC<IconProps>;
  label: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  confirmOptions?: {
    title: string;
    buttonText: string;
    body: string;
  };
}

export interface ActionGroupProps extends Omit<ActionButtonProps, 'onClick'> {
  options: ActionGroupOptionProps[];
  innerClassname?: string;
}

export const ActionGroup = ({
  options,
  className,
  children,
  innerClassname,
  ...actionButtonProps
}: ActionGroupProps) => {
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className ?? ''}`} ref={wrapperRef}>
      <ActionButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        {...actionButtonProps}
        className={innerClassname}
      >
        {children ? (
          children
        ) : (
          <>
            ...<span className="sr-only ml-1">{t('More')}</span>
          </>
        )}
      </ActionButton>
      <div
        className={`absolute right-0 top-[100%] z-10 w-[12rem] ${
          isOpen ? 'max-h-[15rem] border' : 'max-h-0'
        } overflow-auto rounded-md border-gray-200 border-opacity-80 shadow-md dark:border-gray-700`}
      >
        <ul className={`block`}>
          {options.map((option) => {
            return <ActionOption {...option} key={option.label} />;
          })}
        </ul>
      </div>
    </div>
  );
};

const ActionOption = ({ icon, label, onClick, href, confirmOptions }: ActionGroupOptionProps) => {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLElement> | null>();

  return (
    <>
      <li className="cursor-pointer bg-white text-base hover:bg-slate-200 dark:bg-black dark:hover:bg-slate-700">
        <a
          href={href}
          onClick={
            confirmOptions
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNeedsConfirmation(true);
                  setMouseEvent(e);
                  return false;
                }
              : onClick
          }
          className="flex w-full flex-row px-2 py-1"
        >
          {icon && icon({ className: 'h-4 w-4 my-auto mr-2 flex-shrink-0' })}
          <span className={''}>{label}</span>
        </a>
      </li>
      {confirmOptions && onClick && (
        <ConfirmDialog
          title={confirmOptions.title}
          confirmText={confirmOptions.buttonText}
          needConfirmation={needsConfirmation}
          onConfirm={() => mouseEvent && onClick(mouseEvent)}
          onCancel={(e) => {
            e.stopPropagation();
            setNeedsConfirmation(false);
          }}
        >
          <p className="text-sm">{confirmOptions.body}</p>
        </ConfirmDialog>
      )}
    </>
  );
};
