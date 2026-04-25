# 2-way Audio

This card supports 2-way audio (e.g. transmitting audio from a microphone to a
suitably equipped camera). In general, due to the myriad of different cameras,
security requirements and browser limitations getting 2-way audio to work may
be challenging.

## Requirements

### Environmental requirements

- Must have a camera that supports audio out (otherwise what's the point!)
- Camera must be supported by `go2rtc` for 2-way audio (see [supported cameras](https://github.com/AlexxIT/go2rtc#two-way-audio)).
- Must be accessing your Home Assistant instance over `https`. The browser will enforce this.

### Card requirements

- Only the `go2rtc` live provider is supported.
- The active camera must have `call.stream` configured.
- Only the `webrtc` mode supports 2-way audio.

If your setup supports 2-way audio but detection is intermittent on load:

- Increase `cameras[].go2rtc.metadata_fetch_timeout_seconds`.
- Or force the capability with `cameras[].capabilities.force: ['2-way-audio']`.

## Example configuration

```yaml
type: custom:advanced-camera-card
cameras:
  - camera_entity: camera.office
    live_provider: go2rtc
    call:
      stream: office_intercom
    go2rtc:
      modes:
        - webrtc
      # Optional: For slower cameras increase timeout (default: 2)
      metadata_fetch_timeout_seconds: 10
```

## Usage

- If [`always_connected`](../configuration/live.md?id=microphone) is `true`, the
  card will automatically start the call flow when the live view loads.
- Otherwise, in the live view, start speaking by tapping the `call` button.
- Once the call is active, use the microphone button in the in-call overlay to
  mute or unmute yourself.
- The separate `microphone` menu button is not shown in the live view. It may
  still be used in other non-live contexts if enabled.
- The video will automatically reset to remove the microphone after the number
  of seconds specified by
  [`disconnect_seconds`](../configuration/live.md?id=microphone) configuration have
  elapsed since the microphone was last muted or unmuted.
