import { useCallback, useMemo, useState } from 'react';
import { TargetDrive } from '@homebase-id/js-lib/core';
import { PhotoConfig } from 'photo-app-common';
import { facebookDrive } from '../auth/useAuth';

export type DriveState = 'backup' | 'normal';

export interface UseTargetDriveResult {
    /**
     * The resolved target drive to use throughout the app. Falls back to PhotoConfig.PhotoDrive
     * when no specific drive is detected.
     */
    targetDrive: TargetDrive;
    /** The current drive state for rendering controls. */
    state: DriveState;
    /** Toggle between backup and normal drives. Implementation details can be replaced later. */
    toggle: () => void;
}

export const useTargetDrive = (): UseTargetDriveResult => {
    const [state, setState] = useState<DriveState>(localStorage.getItem('driveState') === 'backup' ? 'backup' : 'normal');
    // Placeholder drive detection based on the current state.
    const detectedDrive: TargetDrive | undefined = useMemo(() => {
        // Return undefined when no explicit drive is selected
        if (state === 'backup') return facebookDrive; // Backup selection => facebook drive
        // Normal or unknown => no explicit drive detected
        return undefined;
    }, [state]);

    const targetDrive = useMemo<TargetDrive>(() => {
        // Fallback to default photos drive when nothing detected
        return detectedDrive ?? PhotoConfig.PhotoDrive;
    }, [detectedDrive]);

    const toggle = useCallback(() => {
        localStorage.setItem('driveState', state === 'normal' ? 'backup' : 'normal');
        setState((prev) => (prev === 'normal' ? 'backup' : 'normal'));
    }, []);

    return { targetDrive, state, toggle };
};

export default useTargetDrive;
