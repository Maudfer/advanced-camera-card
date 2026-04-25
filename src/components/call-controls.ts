import { CSSResultGroup, LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dispatchActionExecutionRequest } from '../card-controller/actions/utils/execution-request.js';
import { CallState } from '../card-controller/call-manager.js';
import { CardWideConfig } from '../config/schema/types.js';
import { localize } from '../localize/localize.js';
import callControlsStyle from '../scss/call-controls.scss';
import { createGeneralAction } from '../utils/action.js';
import { renderProgressIndicator } from './progress-indicator.js';

@customElement('advanced-camera-card-call-controls')
export class AdvancedCameraCardCallControls extends LitElement {
  @property({ attribute: false })
  public callState?: CallState;

  @property({ attribute: false, type: Boolean })
  public microphoneMuted = true;

  @property({ attribute: false, type: Boolean })
  public speakerMuted = true;

  @property({ attribute: false, type: Boolean })
  public hasSpeaker = false;

  @property({ attribute: false })
  public cardWideConfig?: CardWideConfig | null;

  protected _dispatchAction(action: ReturnType<typeof createGeneralAction>): void {
    dispatchActionExecutionRequest(this, { actions: action });
  }

  protected _renderActionButton(options: {
    action: ReturnType<typeof createGeneralAction>;
    icon: string;
    label: string;
    disabled?: boolean;
    emphasis?: 'critical';
  }): TemplateResult {
    return html`
      <ha-icon-button
        .label=${options.label}
        title=${options.label}
        ?disabled=${!!options.disabled}
        class=${options.emphasis === 'critical' ? 'critical' : ''}
        @click=${() => this._dispatchAction(options.action)}
      >
        <ha-icon icon=${options.icon}></ha-icon>
      </ha-icon-button>
    `;
  }

  protected render(): TemplateResult | void {
    if (!this.callState || this.callState === 'idle') {
      return;
    }

    if (this.callState === 'connecting_call') {
      return html`<div class="overlay">
        <div class="panel loading">
          ${renderProgressIndicator({
            message: localize('call.connecting'),
            cardWideConfig: this.cardWideConfig,
            size: 'small',
          })}
          ${this._renderActionButton({
            action: createGeneralAction('call_end'),
            icon: 'mdi:phone-hangup',
            label: localize('call.end'),
            emphasis: 'critical',
          })}
        </div>
      </div>`;
    }

    if (this.callState === 'ending_call') {
      return html`<div class="overlay">
        <div class="panel loading">
          ${renderProgressIndicator({
            message: localize('call.ending'),
            cardWideConfig: this.cardWideConfig,
            size: 'small',
          })}
        </div>
      </div>`;
    }

    return html`<div class="overlay">
      <div class="panel controls">
        <span class="title">${localize('call.active')}</span>
        <div class="buttons">
          ${this._renderActionButton({
            action: createGeneralAction('call_end'),
            icon: 'mdi:phone-hangup',
            label: localize('call.end'),
            emphasis: 'critical',
          })}
          ${this._renderActionButton({
            action: createGeneralAction(
              this.microphoneMuted ? 'microphone_unmute' : 'microphone_mute',
            ),
            icon: this.microphoneMuted ? 'mdi:microphone-off' : 'mdi:microphone',
            label: this.microphoneMuted
              ? localize('call.unmute_microphone')
              : localize('call.mute_microphone'),
          })}
          ${this._renderActionButton({
            action: createGeneralAction(this.speakerMuted ? 'unmute' : 'mute'),
            icon: this.speakerMuted ? 'mdi:volume-off' : 'mdi:volume-high',
            label: this.speakerMuted
              ? localize('call.unmute_speaker')
              : localize('call.mute_speaker'),
            disabled: !this.hasSpeaker,
          })}
        </div>
      </div>
    </div>`;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(callControlsStyle);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'advanced-camera-card-call-controls': AdvancedCameraCardCallControls;
  }
}
