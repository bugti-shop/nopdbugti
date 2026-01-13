# iOS Setup Guide for Npd

This guide covers the required iOS permissions and setup for push notifications and voice recording.

## Prerequisites

1. macOS with Xcode installed
2. Apple Developer Account (for push notifications)
3. Project exported to GitHub and cloned locally
4. Run `npm install` to install dependencies
5. Run `npx cap add ios` to add iOS platform
6. Run `npx cap sync` to sync the project

## Info.plist Permissions

After running `npx cap add ios`, you need to add the following permissions to your `ios/App/App/Info.plist` file:

### Required Permission Descriptions

Add these entries inside the `<dict>` tag:

```xml
<!-- Voice Recording Permission -->
<key>NSMicrophoneUsageDescription</key>
<string>Npd needs access to your microphone to record voice notes.</string>

<!-- Push Notifications -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

## Push Notifications Setup

### Apple Push Notification Service (APNs) Setup

1. Log in to [Apple Developer Portal](https://developer.apple.com/)
2. Go to Certificates, Identifiers & Profiles
3. Create an App ID with Push Notifications capability
4. Create an APNs Key or Certificate
5. Configure your server with the APNs credentials

### Enable Push Notifications in Xcode

1. Open the project in Xcode: `npx cap open ios`
2. Select your target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" and check "Remote notifications"

## Voice Recording Setup

iOS requires permission description for microphone access. This is handled via the `NSMicrophoneUsageDescription` key in Info.plist.

The app will automatically prompt the user for microphone permission when they first try to record.

## Local Notifications Setup

Local notifications work out of the box with the Capacitor Local Notifications plugin. The user will be prompted for permission when scheduling the first notification.

## Building the App

1. Sync your project: `npx cap sync ios`
2. Open in Xcode: `npx cap open ios`
3. Select your development team in Signing & Capabilities
4. Build and run from Xcode

## Troubleshooting

### Push notifications not working
- Ensure Push Notifications capability is enabled in Xcode
- Verify APNs certificate/key is configured correctly
- Check that the device is registered (simulators don't support push)

### Voice recording not working
- Ensure the NSMicrophoneUsageDescription is set in Info.plist
- Grant microphone permission when prompted

### Local notifications not appearing
- Ensure the app has notification permissions
- Check notification settings in iOS Settings app
