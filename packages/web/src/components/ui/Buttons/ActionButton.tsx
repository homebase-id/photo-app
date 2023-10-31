import { FC, ReactNode, useState } from 'react';
import ConfirmDialog, {
  ConfirmDialogProps,
} from '../../Dialog/ConfirmDialog/ConfirmDialog';
import Arrow from '../Icons/Arrow/Arrow';
import Check from '../Icons/Check/Check';
import Exclamation from '../Icons/Exclamation/Exclamation';
import Loader from '../Icons/Loader/Loader';
import Pencil from '../Icons/Pencil/Pencil';
import Plus from '../Icons/Plus/Plus';
import Save from '../Icons/Save/Save';
import Shield from '../Icons/Shield/Shield';
import Times from '../Icons/Times/Times';
import Trash from '../Icons/Trash/Trash';

export type ActionButtonState =
  | 'loading'
  | 'pending'
  | 'success'
  | 'error'
  | 'idle';

export interface ActionButtonProps {
  children?: ReactNode;
  className?: string;
  icon?:
    | 'save'
    | 'send'
    | 'plus'
    | 'trash'
    | 'edit'
    | 'up'
    | 'down'
    | 'shield'
    | 'check'
    | 'times'
    | FC<IconProps>;
  type?: 'primary' | 'secondary' | 'remove' | 'mute' | 'hybrid';
  state?: ActionButtonState;
  isDisabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  title?: string;
  size?: 'large' | 'small' | 'square';
  confirmOptions?: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
}

export const mergeStates = (
  stateA: ActionButtonState,
  stateB: ActionButtonState,
): ActionButtonState => {
  if (stateA === 'error' || stateB === 'error') {
    return 'error';
  }

  if (stateA === 'pending' || stateB === 'pending') {
    return 'pending';
  }

  if (stateA === 'loading' || stateB === 'loading') {
    return 'loading';
  }

  if (stateA === 'idle' && stateB === 'idle') {
    return 'idle';
  }

  if (stateA === 'success' && stateB === 'success') {
    return 'success';
  }

  if (
    (stateA === 'success' && stateB === 'idle') ||
    (stateA === 'idle' && stateB === 'success')
  ) {
    return 'success';
  }

  return 'idle';
};

const ActionButton: FC<ActionButtonProps> = ({
  children,
  onClick,
  className,
  icon,
  type,
  state,
  title,
  size,
  confirmOptions,
  isDisabled,
}) => {
  const Icon = (props: { className: string }) => {
    if (state === 'loading') {
      return <Loader {...props} />;
    }
    if (state === 'success') {
      return <Check {...props} />;
    }
    if (state === 'error') {
      return <Exclamation {...props} />;
    }

    return icon === 'save' ? (
      <Save {...props} />
    ) : icon === 'send' ? (
      <Arrow {...props} />
    ) : icon === 'plus' ? (
      <Plus {...props} />
    ) : icon === 'trash' ? (
      <Trash {...props} />
    ) : icon === 'edit' ? (
      <Pencil {...props} />
    ) : icon === 'up' ? (
      <Arrow {...props} className={`-rotate-90 ${props.className}`} />
    ) : icon === 'shield' ? (
      <Shield {...props} fill="currentColor" />
    ) : icon === 'down' ? (
      <Arrow {...props} className={`rotate-90 ${props.className}`} />
    ) : icon === 'check' ? (
      <Check {...props} className={`${props.className}`} />
    ) : icon === 'times' ? (
      <Times {...props} className={`${props.className}`} />
    ) : icon ? (
      icon(props)
    ) : null;
  };

  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [mouseEvent, setMouseEvent] = useState<React.MouseEvent<HTMLElement>>();

  const colorClasses =
    (state === 'error'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : type === 'secondary'
      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-800 dark:text-white'
      : type === 'hybrid'
      ? 'bg-white bg-opacity-10 text-white hover:bg-white hover:bg-opacity-20'
      : type === 'remove'
      ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
      : type === 'mute'
      ? ''
      : 'bg-green-500 hover:bg-green-600 text-white') +
    (isDisabled ? ' opacity-50 cursor-not-allowed' : '');

  const widthClasses =
    children && type !== 'mute' && size !== 'square'
      ? `min-w-[6rem] ${className?.indexOf('w-full') ? '' : 'w-full sm:w-auto'}`
      : '';

  const sizeClasses =
    size === 'large'
      ? 'px-5 py-3'
      : size === 'small'
      ? 'px-3 py-1 text-sm'
      : size === 'square'
      ? 'p-2'
      : 'px-3 py-2';

  const stateClasses =
    state === 'loading' || state === 'pending' ? 'animate-pulse' : '';

  return (
    <>
      <button
        className={`${
          className && className.indexOf('absolute') !== -1 ? '' : 'relative'
        } flex flex-row ${
          className && className.indexOf('rounded-') !== -1 ? '' : 'rounded-md'
        } text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${stateClasses} ${className}`}
        disabled={isDisabled || state === 'loading' || state === 'pending'}
        onClick={
          confirmOptions
            ? e => {
                e.preventDefault();
                setNeedsConfirmation(true);
                setMouseEvent(e);
                return false;
              }
            : onClick
        }
        title={title}>
        {children}
        <Icon className={`my-auto ${children ? 'ml-1' : ''} h-4 w-4`} />
      </button>
      {confirmOptions && onClick && needsConfirmation ? (
        <ConfirmDialog
          {...confirmOptions}
          onConfirm={() => {
            setNeedsConfirmation(false);
            onClick && mouseEvent && onClick(mouseEvent);
          }}
          onCancel={() => setNeedsConfirmation(false)}
        />
      ) : null}
    </>
  );
};

export default ActionButton;
