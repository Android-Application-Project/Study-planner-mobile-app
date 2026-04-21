import { createContext, useState, ReactNode, useContext } from 'react'
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications'

type PreferencesContextType = {
    vibrationEnabled: boolean
    setVibrationEnabled: (val: boolean) => void
    notificationsEnabled: boolean
    setNotificationsEnabled: (val: boolean) => void
    libraryAccessEnabled: boolean
    setLibraryAccessEnabled: (val: boolean) => void
    strictModeEnabled: boolean
    setStrictModeEnabled: (val: boolean) => void
    checkSystemNotifications: () => Promise<boolean>
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode}) {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const [vibrationEnabled, setVibrationEnabled] = useState(true)
    const [libraryAccessEnabled, setLibraryAccessEnabled] = useState(true)
    const [strictModeEnabled, setStrictModeEnabled] = useState(false)

    const checkSystemNotifications = async () => {
    const settings = await Notifications.getPermissionsAsync();
    
    const isGranted = 
        settings.granted || 
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    setNotificationsEnabled((current) => {
        if (!isGranted && current !== false) return false;
            return current;
        });
    
        return isGranted;
    };

    useEffect(() => {
        checkSystemNotifications();
    }, []);

    return (
        <PreferencesContext.Provider value={{ 
            vibrationEnabled,
            setVibrationEnabled,
            notificationsEnabled, 
            setNotificationsEnabled,
            libraryAccessEnabled, 
            setLibraryAccessEnabled,
            strictModeEnabled,
            setStrictModeEnabled,
            checkSystemNotifications
        }}>
            {children}
        </PreferencesContext.Provider>
    );
}

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};