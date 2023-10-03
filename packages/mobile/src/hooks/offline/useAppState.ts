import { useEffect } from 'react';
import { AppState } from 'react-native';

export function useAppState(onChange: (state: string) => void) {
  useEffect(() => {
    AppState.addEventListener('change', onChange);
  }, [onChange]);
}
