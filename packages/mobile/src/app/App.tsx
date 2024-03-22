import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotosPage from '../pages/photos';
import PhotoPreview from '../pages/photo-preview';

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
import { Platform, View } from 'react-native';
import { useAppState } from '../hooks/offline/useAppState';
import { useOnlineManager } from '../hooks/offline/useOnlineManager';
import AlbumPage from '../pages/album';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsPage from '../pages/settings-page';
import SyncDetailsPage from '../pages/sync-details-page';
import TypePage from '../pages/type';
import { useSyncFromCameraRoll } from '../hooks/cameraRoll/useSyncFromCameraRoll';
import CodePush from 'react-native-code-push';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuth, useValidTokenCheck } from '../hooks/auth/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import { LibraryType } from 'photo-app-common';
import { BackgroundProvider } from './BackgroundProvider';
import { memo, useCallback } from 'react';

export type AuthStackParamList = {
  Login: undefined;
  Authenticated: undefined;
};

export type TabStackParamList = {
  Photos: undefined;
  Library: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Home: undefined;
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

  // Small data (blobs to local file Uri)
  'image',

  // Big data (base64 uri's)
  // 'tinyThumb',
];

const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  maxAge: Infinity,
  persister: asyncPersister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      if (
        query.state.status === 'pending' ||
        query.state.status === 'error' ||
        (query.state.data &&
          typeof query.state.data === 'object' &&
          !Array.isArray(query.state.data) &&
          Object.keys(query.state.data).length === 0)
      )
        return false;
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootStack />
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
};
const codePushOptions = { checkFrequency: CodePush.CheckFrequency.MANUAL };
App = CodePush(codePushOptions)(App);

const StackedRoot = createNativeStackNavigator<AuthStackParamList>();
const RootStack = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <StackedRoot.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <StackedRoot.Screen name="Authenticated" component={AuthenticatedStack} />
        ) : (
          <StackedRoot.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        )}
      </StackedRoot.Navigator>
    </NavigationContainer>
  );
};

const StackAuthenticated = createNativeStackNavigator<RootStackParamList>();
const AuthenticatedStack = memo(() => {
  useValidTokenCheck();
  useSyncFromCameraRoll(Platform.OS === 'ios');
  const { isDarkMode } = useDarkMode();

  return (
    <DotYouClientProvider>
      <BackgroundProvider>
        <View
          style={{ flex: 1, backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50] }}
        >
          <StackAuthenticated.Navigator
            screenOptions={{
              gestureEnabled: false,
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
            <StackAuthenticated.Screen
              name="Home"
              component={TabStack}
              options={{ headerShown: false }}
            />
            <StackAuthenticated.Screen
              name="PhotoPreview"
              component={PhotoPreview}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <StackAuthenticated.Screen
              name="Album"
              component={AlbumPage}
              options={{
                headerShown: false,
              }}
            />
            <StackAuthenticated.Screen
              name="Type"
              component={TypePage}
              options={({ route }) => ({
                headerTitleAlign: 'center',
                headerTitle: route.params.typeId[0].toUpperCase() + route.params.typeId.slice(1),
                headerBackTitle: 'Library',
              })}
            />
          </StackAuthenticated.Navigator>
        </View>
      </BackgroundProvider>
    </DotYouClientProvider>
  );
});

type TabIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const TabBottom = createBottomTabNavigator<TabStackParamList>();
const TabStack = memo(() => {
  const { isDarkMode } = useDarkMode();

  const photosIcon = useCallback((props: TabIconProps) => <Images {...props} />, []);
  const imageLibraryIcon = useCallback((props: TabIconProps) => <ImageLibrary {...props} />, []);
  const settingsIcon = useCallback((props: TabIconProps) => <Cog {...props} />, []);

  return (
    <TabBottom.Navigator
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
      <TabBottom.Screen
        name="Photos"
        component={PhotosPage}
        options={{
          headerShown: false,
          tabBarIcon: photosIcon,
        }}
      />
      <TabBottom.Screen
        name="Library"
        component={LibraryPage}
        options={{
          tabBarIcon: imageLibraryIcon,
        }}
      />
      <TabBottom.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: settingsIcon,
          headerShown: false,
        }}
      />
    </TabBottom.Navigator>
  );
});

export type SettingsStackParamList = {
  Profile: undefined;
  SyncDetails: undefined;
};

const StackSettings = createNativeStackNavigator<SettingsStackParamList>();
const SettingsStack = memo(() => {
  const { isDarkMode } = useDarkMode();

  return (
    <StackSettings.Navigator
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
      <StackSettings.Screen
        name="Profile"
        component={SettingsPage}
        options={{ headerShown: true, headerTitle: 'Settings' }}
      />
      <StackSettings.Screen
        name="SyncDetails"
        component={SyncDetailsPage}
        options={{ headerShown: false }}
      />
    </StackSettings.Navigator>
  );
});

export default App;
