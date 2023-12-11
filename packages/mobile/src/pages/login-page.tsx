import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Button,
  TextInput,
  View,
  Linking,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../components/ui/Text/Text';
import { AuthStackParamList } from '../app/App';
import { Container } from '../components/ui/Container/Container';
import { SafeAreaView } from '../components/ui/SafeAreaView/SafeAreaView';
import { Colors } from '../app/Colors';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { useYouAuthAuthorization } from '../hooks/auth/useAuth';
import { useCheckIdentity } from '../hooks/checkIdentity/useCheckIdentity';
import { CheckForUpdates, VersionInfo } from './settings-page';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

import logo from './homebase-photos.png';
import { YouAuthorizationParams } from '@youfoundation/js-lib/auth';

type LoginProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginPage = (_props: LoginProps) => {
  return (
    <SafeAreaView>
      <Container style={{ flex: 1, flexDirection: 'column' }}>
        <View
          style={{
            padding: 20,
            alignItems: 'center',
            gap: 10,
            minHeight: 120,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Image source={logo} style={{ width: 40, height: 40 }} />
          <Text style={{ fontSize: 25, paddingTop: 5 }}>Homebase Photos</Text>
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 15,
            marginTop: 'auto',
          }}
        >
          <LoginComponent />
        </View>

        <View
          style={{
            padding: 20,
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minHeight: 120,
          }}
        >
          <VersionInfo />
          <CheckForUpdates
            hideIcon={true}
            style={{
              alignItems: 'center',
              paddingBottom: 12,
            }}
          />
        </View>
      </Container>
    </SafeAreaView>
  );
};

const FINALIZE_PATH = 'homebase-photos://auth/finalize/';
const useFinalize = () => {
  const [state, setState] = useState<'preparing' | 'loading' | 'success' | 'error' | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUrlAsync = async () => {
      setState('preparing');
      // Get the deep link used to open the app
      const initialUrl = await Linking.getInitialURL();
      setUrl(initialUrl);
      if (!initialUrl) setState(null);
    };

    getUrlAsync();

    Linking.addEventListener('url', ({ url }) => setUrl(url));
  }, []);

  const { finalizeAuthentication } = useYouAuthAuthorization();

  useEffect(() => {
    // Finalize
    (async () => {
      if (state === 'preparing' || state === 'success' || state === 'loading') return;
      try {
        if (url?.startsWith(FINALIZE_PATH)) {
          setState('loading');

          const dataParams = url?.split(FINALIZE_PATH)[1];
          const params = new URLSearchParams(dataParams);

          const identity = params.get('identity');
          const public_key = params.get('public_key');
          const salt = params.get('salt');

          if (!identity || !public_key || !salt) return;
          await finalizeAuthentication(identity, public_key, salt);

          setState('success');
        }
      } catch (e) {
        setState('error');
        setUrl(null);
      }
    })();
  }, [url, finalizeAuthentication, state]);

  return state;
};

const useParams = () => {
  const [params, setParams] = useState<YouAuthorizationParams | null>(null);
  const { getRegistrationParams } = useYouAuthAuthorization();

  useEffect(() => {
    (async () => {
      if (params) return;
      setParams(await getRegistrationParams());
    })();
  }, [getRegistrationParams, params]);

  return { data: params };
};

const LoginComponent = () => {
  // LoginPage is the only page where you can be when unauthenticated; So only page where we listen for a finalize return link
  const finalizeState = useFinalize();

  const [invalid, setInvalid] = useState<boolean>(false);
  const [odinId, setOdinId] = useState<string>('');
  const { data: authParams } = useParams();

  const { data: isValid } = useCheckIdentity(odinId);
  useEffect(() => setInvalid(false), [odinId]);

  const onLogin = async () => {
    if (!isValid || !odinId) {
      setInvalid(true);
      return;
    }

    const url = `https://${odinId}/api/owner/v1/youauth/authorize?${stringifyToQueryParams(
      authParams as any
    )}`;
    if (await InAppBrowser.isAvailable()) {
      const result = await InAppBrowser.openAuth(url, '', {
        enableUrlBarHiding: false,
        enableDefaultShare: false,
        forceCloseOnRedirection: true,
        // Specify full animation resource identifier(package:anim/name)
        // or only resource name(in case of animation bundled with app).
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right',
        },
      });

      if (result.type === 'success' && result.url) Linking.openURL(result.url);
    } else await Linking.openURL(url);
  };

  if (finalizeState === 'loading' || finalizeState === 'preparing') return <ActivityIndicator />;

  return (
    <>
      <Text style={{ fontSize: 18 }}>Your Homebase id</Text>
      <TextInput
        placeholder="Homebase id"
        style={{
          height: 40,
          marginVertical: 12,
          borderWidth: 1,
          borderColor: Colors.slate[300],
          borderRadius: 4,
          padding: 10,
        }}
        onChangeText={setOdinId}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onLogin}
      />

      {invalid ? <Text style={{ color: Colors.red[500] }}>Invalid homebase id</Text> : null}

      {finalizeState === 'error' ? (
        <Text style={{ color: Colors.red[500] }}>Something went wrong, please try again</Text>
      ) : null}

      <Button title="Login" disabled={!odinId} onPress={onLogin} />

      <View
        style={{
          flexDirection: 'row',
          marginTop: 12,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <TouchableOpacity onPress={() => Linking.openURL('https://homebase.id')}>
          <Text style={{ textDecorationLine: 'underline' }}>Homebase.id</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default LoginPage;
