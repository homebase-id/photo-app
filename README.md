# ODIN Photo App

##### Open Decentralized Identity Network

## Running Locally

If you wanna run the identities locally you'll need the back-end web server, see the [Odin](https://github.com/YouFoundation/dotyoucore) repository to get started.

Once you have the back-end and front-end web apps running, you can start the mobile app by following the instructions below.

> [!Note]
> You don't need the full platform running locally as you can use a production identity during development of any app on ODIN

### Install dependencies

```bash
npm install
```

### Start Metro for Native (React Native)

```bash
npm start:mobile
```

### Start Vite for Web (React)

```bash
npm start:web
```

#### Log in with local identities on Android

```
# run adb as root:
adb root

# adb proxy port 443
adb reverse tcp:443 tcp:443
```

Now you can log in with local identities such as `frodo.dotyou.cloud`.

> [!Note]
> No such configuration is required for iOS simulators.

## Communications

Please use the [issue tracker](https://github.com/YouFoundation/feed-mobile-app/issues) on GitHub to report bugs.

## Security Disclosures

If you discover any security issues, please send an email to [info@homebase.id](mailto:info@homebase.id). The email is automatically CCed to the entire team and we'll respond promptly.

## License

This project is licensed under the terms of the AGPL3 license. See the [LICENSE](LICENSE) file.
