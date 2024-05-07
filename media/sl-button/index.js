// @ts-check
(function () {
  const template = document.createElement('template');

  template.innerHTML = `
    <style>
      button {
        font-family: var(--sauce-font-mono);
        text-align: center;
        transition: all 0.15s ease-in-out;
        cursor: pointer;
        font-weight: bold;
      }
      
      button:focus {
        outline-color: var(--vscode-focusBorder);
      }
      
      button.primary {
        background: var(--color-sauce-green);
        border-radius: var(--border-radius-large);
        color: var(--color-sauce-dark);
        border: 1px solid var(--color-sauce-green);
      }
      
      button.primary:not(:disabled):hover {
        border: 1px solid var(--color-sauce-dark);
        background: var(--color-sauce-yellow);
      }

      button.danger {
        color: #fff;
        background-color: var(--color-sauce-coral);
        border: 1px solid var(--color-sauce-coral);
        border-radius: var(--border-radius-large);
        color: var(--color-sauce-dark);
      }

      button.lg {
        padding: var(--offset-large) var(--offset-xlarge);
        font-size: 1.1em;
      }

      button.md {
        padding: var(--offset-base) var(--offset-large);
      }

      button:disabled {
        cursor: not-allowed;
        background-color: var(--color-sauce-gray-300);
        color: var(--color-sauce-gray-disabled);
        border: 1px solid var(--color-sauce-gray-300);
      }

    </style>

    <button id="host">
      <slot/>
    </button>
  `;
  class SLButton extends HTMLElement {
    static observedAttributes = ['color', 'size', 'disabled'];

    constructor() {
      super();

      this.color = 'primary';
      this.size = 'lg';
      this.disabled = false;

      this.attachShadow({ mode: 'open' });
      this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
      const button = this.shadowRoot?.querySelector('button');
      button?.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('press', {
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        );
      });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }

      switch (name) {
        case 'color': {
          this.color = newValue;
          break;
        }
        case 'size': {
          this.size = newValue;
          break;
        }
        case 'disabled':
          console.log('new disabled value:', newValue);
          this.disabled = newValue !== null;
      }

      const button = this.shadowRoot?.querySelector('button');
      button?.setAttribute('class', `${this.color} ${this.size}`);
      if (this.disabled) {
        button?.setAttribute('disabled', '');
      } else {
        button?.removeAttribute('disabled');
      }
    }
  }

  customElements.define('sl-button', SLButton);
})();
