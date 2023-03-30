import { FC, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getVersion } from '../../../../helpers/common';
import { t } from '../../../../helpers/i18n/dictionary';
import useAuth from '../../../../hooks/auth/useAuth';
import useOutsideTrigger from '../../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import useAblums from '../../../../hooks/photoLibrary/useAlbums';
import useDarkMode from '../../../../hooks/useDarkMode';
import { PhotoConfig } from '../../../../provider/photos/PhotoTypes';
import Archive from '../../Icons/Archive/Archive';
import { ArrowDown } from '../../Icons/Arrow/Arrow';
import Bars from '../../Icons/Bars/Bars';
import Ellipsis from '../../Icons/Ellipsis/Ellipsis';
import { SolidHeart } from '../../Icons/Heart/Heart';
import Image from '../../Icons/Image/Image';
import Person from '../../Icons/Person/Person';
import Times from '../../Icons/Times/Times';
import Trash from '../../Icons/Trash/Trash';
import { MiniDarkModeToggle } from '../DarkModeToggle/DarkModeToggle';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0');
  }, [isOpen]);

  return (
    <>
      <button
        className={`absolute left-0 top-0 z-10 p-4 lg:hidden ${sidebarBg}`}
        onClick={() => setIsOpen(true)}
      >
        <Bars className={`h-4 w-4`} />
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
              <NavItem
                icon={SolidHeart}
                label={'Favorites'}
                to={`/album/${PhotoConfig.FavoriteTag}`}
                end={true}
              />
              <AlbumNavItem isOpen={isOpen || isHoverOpen} />
            </div>

            <div className="py-3">
              <NavItem icon={Trash} label={'Archive'} to={`/archive`} end={true} />
            </div>

            <MoreItems isOpen={isOpen || isHoverOpen} />

            <div>
              <p className={`${navItemClassName} opacity-40`}>
                <span className={`text-center text-2xl`}>©</span>{' '}
                <span className={`my-auto ml-3 ${!isOpen && 'hidden'}`}>
                  2023 | v.
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
        <button className={navItemClassName} onClick={() => toggleDarkMode()}>
          <MiniDarkModeToggle className={`my-auto ${iconClassName}`} />
          <span className={`mx-3 my-auto`}>{isDarkMode ? t('Light mode') : t('Dark mode')}</span>
        </button>
      </div>
    </div>
  );
};

const AlbumNavItem = ({ isOpen: isNavOpen }: { isOpen: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: albums } = useAblums().fetch;

  return (
    <>
      <NavLink
        className={({ isActive }) =>
          `${navItemClassName} ${isActive && navItemActiveClassname} relative`
        }
        to={'/album'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {Archive({ className: iconClassName })}
        <span className={`my-auto ml-3 flex w-full flex-row items-stretch overflow-hidden`}>
          <span>{t('Albums')} </span>
          <button className={`${iconClassName} ml-auto opacity-80 `}>
            <ArrowDown className={`transition-transform ${isOpen ? '-rotate-90' : ''}`} />
          </button>
        </span>
      </NavLink>

      {isOpen ? (
        <div className={`ml-1 pl-1 ${isNavOpen ? 'opacity-100' : 'opacity-0'}`}>
          {albums?.map((album, index) => (
            <NavItem label={album.name} to={`/album/${album.tag}`} key={album.fileId ?? index} />
          ))}
          <NavItem label={t('New album')} to={`/album/new`} end={true} />
        </div>
      ) : null}
    </>
  );
};

export default Sidenav;
