import { FC, useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { getVersion } from '../../../../helpers/common';
import { t } from '../../../../helpers/i18n/dictionary';
import useAuth from '../../../../hooks/auth/useAuth';
import useOutsideTrigger from '../../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import useDarkMode from '../../../../hooks/useDarkMode';
import Archive from '../../Icons/Archive/Archive';
import Arrow, { ArrowDown } from '../../Icons/Arrow/Arrow';
import Bars from '../../Icons/Bars/Bars';
import Ellipsis from '../../Icons/Ellipsis/Ellipsis';
import { SolidHeart } from '../../Icons/Heart/Heart';
import Image from '../../Icons/Image/Image';
import Person from '../../Icons/Person/Person';
import Times from '../../Icons/Times/Times';
import Trash from '../../Icons/Trash/Trash';
import { MiniDarkModeToggle } from '../DarkModeToggle/DarkModeToggle';
import Plus from '../../Icons/Plus/Plus';
import Grid from '../../Icons/Grid/Grid';
import AlbumIcon from '../../Icons/Album/Album';
import Upload from '../../Icons/Upload/Upload';
import { AlbumDefinition, useAlbumThumbnail, useAlbums } from 'photo-app-common';
import HeartBeat from '../../Icons/Heartbeat/Heartbeat';

const STORAGE_KEY = 'isOpen';

const navItemClassName = `my-1 py-2 px-2 flex`;
const navItemActiveClassname = `bg-indigo-200 dark:bg-indigo-700`;
const iconSize = 'h-6 w-6';
const iconClassName = `${iconSize} flex-shrink-0`;

const sidebarBg = 'bg-indigo-100 text-black dark:bg-indigo-900 dark:text-white';
const moreBg = 'bg-indigo-200 text-black dark:bg-indigo-800 dark:text-white';

const Sidenav = () => {
  const isDesktop = document.documentElement.clientWidth >= 1024;
  const storedState = localStorage.getItem(STORAGE_KEY);
  const overruledOpen = storedState ? storedState === '1' : undefined;
  const [isOpen, setIsOpen] = useState(overruledOpen ?? isDesktop);
  const [isHoverOpen, setIsHoverOpen] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0'), [isOpen]);

  return (
    <>
      <button
        className={`absolute left-0 top-0 z-40 p-3 md:p-4 lg:hidden ${sidebarBg}`}
        onClick={() => setIsOpen(true)}
      >
        <Bars className={`h-5 w-5`} />
      </button>
      <aside
        className={`body-font fixed bottom-0 left-0 right-0 top-0 z-40 h-screen flex-shrink-0 transition-transform duration-300 lg:sticky lg:transition-all ${
          isOpen
            ? 'translate-x-0 lg:min-w-[18rem]'
            : 'w-full translate-x-[-100%] lg:w-[4.3rem] lg:min-w-0 lg:translate-x-0'
        }`}
        onClick={() => !isDesktop && isOpen && setIsOpen(false)}
        onMouseEnter={() => setIsHoverOpen(true)}
        onMouseLeave={() => setIsHoverOpen(false)}
      >
        {/* Extra surrounding div to keep contents sticky as you scroll within the aside */}
        <div
          className={`${
            isOpen ? 'overflow-y-auto lg:overflow-visible' : 'hover:sticky hover:w-[18rem]'
          } static top-0 h-full w-full transition-all lg:sticky lg:h-auto lg:whitespace-nowrap ${sidebarBg}`}
        >
          <div className="flex h-screen flex-col overflow-auto px-3 pb-5 pt-3">
            <div>
              <button className={navItemClassName} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <Times className={iconClassName} /> : <Bars className={iconClassName} />}
              </button>
            </div>
            <div className="py-3">
              <NavItem icon={Image} label={'Photos'} to={`/`} end={true} />
            </div>
            <div className="py-3">
              <NavItem icon={SolidHeart} label={'Favorites'} to={`/favorites`} end={true} />
              <AlbumsNavItem />
            </div>

            <div className="py-3">
              <NavItem icon={Archive} label={'Archive'} to={`/archive`} end={true} />
              <NavItem icon={Grid} label={'Apps'} to={`/apps`} end={true} />
              <NavItem icon={Trash} label={'Bin'} to={`/bin`} end={true} />
            </div>

            <MoreItems isOpen={isOpen || isHoverOpen} />

            <div>
              <p className={`${navItemClassName} opacity-40`}>
                <span className={`text-center text-2xl`}>©</span>{' '}
                <span className={`my-auto ml-3 ${!isOpen && 'hidden'}`}>
                  {new Date().getFullYear()} | v.
                  {getVersion()}
                </span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const NavItem = ({
  icon,
  to,
  label,

  unread,
  end,
}: {
  icon?: FC<IconProps>;
  to: string;
  label: string;

  unread?: boolean;
  end?: boolean;
}) => {
  return (
    <>
      <NavLink
        className={({ isActive }) =>
          `${navItemClassName} ${isActive && navItemActiveClassname} relative`
        }
        to={to}
        end={end}
      >
        {icon && icon({ className: iconClassName })}
        {unread ? <span className="absolute h-2 w-2 rounded-full bg-red-500" /> : null}
        <span className={`my-auto ml-3 overflow-hidden`}>{label}</span>
      </NavLink>
    </>
  );
};

const MoreItems = ({ isOpen: isNavOpen }: { isOpen: boolean }) => {
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { logout } = useAuth();
  const { toggleDarkMode, isDarkMode } = useDarkMode();

  useEffect(() => {
    if (!isNavOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isNavOpen]);

  return (
    <div className={`relative mt-auto`} ref={wrapperRef}>
      <a
        className={`${navItemClassName} relative cursor-pointer`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Ellipsis className={iconClassName} />
        <span className={`my-auto ml-3 overflow-hidden ${!isNavOpen && 'hidden'}`}>
          {t('More')}
        </span>
      </a>

      <div
        className={`absolute bottom-[100%] left-0 overflow-auto rounded-md border-gray-200 border-opacity-80 shadow-md dark:border-gray-500 dark:shadow-slate-700 ${moreBg} ${
          isOpen ? '' : 'hidden'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <button onClick={() => logout()} className={`w-full ${navItemClassName}`}>
          <Person className={`${iconClassName}`} />
          <span className={`my-auto ml-3`}>Log out</span>
        </button>
        <hr className="border-b dark:border-slate-500" />
        <Link to={'/debug'} className={`w-full ${navItemClassName}`}>
          <HeartBeat className={`${iconClassName}`} />
          <span className={`my-auto ml-3`}>{t('Diagnostics')}</span>
        </Link>
        <hr className="border-b dark:border-slate-500" />
        <Link to={'/import'} className={`w-full ${navItemClassName}`}>
          <Upload className={`${iconClassName}`} />
          <span className={`my-auto ml-3`}>{t('Import')}</span>
        </Link>
        <hr className="border-b dark:border-slate-500" />
        <button className={navItemClassName} onClick={() => toggleDarkMode()}>
          <MiniDarkModeToggle className={`my-auto ${iconClassName}`} />
          <span className={`mx-3 my-auto`}>{isDarkMode ? t('Light mode') : t('Dark mode')}</span>
        </button>
      </div>
    </div>
  );
};

const AlbumsNavItem = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { data: albums } = useAlbums().fetch;

  return (
    <>
      <NavLink
        className={({ isActive }) =>
          `${navItemClassName} ${isActive && navItemActiveClassname} relative`
        }
        to={'/album'}
        end={true}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {AlbumIcon({ className: iconClassName })}
        <span className={`my-auto ml-3 flex w-full flex-row items-stretch overflow-hidden`}>
          <span>{t('Albums')} </span>
          <button
            className={`${iconClassName} ml-auto opacity-80 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <ArrowDown />
          </button>
        </span>
      </NavLink>

      {isOpen ? (
        <div className={''}>
          {albums
            ?.slice(0, 5)
            ?.map((album, index) => <AlbumNavItem album={album} key={album.fileId ?? index} />)}
          {albums && albums?.length > 5 ? (
            <NavItem label={t('View all')} icon={Arrow} to={`/albums`} end={true} />
          ) : (
            <span>
              <NavItem label={t('New album')} icon={Plus} to={`/album/new`} end={true} />
            </span>
          )}
        </div>
      ) : null}
    </>
  );
};

const AlbumNavItem = ({ album }: { album: AlbumDefinition }) => {
  const { data: thumb } = useAlbumThumbnail(album.tag).fetch;

  return (
    <NavLink
      className={({ isActive }) =>
        `${navItemClassName} ${isActive && navItemActiveClassname} relative`
      }
      to={`/album/${album.tag}`}
    >
      {thumb?.url ? (
        <img src={thumb?.url} className={`${iconClassName} object-cover`} />
      ) : (
        <Image className={`${iconClassName} opacity-50`} />
      )}
      <span className={`my-auto ml-3 overflow-hidden`}>{album.name}</span>
    </NavLink>
  );
};

export default Sidenav;
