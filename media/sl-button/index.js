(function () {
  const template = document.createElement('template');

  template.innerHTML = `
    <style>
      button {
        // padding: var(--offset-base) var(--offset-large);
        font-family: var(--sauce-font-mono);
        text-align: center;
        transition: all 0.15s ease-in-out;
        cursor: pointer;
        font-weight: bold;
        padding: var(--offset-large) var(--offset-xlarge);
        font-size: 1.1em;
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
      
      button.primary:hover {
        border: 1px solid var(--color-sauce-dark);
        background: var(--color-sauce-yellow);
      }
    </style>

    <button class="primary">
      <slot/>
    </button>
  `;
  class SLButton extends HTMLElement {
    static observedAttributes = ['click'];
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      console.log('connected stateful-button');

      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    attributeChangedCallback(name, oldValue, newValue) {
      console.log(`Setting ${name} attribute: ${newValue}`);
      const button = document.querySelector('button');
      button.onclick = newValue;
    }
  }

  customElements.define('sl-button', SLButton);
})();
