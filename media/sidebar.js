const vscode = acquireVsCodeApi();

/**
 * Add load event.
 */
window.addEventListener('load', main);

// Declare Html elements.
const startTestGeneration = document.getElementById(
  'start-test-generation-button',
);
const saveButton = document.getElementById('save-button-id');
const usernameTextField = document.getElementById('username-text-field-id');
const accessKeyTextField = document.getElementById('access-key-text-field-id');
const regionTextField = document.getElementById('region-text-field-id');

const sauceOrange = '#F1997B';

/**
 * Main function
 */
function main() {
  // Add eventLsteners of Html elements.
  startTestGeneration?.addEventListener('click', handleStartButtonClick);
  saveButton?.addEventListener('click', handleSaveClick);
  vscode.postMessage({
    command: 'load-history-links',
  });

  // createOutputLanguage();

  // Handle messages sent from the extension or panel to the webview
  window.addEventListener('message', (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
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
    command: 'show-test-generation-panel',
  });
}

/**
 * Handle save  click event.
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
    command: 'save-credentials',
    data: data,
  });
}

/**
 * Generate history links.
 */
function createOutputLanguage() {
  const languageOptions = document.getElementById('language-options');
  languageOptions.classList.add('checkbox-container');

  // Appium Python
  var div = document.createElement('div');

  var languageScriptChoice = document.createElement('input');
  languageScriptChoice.type = 'radio';
  languageScriptChoice.name = `language_choice`;
  var radio_id = `language_appium_python`;
  languageScriptChoice.id = radio_id;
  languageScriptChoice.checked = true;
  var labelLanguageScriptChoice = document.createElement('label');
  labelLanguageScriptChoice.for = radio_id;
  labelLanguageScriptChoice.innerHTML = 'Appium Python';

  languageScriptChoice.onclick = function () {
    vscode.postMessage({
      command: 'load-language',
      language: 'appium_python',
    });
  };

  div.appendChild(languageScriptChoice);
  div.appendChild(labelLanguageScriptChoice);
  languageOptions.appendChild(div);

  // Appium Java
  div = document.createElement('div');

  languageScriptChoice = document.createElement('input');
  languageScriptChoice.type = 'radio';
  languageScriptChoice.name = `language_choice`;
  radio_id = `language_appium_java`;
  languageScriptChoice.id = radio_id;
  labelLanguageScriptChoice = document.createElement('label');
  labelLanguageScriptChoice.for = radio_id;
  labelLanguageScriptChoice.innerHTML = 'Appium Java';

  languageScriptChoice.onclick = function () {
    vscode.postMessage({
      command: 'load-language',
      language: 'appium_java',
    });
  };

  div.appendChild(languageScriptChoice);
  div.appendChild(labelLanguageScriptChoice);
  languageOptions.appendChild(div);

  languageOptions.appendChild(document.createElement('br'));
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
    var historyLink = document.createElement('div');
    if (x == selected) {
      historyLink.classList.add('history-selected');
    }
    historyLink.classList.add('history-instance');
    historyLink.setAttribute('testID', history.testID);
    historyLink.onclick = function () {
      resetHistoryLinkColor();
      this.classList.add('history-selected');
      vscode.postMessage({
        command: 'show-test-generation-panel',
        data: history.testID,
      });
    };
    historyLink.innerHTML =
      '\u2192 ' + getTestRecordName(history.apk, history.goal);

    var trashButton = document.createElement('i');
    trashButton.classList.add('fa', 'fa-trash');
    trashButton.onclick = function () {
      console.log(history);
      vscode.postMessage({
        command: 'delete-history',
        data: history.testID,
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

function getTestRecordName(apk, goal) {
  let name = apk.substring(0, apk.lastIndexOf('.'));
  name += ': ';
  name += goal;

  return name;
}
