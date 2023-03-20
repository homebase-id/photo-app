import { FC, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Bars from '../../Icons/Bars/Bars';
import Times from '../../Icons/Times/Times';

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
  const [isOpen, setIsOpen] = useState(overruledOpen ?? false);
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
        className={`body-font fixed top-0 left-0 right-0 bottom-0 z-40 h-screen flex-shrink-0 transition-transform duration-300 lg:sticky lg:transition-all ${
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
          <div className="flex h-screen flex-col overflow-auto px-3 pt-3 pb-5">
            <div>
              <button className={navItemClassName} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <Times className={iconClassName} /> : <Bars className={iconClassName} />}
              </button>
            </div>
            <div className="py-3">
              {/* <NavItem icon={Grid} label={'Dashboard'} to={'/owner'} end={true} /> */}
            </div>

            <div>
              <p className={`${navItemClassName} opacity-40`}>
                <span className={`text-center text-2xl`}>©</span>{' '}
                <span className={`my-auto ml-3 ${!isOpen && 'hidden'}`}>
                  2023 | v.
                  {/* {getVersion()} */}
                </span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidenav;
