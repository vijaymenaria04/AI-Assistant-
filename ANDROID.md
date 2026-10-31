# Android development status

This repository now includes a Capacitor Android project (`com.gopalai.assistant`). It is a **development scaffold, not a release-ready or secure application**. The Android launcher intentionally stops at a locked notice: device credential/biometric authentication has not yet been implemented or verified. The web preview remains available but does not provide owner-only authentication. Do not use either build to store sensitive records until appropriate security has been implemented and tested.

To prepare the Android project on a machine with Android Studio, JDK 21, and Android SDK 36:

1. `npm ci`
2. `npm run android:sync`
3. `npm run android:open`

Android Studio can then sync the Gradle project. The launcher must remain fail-closed until Android device authentication, lifecycle handling, permission flows, and recovery have been implemented and verified on physical devices and supported Android versions. No APK has been built or device-tested in this environment.

The current web app stores records in local IndexedDB. Its AI API is an Express endpoint, not bundled in the Android app; the Android scaffold uses the limited local command parser when that endpoint is unavailable. Cloud sync, native background scheduling, secure authentication, and real service integrations are not yet complete. The app no longer offers database backup or restore; local IndexedDB is not encrypted storage. Android's automatic backup is disabled in the manifest.
