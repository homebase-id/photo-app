# ODIN Photo App

##### Open Decentralized Identity Network

## Disclaimer

This project is currently in pre-alpha stage and is under active development. It serves as an exploratory example of how to build a feature-rich photo management app. The code and features are still evolving, and bugs, performance issues, and incomplete functionality are expected.

Please note, this project is not intended for production use at this time, and contributions or feedback are welcome to help improve and expand its capabilities.

## Running Locally

If you wanna run the identities locally you'll need the back-end web server, see the [Odin](https://github.com/YouFoundation/dotyoucore) repository to get started.

Once you have the back-end and front-end web apps running, you can start the mobile app by following the instructions below.

> [!Note]
> You don't need the full platform running locally as you can use a production identity during development of any app on ODIN

### Install dependencies

```
npm install
```

### Setup for Android Builds

To access private dependencies (e.g., ffmpeg-kit from GitHub Packages), create a `local.properties` file in `packages/mobile/android/` with your GitHub credentials. This file is ignored by Git.

Example `local.properties`:

```
GITHUB_USERNAME=your-github-username
GITHUB_TOKEN=your-github-personal-access-token
```

- Generate a Personal Access Token (PAT) in GitHub settings with `read:packages` scope.
- For CI builds, these are handled via GitHub Secrets (see `.github/workflows/release.yml`).

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
