# `call`

The `call` block configures the dedicated stream used when a camera enters the call flow.

This configuration is included as part of a camera entry in the `cameras` list.

> [!NOTE]
> Call is the canonical live 2-way-audio entry flow. Start a call with the `call` menu button, then mute or unmute the microphone from the in-call overlay.
>
> [!NOTE]
> The current implementation requires the camera to use the `go2rtc` [live provider](live-provider.md). Starting a call from a substream override is not currently supported.

```yaml
cameras:
  - camera_entity: camera.front_door
    live_provider: go2rtc
    call:
      stream: front_door_intercom
```

- `stream`: The dedicated `go2rtc` stream name to use while the call is active. If not configured, the built-in `call` button will not appear for that camera.

## Shared behavior

Call-related behavior now lives in shared configuration blocks:

- [`live.microphone.auto_unmute`](../live.md?id=microphone) and [`live.microphone.auto_mute`](../live.md?id=microphone) control microphone behavior when calls start and end.
- [`live.microphone.lock_navigation`](../live.md?id=microphone) controls whether navigation is blocked while the microphone is active.
- [`menu.auto_hide`](../menu.md) can hide the regular menu while a call is active.
- [`menu.buttons.call.enabled`](../menu.md?id=buttons) controls whether the built-in `call` button is shown.

## Example

See [Call with a dedicated stream](../../examples.md?id=call-with-a-dedicated-stream) for a complete example that uses `call.stream` together with shared microphone and menu behavior.
