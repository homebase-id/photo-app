import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import PhotosPage from '../pages/photos';
import PhotoPreview from '../pages/photo';

import LoginPage from '../pages/login-page';
import LibraryPage from '../pages/library';

import { Colors } from './Colors';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { Images, ImageLibrary, Cog } from '../components/ui/Icons/icons';
import {
  PersistQueryClientOptions,
  PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { Platform } from 'react-native';
import { useAppState } from '../hooks/offline/useAppState';
import { useOnlineManager } from '../hooks/offline/useOnlineManager';
import AlbumPage, { AlbumTitle } from '../pages/album';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsPage from '../pages/settings-page';
import SyncDetailsPage from '../pages/sync-details-page';
import TypePage from '../pages/type';
import { useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import CodePush from 'react-native-code-push';
import { useDarkMode } from '../hooks/useDarkMode';
import useAuth from '../hooks/auth/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import { LibraryType } from 'photo-app-common';

export type AuthStackParamList = {
  Login: undefined;
  Authenticated: { logout: () => void };
};

export type TabStackParamList = {
  Photos: undefined;
  Library: undefined;
  Settings: { logout: () => void };
};

export type RootStackParamList = {
  Home: { logout: () => void };
  PhotoPreview: {
    photoId: string;
    albumId?: string;
    typeId: LibraryType;
  };
  Album: { albumId: string };
  Type: { typeId: LibraryType };
};

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      gcTime: Infinity,
      retry: 0,
    },
    queries: {
      retry: 2,
      gcTime: Infinity,
    },
  },
});

const asyncPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

// Explicit includes to avoid persisting media items, or large data in general
const INCLUDED_QUERY_KEYS = [
  'album',
  'album-thumb',
  'albums',
  'photo-header',
  'photo-library',
  'photo-meta',
  'photos',
  'photos-infinite',
];

const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  maxAge: Infinity,
  persister: asyncPersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const { queryKey } = query;
      return INCLUDED_QUERY_KEYS.some((key) => queryKey.includes(key));
    },
  },
};

const onAppStateChange = (status: string) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
};

let App = () => {
  useAppState(onAppStateChange);
  useOnlineManager();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() =>
        queryClient.resumePausedMutations().then(() => queryClient.invalidateQueries())
      }
    >
      <DotYouClientProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootStack />
        </GestureHandlerRootView>
      </DotYouClientProvider>
    </PersistQueryClientProvider>
  );
};
const codePushOptions = { checkFrequency: CodePush.CheckFrequency.MANUAL };
App = CodePush(codePushOptions)(App);

const RootStack = () => {
  const Stack = createNativeStackNavigator<AuthStackParamList>();
  const { isAuthenticated } = useAuth();

  // const [isLoggedOut, setisLoggedOut] = React.useState(false);
  // useEffect(() => {
  //   if (isLoggedOut) setisLoggedOut(false);
  // }, [isLoggedOut]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Authenticated" component={AuthenticatedStack} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

type AuthenticatedProps = NativeStackScreenProps<AuthStackParamList, 'Authenticated'>;
const AuthenticatedStack = (props: AuthenticatedProps) => {
  useSyncFromCameraRoll(true);
  // useBackupOldCameraRoll();
  const { isDarkMode } = useDarkMode();
  const Stack = createNativeStackNavigator<RootStackParamList>();

  const albumTitle = (albumId: string) => <AlbumTitle albumId={albumId} />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        },
        headerTitleStyle: {
          color: isDarkMode ? Colors.white : Colors.black,
        },
        headerTintColor: isDarkMode ? Colors.white : Colors.black,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={TabStack}
        initialParams={{ logout: props.route.params?.logout }}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PhotoPreview" component={PhotoPreview} options={{ headerShown: false }} />
      <Stack.Screen
        name="Album"
        component={AlbumPage}
        options={({ route }) => ({
          headerTitleAlign: 'center',
          headerTitle: () => albumTitle(route.params.albumId),
          headerBackTitle: 'Library',
        })}
      />
      <Stack.Screen
        name="Type"
        component={TypePage}
        options={({ route }) => ({
          headerTitleAlign: 'center',
          headerTitle: route.params.typeId[0].toUpperCase() + route.params.typeId.slice(1),
          headerBackTitle: 'Library',
        })}
      />
    </Stack.Navigator>
  );
};

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

type TabStackProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
const TabStack = ({ route }: TabStackProps) => {
  const { isDarkMode } = useDarkMode();
  const Tab = createBottomTabNavigator<TabStackParamList>();

  const photosIcon = (props: TabIconProps) => <Images {...props} />;
  const imageLibraryIcon = (props: TabIconProps) => <ImageLibrary {...props} />;
  const settingsIcon = (props: TabIconProps) => <Cog {...props} />;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDarkMode ? Colors.black : Colors.white,
          borderTopColor: isDarkMode ? Colors.gray[700] : Colors.slate[200],
        },
        tabBarInactiveTintColor: isDarkMode ? Colors.slate[500] : Colors.slate[500],
        tabBarActiveTintColor: isDarkMode ? Colors.indigo[500] : Colors.indigo[700],
        tabBarActiveBackgroundColor: isDarkMode ? Colors.black : Colors.white,

        headerStyle: {
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        },
        headerTitleStyle: {
          color: isDarkMode ? Colors.white : Colors.black,
        },
        headerShadowVisible: false,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Photos"
        component={PhotosPage}
        options={{
          headerShown: false,
          tabBarIcon: photosIcon,
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryPage}
        options={{
          tabBarIcon: imageLibraryIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        initialParams={{ logout: route.params.logout }}
        options={{
          tabBarIcon: settingsIcon,
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

export type SettingsStackParamList = {
  Profile: { logout: () => void };
  SyncDetails: undefined;
  // BackupDetails: undefined;
};

type SettingsStackProps = NativeStackScreenProps<TabStackParamList, 'Settings'>;
const SettingsStack = (props: SettingsStackProps) => {
  const { isDarkMode } = useDarkMode();
  const Stack = createNativeStackNavigator<SettingsStackParamList>();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50],
        },
        headerTitleStyle: {
          color: isDarkMode ? Colors.white : Colors.black,
        },
        headerTintColor: isDarkMode ? Colors.white : Colors.black,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Profile"
        component={SettingsPage}
        initialParams={{ logout: props.route.params.logout }}
        options={{ headerShown: true, headerTitle: 'Settings' }}
      />
      <Stack.Screen
        name="SyncDetails"
        component={SyncDetailsPage}
        options={{ headerBackTitle: 'Settings', headerTitle: 'Synchronization' }}
      />
    </Stack.Navigator>
  );
};

export default App;
