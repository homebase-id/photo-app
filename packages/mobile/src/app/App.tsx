import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotosPage from '../pages/photos';
import PhotoPreview from '../pages/photo-preview';

import { LoginPage } from '../pages/login-page';
import { LibraryPage } from '../pages/library';

import { Colors } from './Colors';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Images, ImageLibrary, Cog } from '../components/ui/Icons/icons';
import { View } from 'react-native';
import AlbumPage from '../pages/album';
import SettingsPage from '../pages/settings-page';
import SyncDetailsPage from '../pages/sync-details-page';
import TypePage from '../pages/type';
import CodePush from 'react-native-code-push';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuth, useValidTokenCheck } from '../hooks/auth/useAuth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DotYouClientProvider } from '../components/Auth/DotYouClientProvider';
import { LibraryType } from 'photo-app-common';
import { memo, useCallback } from 'react';
import { OdinQueryClient } from './OdinQueryClient';
import { useRefetchOnFocus } from '../hooks/platform/useRefetchOnFocus';
import { useOnlineManager } from '../hooks/platform/useOnlineManager';
import { ErrorToaster } from '../components/ui/Alert/ErrorToaster';

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

let App = () => {
  return (
    <OdinQueryClient>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootStack />
      </GestureHandlerRootView>
    </OdinQueryClient>
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
          <StackedRoot.Screen name="Authenticated" component={AuthenticatedRoot} />
        ) : (
          <StackedRoot.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        )}
      </StackedRoot.Navigator>
      <ErrorToaster />
    </NavigationContainer>
  );
};

const AuthenticatedRoot = memo(() => {
  return (
    <DotYouClientProvider>
      <AppStackScreen />
    </DotYouClientProvider>
  );
});

const AppStackScreen = memo(() => {
  useValidTokenCheck();
  useRefetchOnFocus();
  useOnlineManager();

  return <AuthenticatedStack />;
});

const StackAuthenticated = createNativeStackNavigator<RootStackParamList>();
const AuthenticatedStack = memo(() => {
  const { isDarkMode } = useDarkMode();

  return (
    <DotYouClientProvider>
      <View style={{ flex: 1, backgroundColor: isDarkMode ? Colors.gray[900] : Colors.slate[50] }}>
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
