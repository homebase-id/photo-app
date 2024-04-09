import { FC, ReactNode } from 'react';
import Arrow from '../Icons/Arrow/Arrow';
import Check from '../Icons/Check/Check';
import Pencil from '../Icons/Pencil/Pencil';
import Plus from '../Icons/Plus/Plus';
import Save from '../Icons/Save/Save';
import Shield from '../Icons/Shield/Shield';
import Times from '../Icons/Times/Times';
import Trash from '../Icons/Trash/Trash';

export type ActionLinkState = 'loading' | 'success' | 'error' | 'idle';

type ActionLinkProps = {
  children?: ReactNode;
  className?: string;
  type?: 'primary' | 'secondary' | 'remove' | 'mute';
  title?: string;
  size?: 'large' | 'small' | 'square';
  onClick?: (e: unknown) => void;
  icon?:
    | 'save'
    | 'send'
    | 'plus'
    | 'trash'
    | 'edit'
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'shield'
    | 'check'
    | 'times'
    | FC<IconProps>;
  download?: string;
  href?: string;
};

const ActionLink: FC<ActionLinkProps> = ({
  children,
  className,
  type,
  title,
  size,
  onClick,
  icon,
  download,
  href,
}) => {
  const Icon = (props: { className: string }) => {
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
    ) : icon === 'left' ? (
      <Arrow {...props} className={`-rotate-180 ${props.className}`} />
    ) : icon === 'right' ? (
      <Arrow {...props} className={` ${props.className}`} />
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

  const colorClasses =
    type === 'secondary'
      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-800 dark:text-white'
      : type === 'remove'
        ? 'bg-red-200 hover:bg-red-400 dark:bg-red-700 hover:dark:bg-red-800 dark:text-white'
        : type === 'mute'
          ? ''
          : 'bg-green-500 hover:bg-green-600 text-white';

  const widthClasses =
    children && type !== 'mute'
      ? `min-w-[6rem] ${className?.indexOf('w-') !== -1 ? '' : 'w-full sm:w-auto'}`
      : '';

  const sizeClasses =
    size === 'large'
      ? 'px-5 py-3'
      : size === 'small'
        ? 'px-3 py-1 text-sm'
        : size === 'square'
          ? 'p-2'
          : 'px-3 py-2';

  return (
    <a
      className={`relative flex flex-row items-center rounded-md text-left ${widthClasses} ${sizeClasses} ${colorClasses} ${className}`}
      download={download}
      href={href}
      title={title}
      onClick={onClick}
    >
      {children}
      <Icon className={`my-auto ${children ? 'ml-2' : ''} h-5 w-5`} />
    </a>
  );
};

export default ActionLink;
