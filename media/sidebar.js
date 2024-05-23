const vscode = acquireVsCodeApi();

/**
 * Add load event.
 */
window.addEventListener('load', main);

// Declare HTML elements.
const startTestGeneration = document.getElementById(
  'start-test-generation-button',
);
const saveButton = document.getElementById('save-button-id');
const usernameTextField = document.getElementById('username-text-field-id');
const accessKeyTextField = document.getElementById('access-key-text-field-id');
const regionTextField = document.getElementById('region-text-field-id');
const clearHistoryButton = document.getElementById('clear-history');

const sauceOrange = '#F1997B';

/**
 * Main function
 */
function main() {
  // Add event listeners.
  startTestGeneration?.addEventListener('click', handleStartButtonClick);
  saveButton?.addEventListener('click', handleSaveClick);
  clearHistoryButton?.addEventListener('click', handleClearHistory);
  vscode.postMessage({
    action: 'load-history-links',
  });

  // Handle messages sent from the extension or panel to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.action) {
      case 'settings-exist':
        usernameTextField.value = message.data.username;
        accessKeyTextField.value = message.data.accessKey;
        regionTextField.value = message.data.region;
        break;
      case 'update-history-links':
        console.log('Updating history links');
        document.getElementById('history-links').innerHTML = '';
        createHistoryLinks(message.data, message.selected);
        break;
      case 'clear-history-links':
        resetHistoryLinkColor();
        break;
      case 'error':
        console.log(message);
        break;
    }
  });
}

/**
 * Handle start button click event.
 */
function handleStartButtonClick() {
  // Send messages to Panel.
  resetHistoryLinkColor();
  vscode.postMessage({
    action: 'show-test-generation-panel',
  });
}

/**
 * Handle save click event.
 */
function handleSaveClick() {
  console.log('Handling save');
  const data = {
    username: usernameTextField?.value,
    accessKey: accessKeyTextField?.value,
    region: regionTextField?.value,
  };
  console.log(data);
  vscode.postMessage({
    action: 'save-credentials',
    data: data,
  });
}

// Handle click on clear history button event.
function handleClearHistory() {
  vscode.postMessage({
    action: 'clear-history',
  });
}

/**
 * Generate history links.
 */
function createHistoryLinks(history_list, selected) {
  if (history_list.length > 0) {
    document.getElementById('history-intro').style.display = 'none';
  } else {
    document.getElementById('history-intro').style.display = 'block';
  }
  const historyLinks = document.getElementById('history-links');
  historyLinks.classList.add('history-block');

  for (let x = 0; x < history_list.length; x++) {
    let history = history_list[x];
    const historyLink = document.createElement('div');
    if (x === selected) {
      historyLink.classList.add('history-selected');
    }
    historyLink.classList.add('history-instance');
    historyLink.setAttribute('test_id', history.test_id);
    historyLink.onclick = function () {
      resetHistoryLinkColor();
      this.classList.add('history-selected');
      vscode.postMessage({
        action: 'show-test-generation-panel',
        data: history.test_id,
      });
    };
    historyLink.innerHTML =
      '\u2192 ' + getTestRecordName(history.app_name, history.goal);

    const trashButton = document.createElement('i');
    trashButton.classList.add('fa', 'fa-trash');
    trashButton.onclick = function () {
      console.log(history);
      vscode.postMessage({
        action: 'delete-test-record',
        data: history.test_id,
      });
    };
    historyLinks.appendChild(historyLink);
    historyLinks.appendChild(trashButton);
  }
}

function resetHistoryLinkColor() {
  var historyLinkList = document.getElementsByClassName('history-instance');
  for (let historyN = 0; historyN < historyLinkList.length; historyN++) {
    historyLinkList[historyN].classList.remove('history-selected');
  }
}

function getTestRecordName(appName, goal) {
  let name = appName.substring(0, appName.lastIndexOf('.'));
  name += ': ';
  name += goal;

  return name;
}
