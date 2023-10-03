import { debounce } from 'lodash-es';
import { useRef, useEffect, useMemo } from 'react';

const useDebounce = (
  callback: () => void,
  deps?: React.DependencyList | undefined,
  wait?: number | number
) => {
  const ref = useRef<() => void>();

  useEffect(() => {
    ref.current = callback;
  }, [callback, ...(deps || [])]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return debounce(func, wait || 1000);
  }, []);

  return debouncedCallback;
};

export default useDebounce;
