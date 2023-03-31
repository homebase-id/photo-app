import { useState, useRef } from 'react';
import useOutsideTrigger from '../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import Person from '../../ui/Icons/Person/Person';
import Times from '../../ui/Icons/Times/Times';
import { LoginBox } from '../LoginBox/LoginBox';

const LoginNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  return (
    <div className="relative h-8">
      {isOpen ? (
        <button
          key={'close'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center
              rounded-full bg-slate-300
            dark:bg-slate-500`}
        >
          <Times className="h-4 w-4" />
        </button>
      ) : (
        <button
          key={'open'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {<Person className="h-4 w-4" />}
        </button>
      )}
      {isOpen ? (
        <div
          className="fixed left-0 right-0 top-[4rem] z-10 sm:absolute sm:left-auto sm:top-[3.5rem]"
          ref={wrapperRef}
        >
          <div className="min-w-[20rem] bg-slate-100 p-8 pt-6 shadow-md dark:bg-slate-700">
            <LoginBox />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LoginNav;
