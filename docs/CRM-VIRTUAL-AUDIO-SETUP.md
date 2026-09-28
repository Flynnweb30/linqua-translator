# CRM Virtual-Microphone Setup

## What the browser can and cannot do

Linqua creates a real processed `MediaStream` from the selected microphone. The browser cannot register that stream as a new operating-system microphone device.

The project therefore exposes two valid paths:

1. **Browser-only path** — use the processed stream internally for WebRTC-compatible integrations.
2. **CRM microphone path** — install an OS virtual-audio driver/mixer, then route the processed stream to that driver's playback endpoint. The CRM selects the corresponding recording endpoint as its microphone.

## Windows path

A practical Windows setup is VB-AUDIO VB-CABLE or Voicemeeter.

### VB-CABLE

VB-CABLE provides a playback endpoint and a corresponding recording endpoint. The official reference describes the driver as a virtual audio cable that transports audio from its input to its output.

Setup:

1. Install the driver from the official VB-Audio distribution.
2. Reboot Windows when requested.
3. Start Linqua over HTTPS or localhost.
4. Allow microphone access.
5. Select the physical microphone.
6. Select the virtual cable's **playback** endpoint in Linqua's **Virtual-Mic Bridge** output selector.
7. Click **Connect Virtual-Mic Bridge**.
8. In the CRM microphone settings, select the virtual cable's **recording** endpoint.
9. Test the CRM microphone level before making a live call.

The exact OS device names depend on the installed driver and Windows audio configuration.

### Voicemeeter

Voicemeeter can provide virtual input/output devices and mix physical microphone audio with application audio. If used:

1. Install Voicemeeter.
2. Reboot if the installer requests it.
3. Configure the physical microphone as the hardware input.
4. Configure the desired virtual output bus.
5. In Linqua, route the processed microphone stream to the matching Voicemeeter playback/output endpoint.
6. In the CRM, select the corresponding Voicemeeter virtual recording endpoint.
7. Confirm the CRM receives the processed microphone signal.

## Incoming CRM speaker audio

The web app cannot silently read another tab's audio.

Use **Capture CRM Tab Audio**:

1. Open the CRM call.
2. Return to Linqua.
3. Start translation or click **Capture CRM Tab Audio**.
4. In Chrome/Edge's picker, select the CRM tab.
5. Enable tab audio.
6. Keep the CRM call tab active as required by the browser's capture rules.
7. Linqua processes the captured audio and sends live PCM to the translation service.
8. The live transcription language drives the Spanish/English indicator.

A Chrome extension using `chrome.tabCapture` can automate the tab-capture portion for supported workflows. It does not replace the operating-system virtual-audio driver.

## Exact limitation

If the requirement is that the application itself must install a brand-new OS device whose exact name is **Linqua Translator**, the web application alone cannot satisfy that requirement. A native installer/driver is required.

The current project intentionally does not fake this state. It reports the browser-local stream separately and provides the valid virtual-driver bridge when an OS virtual-audio endpoint exists.
