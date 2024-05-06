import { AppiumPython } from './appium-python.js';
import { AppiumJava } from './appium-java.js';
import {
  generateAllRDCCheckboxes,
  getSelectedDevices,
} from './rdc-device-checkboxes.js';

const vscode = acquireVsCodeApi();

/**
 * Add load event.
 */
window.addEventListener('load', main);
console.log('RELOADING PAGE');
console.log(vscode.getState());

// Declare Html elements.
const testGallery = document.getElementById('gallery-container');
const outputScript = document.getElementById('output-script-container');
const appName = document.getElementById('app-name-text-id');
const goalText = document.getElementById('goal-text-id');
const generateButton = document.getElementById('generate-button-id');

const clearButton = document.getElementById('clear-button-id');
const testHeader = document.getElementById('test-header');
const assertContainer = document.getElementById('assert-container');
const outputLanguageDiv = document.getElementById('output-language-div');

const maxTestSteps = document.getElementById('max_test_steps');
const platformVersion = document.getElementById('platform_number');
const platform = document.getElementById('device_platform');

// Declare Styles
const sauceOrange = '#EE805A';
const DEFAULT_IMG_HEIGHT = 350;
const videoStreamImgHeight = 500;

// Code Generator Default
let codeTemplateGenerator = new AppiumPython();

// Declare Default Values
const defaultMaxSteps = maxTestSteps.value;

// Declare device websocket
let ws;

function setStatus(message) {
  const statusField = document.getElementById('message-status-field');
  statusField.innerHTML = message;
}

function main() {
  // Add event listeners.
  generateButton?.addEventListener('click', handleAskClick);
  clearButton?.addEventListener('click', handleClearClick);

  // goal enter event
  goalText?.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Trigger the button element with a click
      handleAskClick();
    }
  });

  // save values
  appName?.addEventListener('keyup', function (event) {
    updateState('app_name', appName.value);
  });
  goalText?.addEventListener('keyup', function (event) {
    updateState('goal', goalText.value);
  });
  assertContainer?.addEventListener('keyup', function (event) {
    const screenAsserts = [];
    for (let child of assertContainer.children) {
      if (child.type == 'text') screenAsserts.push(child.value);
    }
    updateState('assert_screen_desc_container', screenAsserts);
  });

  // Add RDC device options checkboxes. Go to method to add more device options
  generateAssertInputs();
  generateAllRDCCheckboxes(document.getElementById('rdc-checkbox-container'));
  generateLanguageSelectionOptions();

  const coll = document.getElementsByClassName('collapsible');
  for (let i = 0; i < coll.length; i++) {
    coll[i].addEventListener('click', function () {
      this.classList.toggle('active');
      const content = this.nextElementSibling;
      if (content.style.display === 'block') {
        content.style.display = 'none';
      } else {
        content.style.display = 'block';
      }
    });
  }

  // Repopulate with previous state
  if (vscode.getState() !== undefined) {
    console.log('READING IN STATE');
    generateFullTestDisplay();
  }

  try {
    // Handle messages sent from the extension to the webview
    console.log('LISTENER CREATED');
    window.addEventListener('message', (event) => {
      const message = event.data; // The json data that the extension sent
      switch (message.action) {
        case 'update-test-progress':
          setStatus(message.data.status_message);
          break;
        case 'show-video': {
          setStatus(message.data.status_message);
          const { username, accessKey, region } = message.credentials;
          startDeviceWebsocket(
            username,
            accessKey,
            region,
            message.data.session_id,
          );
          break;
        }
        case 'show-test-record':
          // Append answer.
          testHeader.style.display = 'block';
          console.log('Reading in history');
          console.log(message.data);

          const testRecord = message.data?.testRecord ?? {};
          const votes = message.data?.votes ?? [];
          updateStepDataState(testRecord);
          updateState('votes', votes);
          generateFullTestDisplay();
          break;
        case 'show-new-test-record':
          // FIXME The difference between this and 'show-test-record' is confusing.
          // `show-test-record` is used to display the test record in the panel
          // when loading the test record from the history.
          // While `show-new-test-record` is the finished record that comes fresh
          // from the test generation process.
          testGallery.innerHTML = '';
          outputScript.innerHTML = '';
          vscode.postMessage({
            action: 'save-steps',
            data: message.data,
          });
          updateStepDataState(message.data);
          generateFullTestDisplay();
          break;
        case 'error':
          // Retain the previous state, which may contain a useful error message
          // or snapshot of the video.
          vscode.postMessage({
            action: 'enable-test-record-navigation',
          });
          if (ws !== undefined) {
            ws.close();
          }
          break;
        case 'finalize':
          testGallery.innerHTML = '';
          vscode.postMessage({
            action: 'enable-test-record-navigation',
          });
          if (ws !== undefined) {
            ws.close();
          }
          break;
        case 'clear':
          clearScreen();
          break;
      }
    });
  } catch (err) {
    console.log(err);
  }
}

function handleStopClick() {
  vscode.postMessage({
    action: 'stop-generation',
    data: {},
  });
  // TODO: Disable stop button
}

function handleAskClick() {
  // Clear answer filed.
  testGallery.innerHTML = '';
  outputScript.innerHTML = '';
  testHeader.style.display = 'none';

  setUpStatusUpdates();

  const assertInputsContainers = document.getElementsByClassName(
    'screen-desc-assert-input',
  );
  const assertInputDescs = [];
  for (let cont of assertInputsContainers) {
    assertInputDescs.push(cont.value);
  }

  // Send messages to Panel.
  vscode.postMessage({
    action: 'generate-test',
    data: {
      goal: goalText.value,
      app_name: appName.value,
      assertions: assertInputDescs,
      max_test_steps: parseInt(maxTestSteps.value),
      devices: getSelectedDevices(),
      platform: platform.value,
      platform_version: platformVersion.value,
    },
  });
}

/**
 * Handle clear button click event.
 */
function handleClearClick() {
  clearScreen();
}

/**
 * Set up the elements which will contain the status updates and the video
 */
function setUpStatusUpdates() {
  testGallery.innerHTML = '';
  outputScript.innerHTML = '';
  testGallery.appendChild(document.createElement('br'));

  const statusContainer = document.createElement('div');
  statusContainer.classList.add('status-container');

  const statusBlockMessages = document.createElement('div');
  statusBlockMessages.classList.add('status-block-messages');

  const stopButton = document.createElement('sl-button');
  stopButton.innerText = 'Stop';
  stopButton.setAttribute('id', 'stop-button');
  stopButton.addEventListener('press', handleStopClick);
  stopButton.setAttribute('color', 'primary');
  stopButton.setAttribute('size', 'lg');
  stopButton.setAttribute('disabled', '');
  statusContainer.appendChild(stopButton);

  const statusField = document.createElement('span');
  statusField.classList.add('test-status-header');
  statusField.id = 'message-status-field';
  statusBlockMessages.appendChild(statusField);

  const statusBlockTestData = document.createElement('div');
  statusBlockTestData.classList.add('status-block-test-data');

  const videoField = document.createElement('div');
  videoField.classList.add('test-status-header');
  videoField.classList.add('test-status-video');
  videoField.id = 'video-status-field';

  const canvasNode = document.createElement('canvas');
  canvasNode.id = 'video-status-canvas';
  videoField.appendChild(canvasNode);
  statusBlockTestData.appendChild(videoField);

  statusContainer.appendChild(statusBlockMessages);
  statusContainer.appendChild(document.createElement('br'));
  statusContainer.appendChild(statusBlockTestData);
  testGallery.appendChild(statusContainer);
}

/**
 * Connects to websocket which provides images to create live stream of device.
 */
function startDeviceWebsocket(username, accessKey, region, session_id) {
  if (
    username === undefined ||
    accessKey === undefined ||
    region === undefined ||
    session_id === undefined
  ) {
    return;
  }
  ws = new WebSocket(
    `wss://${username}:${accessKey}@api.${region}.saucelabs.com/v1/rdc/socket/alternativeIo/${session_id}`,
  );
  ws.onerror = function (error) {
    console.log('Websocket Error: ', error);
  };
  ws.onmessage = function (event) {
    const NOTIFY_MESSAGE_PREFIX = 'n/';
    generateStatusVideo(event.data);
    ws.send(NOTIFY_MESSAGE_PREFIX);
  };
}

/**
 * Updates the image in the video canvas
 * @param {Blob} data
 */
function generateStatusVideo(data) {
  if (!(data instanceof Blob)) {
    return;
  }

  const blob = new Blob([data], { type: 'image/jpeg' });

  const canvasNode = document.getElementById('video-status-canvas');

  const ctx = canvasNode.getContext('2d');
  const img = new Image();
  img.src = window.URL.createObjectURL(blob);
  img.onload = () => {
    const height = videoStreamImgHeight;
    const width = (videoStreamImgHeight * img.width) / img.height;
    canvasNode.height = height;
    canvasNode.width = width;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.strokeRect(0, 0, width, height);
  };
}

/**
 * Generate the full test output, including llm-generated steps and create script button.
 */
function generateFullTestDisplay() {
  const data = vscode.getState();
  appName.value = data.app_name;
  goalText.value = data.goal;
  maxTestSteps.value = data.max_test_steps;
  platform.value = data.platform;

  assertContainer.innerHTML = '';
  if ('assert_screen_desc_container' in data) {
    for (let desc of data.assert_screen_desc_container) {
      addHistoryAddAssert(desc);
    }
  }

  if (!('all_steps' in data)) {
    return;
  }
  testGallery.innerHTML = '';
  outputScript.innerHTML = '';
  console.log('Generate Steps');

  const all_step_data = data.all_steps;
  testHeader.style.display = 'block';

  const editData = {
    app_name: data.app_name,
    device_name: data.selected_device_name,
    platform_version: data.selected_platform_version,
    prev_goal: data.goal,
  };

  const timeoutTime = 400;
  for (let i = 0; i < all_step_data.length; i++) {
    setTimeout(function () {
      let user_screen_descs = [];
      if ('user_screen_descs' in data) {
        user_screen_descs = data.user_screen_descs;
      }

      const finalScreen = all_step_data[i].action === 'done';
      generateStep(
        i,
        data.screen_width,
        data.screen_height,
        all_step_data[i],
        editData,
        data.test_id,
        user_screen_descs,
        data.votes,
        finalScreen,
      );
    }, timeoutTime);
  }
  generateTestOutputInteractables(
    all_step_data,
    data.goal,
    data.app_name,
    data.selected_device_name,
    data.selected_platform_version,
    data.region,
    data.platform,
  );
}

/**
 * Generate a single step of the llm-generated steps. This includes the screenshot, the code options for the step and
 * ScriptIQ's reasoning
 */
function generateStep(
  i,
  screenWidth,
  screenHeight,
  stepData,
  edit_data,
  testID,
  user_screen_descs,
  votes = [],
  finalScreen,
) {
  const stepGallery = document.createElement('div');
  stepGallery.className = 'test-step-right';

  stepGallery.appendChild(document.createElement('br'));
  // Get rating from votes according to step_num.
  const rating =
    votes.find((vote) => vote.step_num === i)?.rating ?? 'norating';
  if (!finalScreen) {
    stepGallery.appendChild(
      generateCodeChoicesContainer(i, stepData, testID, rating),
    );
  }

  const reasonContainer = generateReasonContainer(stepData);
  if (reasonContainer !== undefined) stepGallery.appendChild(reasonContainer);

  const screenDescIdeasContainer = generateScreenDescIdeasContainer(stepData);
  if (screenDescIdeasContainer !== undefined)
    stepGallery.appendChild(screenDescIdeasContainer);

  const screenMatchContainer = generateScreenMatchContainer(
    stepData,
    user_screen_descs,
  );
  if (screenMatchContainer !== undefined)
    stepGallery.appendChild(screenMatchContainer);

  stepGallery.childNodes[stepGallery.childNodes.length - 1].classList.add(
    'end-step-block',
  );

  // const [editTestButton, editTestDiv] = addEditTestInteractions(i, edit_data);
  // if (stepData.potential_identifiers.length > 0) {
  //     stepGallery.appendChild(document.createElement('br'));
  //     stepGallery.appendChild(editTestButton);
  //     stepGallery.appendChild(document.createElement('br'));
  //     stepGallery.appendChild(editTestDiv);
  // }

  const imgRatio = screenWidth / screenHeight;
  const height = DEFAULT_IMG_HEIGHT;
  const width = height * imgRatio;
  const img = createAnnotatedImage({
    annotation: stepData.location,
    height,
    width,
    src: `${historyPath}/${testID}/${stepData.img_name}`,
  });

  const imgContainer = document.createElement('div');
  imgContainer.appendChild(img);

  const resizer = createHorizontalResizeBar({
    onResize: ({ x }) => {
      if (x === 0) {
        return;
      }

      const origin = resizer.previousSibling.getBoundingClientRect().width;
      const minWidth = width;
      const maxWidth =
        resizer.parentElement.getBoundingClientRect().width * 0.5;

      const newWidth = Math.min(Math.max(minWidth, origin + x), maxWidth);
      const newHeight = newWidth * (1 / imgRatio);

      if (newWidth === minWidth || newWidth === maxWidth) {
        return;
      }

      const newImg = createAnnotatedImage({
        annotation: stepData.location,
        height: newHeight,
        width: newWidth,
        src: `${historyPath}/${testID}/${stepData.img_name}`,
      });
      resizer.previousSibling.style.width = `${newWidth}px`;
      resizer.previousSibling.replaceChildren(newImg);
    },
  });

  const sectionHeader = document.createElement('h4');
  sectionHeader.append(finalScreen ? 'Finished' : `Step ${i + 1}`);

  const sectionBody = document.createElement('div');
  sectionBody.className = 'test-container';
  sectionBody.appendChild(imgContainer);
  sectionBody.appendChild(resizer);
  sectionBody.appendChild(stepGallery);

  const section = document.createElement('section');
  section.appendChild(sectionHeader);
  section.appendChild(sectionBody);

  testGallery.appendChild(section);
}

/**
 * @typedef {Object} Annotation
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} AnnotatedImageProps
 * @property {Annotation} [annotation]
 * @property {number} width
 * @property {number} height
 * @property {string} src
 */
/**
 * Renders an image to a canvas and renders an optional
 * Annotation overlay to highlight a particular part of the image.
 * @param {AnnotatedImageProps} props
 */
function createAnnotatedImage({ annotation, height, src, width }) {
  const canvasNode = document.createElement('canvas');
  canvasNode.style.border = '1px black';

  canvasNode.width = width;
  canvasNode.height = height;

  const ctx = canvasNode.getContext('2d');
  const img = new Image();
  img.src = src;
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height);
    ctx.strokeRect(0, 0, width, height);

    if (annotation) {
      ctx.lineWidth = 3;
      ctx.rect(
        annotation.x * width,
        annotation.y * height,
        annotation.width * width,
        annotation.height * height,
      );
      ctx.strokeStyle = sauceOrange;
      ctx.shadowColor = sauceOrange;
      ctx.stroke();
    }
  };

  return canvasNode;
}

/**
 *
 * @param {number} i The step number.
 * @param {dict} stepData All the data about the current step of this test.
 * @param {string} testID ID of the test record.
 * @param {string} rating The rating assigned to the current step.
 * @returns The block for step i which displays the code options and the user rating buttons.
 */
function generateCodeChoicesContainer(i, stepData, testID, rating) {
  const codeContainer = document.createElement('div');
  codeContainer.classList.add('code-block');

  if (stepData.potential_identifiers.length > 0) {
    addUserRatingButtons(codeContainer, i, testID, rating);
  }

  const codeChoiceContainer = document.createElement('div');
  codeChoiceContainer.id = `code-choice-container-${i}`;

  if (stepData.potential_identifiers.length > 0) {
    const radioScriptIQChoice = document.createElement('input');
    radioScriptIQChoice.type = 'radio';
    radioScriptIQChoice.name = `script_choice_${i}`;
    let radio_id = `script_choice_step_${i}_value_0`;
    radioScriptIQChoice.id = radio_id;
    radioScriptIQChoice.value = 0;
    radioScriptIQChoice.checked = true;
    const labelScriptIQChoice = document.createElement('label');
    labelScriptIQChoice.for = radio_id;
    labelScriptIQChoice.innerHTML =
      ' ' +
      codeTemplateGenerator.genCodeLine(
        stepData.potential_identifiers[0],
        stepData.action,
      );

    codeChoiceContainer.appendChild(radioScriptIQChoice);
    codeChoiceContainer.appendChild(labelScriptIQChoice);

    codeContainer.append(codeChoiceContainer);

    // Adding other identifier options including skipping the step
    const extraCodeContainer = document.createElement('div');
    extraCodeContainer.id = `extra-code-container-${i}`;
    extraCodeContainer.appendChild(document.createElement('br'));

    // Add Skip Step Comment Option
    // extraCodeContainer = addNoOption(extraCodeContainer, i);
    addNoOption(extraCodeContainer, i);
    for (let x = 1; x < stepData.potential_identifiers.length; x++) {
      const radioOtherChoice = document.createElement('input');
      radioOtherChoice.type = 'radio';
      radioOtherChoice.name = `script_choice_${i}`;
      radio_id = `script_choice_step_${i}_value_${x}`;
      radioOtherChoice.id = radio_id;
      radioOtherChoice.value = x;
      const labelOtherChoice = document.createElement('label');
      labelOtherChoice.for = radio_id;
      labelOtherChoice.innerHTML =
        ' ' +
        codeTemplateGenerator.genCodeLine(
          stepData.potential_identifiers[x],
          stepData.action,
        );

      extraCodeContainer.appendChild(radioOtherChoice);
      extraCodeContainer.appendChild(labelOtherChoice);
      extraCodeContainer.appendChild(document.createElement('br'));
    }
    extraCodeContainer.style.display = 'none';
    codeContainer.appendChild(extraCodeContainer);

    const moreOptionsButton = document.createElement('button');
    moreOptionsButton.classList.add('button', 'button-text', 'collapsible');

    const moreOptionsText = `View step alternatives <span class="collapsible-icon"></span>`;
    const lessOptionsText = `Hide step alternatives <span class="collapsible-icon reverse"></span>`;
    moreOptionsButton.innerHTML = moreOptionsText;

    moreOptionsButton.onclick = function () {
      if (extraCodeContainer.style.display == 'none') {
        extraCodeContainer.style.display = 'inline';
        moreOptionsButton.innerHTML = lessOptionsText;
        moreOptionsButton.classList.add('active');
      } else {
        extraCodeContainer.style.display = 'none';
        moreOptionsButton.innerHTML = moreOptionsText;
        moreOptionsButton.classList.remove('active');
        reorderCodeOptions(i);
      }
    };
    codeContainer.appendChild(moreOptionsButton);
  }

  if ('direction' in stepData && stepData.direction !== '') {
    const swipeCode = document.createElement('pre');
    swipeCode.innerHTML = codeTemplateGenerator.swipeCodeComment(
      stepData.direction,
    );
    codeContainer.appendChild(swipeCode);
  }
  if ('text' in stepData && stepData.text !== '') {
    const setTextCode = document.createElement('pre');
    setTextCode.innerHTML = codeTemplateGenerator.sendTextCodeComment(
      stepData.text,
    );
    codeContainer.appendChild(setTextCode);
  }
  return codeContainer;
}

/**
 * Add the skip step option to the list of potential identifiers for script generation
 * @param {Element} container the element where the option to not add the step will be added
 * @param {number} stepNum the step number
 * @returns the original element, now with the skip step option added
 */
function addNoOption(container, stepNum) {
  const radioOtherChoice = document.createElement('input');
  radioOtherChoice.type = 'radio';
  radioOtherChoice.name = `script_choice_${stepNum}`;
  const radio_id = `script_choice_step_${stepNum}_value_-1`;
  radioOtherChoice.id = radio_id;
  radioOtherChoice.value = -1;

  const labelOtherChoice = document.createElement('label');
  labelOtherChoice.for = radio_id;
  labelOtherChoice.innerHTML = codeTemplateGenerator.noOptionComment();

  container.appendChild(radioOtherChoice);
  container.appendChild(labelOtherChoice);
  container.appendChild(document.createElement('br'));

  // return container;
}

function reorderCodeOptions(i) {
  const codeChoiceContainer = document.getElementById(
    `code-choice-container-${i}`,
  );

  if (!codeChoiceContainer.children[0].checked) {
    const extraCodeContainer = document.getElementById(
      `extra-code-container-${i}`,
    );
    for (let x = 0; x < extraCodeContainer.children.length; x++) {
      if (extraCodeContainer.children[x].checked) {
        break;
      }
    }
    const chosenInput = extraCodeContainer.children[x];
    const chosenLabel = extraCodeContainer.children[x + 1];
    const chosenBreak = extraCodeContainer.children[x + 2];

    const unSelectedInput = codeChoiceContainer.children[0];
    const unSelectedLabel = codeChoiceContainer.children[1];

    extraCodeContainer.appendChild(unSelectedInput);
    extraCodeContainer.appendChild(unSelectedLabel);
    extraCodeContainer.appendChild(chosenBreak);

    codeChoiceContainer.appendChild(chosenInput);
    codeChoiceContainer.appendChild(chosenLabel);
  }
}

/**
 * Add the thumbs up/down for user feedback.
 * @param {Element} container The element with the code container where the user feedback buttons are added.
 * @param {number} i The step number.
 * @param {string} testID ID of the test record.
 * @param {string} rating Rating of the current step.
 */
function addUserRatingButtons(container, i, testID, rating) {
  const selectedClass = 'rating-selected';

  const thumbsUpButton = document.createElement('img');
  thumbsUpButton.classList.add('rating');
  if (rating === 'like') {
    thumbsUpButton.classList.add(selectedClass);
  }
  thumbsUpButton.src = `${mediaPath}/icons/icn-thumbs-up.svg`;
  thumbsUpButton.title = 'like';

  const thumbsDownButton = document.createElement('img');
  thumbsDownButton.classList.add('rating');
  if (rating === 'dislike') {
    thumbsDownButton.classList.add(selectedClass);
  }
  thumbsDownButton.src = `${mediaPath}/icons/icn-thumbs-down.svg`;
  thumbsDownButton.title = 'dislike';

  thumbsUpButton.addEventListener('click', function () {
    const isSelected = !thumbsUpButton.classList.contains(selectedClass);
    if (isSelected) {
      sendUserRating('like', i, testID);
    } else {
      sendUserRating('norating', i, testID);
    }
    thumbsUpButton.classList.toggle(selectedClass);

    // If thumbs down was clicked, set its rating to "norating" since only one rating (thumbs up or thumbs down) is allowed.
    if (isSelected && thumbsDownButton.classList.contains(selectedClass)) {
      thumbsDownButton.classList.remove(selectedClass);
    }
  });
  thumbsDownButton.addEventListener('click', function () {
    const isSelected = !thumbsDownButton.classList.contains(selectedClass);
    if (isSelected) {
      sendUserRating('dislike', i, testID);
    } else {
      sendUserRating('norating', i, testID);
    }
    thumbsDownButton.classList.toggle(selectedClass);

    // If thumbs up was clicked, set its rating to "norating" since only one rating (thumbs up or thumbs down) is allowed.
    if (isSelected && thumbsUpButton.classList.contains(selectedClass)) {
      thumbsUpButton.classList.remove(selectedClass);
    }
  });

  // Despite the order of the DOM elements being thumbs down followed by thumbs up,
  // the CSS handles the presentation in a magic manner: thumbs up, thumbs down.
  container.append(thumbsDownButton, thumbsUpButton);
}

/**
 * Add generate script button and the code to generate script when user click's button
 * @param {Array} identifiers data on each step generated by the llm
 * @param {string} goal provided by user
 * @param {string} appName provided by user
 * @param {string} device_name name of the device ScriptIQ generated test on
 * @param {string} platform_version version of the device ScriptIQ generated test on
 */
function generateTestOutputInteractables(
  identifiers,
  goal,
  appName,
  device_name,
  platform_version,
  region,
  platform,
) {
  const outputButtonsDiv = document.createElement('div');
  outputButtonsDiv.classList.add('flex-container');

  const createScriptButton = document.createElement('button');
  createScriptButton.id = 'create-script-button-id';
  createScriptButton.classList.add(
    'button',
    'button-primary',
    'button-large',
    'mt-30',
  );
  createScriptButton.innerHTML = 'Create Code Script';
  createScriptButton.checked = false;

  const codeContainer = document.createElement('pre');
  codeContainer.id = 'output-script-code-block';
  codeContainer.classList.add('code-block');
  codeContainer.style.display = 'none';

  createScriptButton.onclick = function () {
    let firstGen = false;
    if (codeContainer.innerHTML.length == 0) {
      firstGen = true;
    }
    codeContainer.innerHTML = '';
    codeContainer.style.display = 'block';

    const scriptContainer = document.createElement('div');

    const copyButton = document.createElement('img');
    copyButton.classList.add('script-save-buttons');
    copyButton.src = `${mediaPath}/icons/icn-copy.svg`;

    copyButton.onclick = function () {
      navigator.clipboard.writeText(codeContainer.textContent);
    };

    codeContainer.appendChild(copyButton);

    const headerText = codeTemplateGenerator.scriptHeaderCode(
      goal,
      appName,
      device_name,
      platform_version,
      region,
      platform,
    );

    let codeStepText = '';
    for (let x = 0; x < identifiers.length; x++) {
      const index_element = document.querySelector(
        `input[name="script_choice_${x}"]:checked`,
      );
      let index = -1;
      if (index_element !== null) {
        index = document.querySelector(
          `input[name="script_choice_${x}"]:checked`,
        ).value;
      }

      if (index > -1) {
        codeStepText += codeTemplateGenerator.splitComments(
          identifiers[x].event_reason,
          true,
          `ScriptIQ Reason: `,
        );

        codeStepText +=
          `${codeTemplateGenerator.preTab}` +
          codeTemplateGenerator.genCodeLine(
            identifiers[x].potential_identifiers[index],
            identifiers[x].action,
            x,
          );

        if ('direction' in identifiers[x] && identifiers[x].direction !== '') {
          codeStepText += codeTemplateGenerator.swipeCodeComment(
            identifiers[x].direction,
            true,
            x,
          );
        }
        if ('text' in identifiers[x] && identifiers[x].text !== '') {
          codeStepText += codeTemplateGenerator.sendTextCodeComment(
            identifiers[x].text,
            true,
            x,
          );
        }
        codeStepText += `${codeTemplateGenerator.preNewLine}`;
      }
    }
    const closeStepText = codeTemplateGenerator.endScriptCode();

    scriptContainer.innerHTML = headerText + codeStepText + closeStepText;
    codeContainer.appendChild(scriptContainer);
    if (firstGen) {
      window.scrollBy(0, 200);
    }
    // console.log(codeContainer.textContent)
    // navigator.clipboard.writeText(codeContainer.textContent);
  };
  outputButtonsDiv.appendChild(createScriptButton);
  outputScript.appendChild(outputButtonsDiv);
  outputScript.appendChild(codeContainer);
}

/**
 * Sends rating to API to log
 * @param {string} rating provided by user (liked, disliked, no-rating)
 * @param {number} step that the user rated
 * @param {string} testID ID of the test record
 */
function sendUserRating(rating, step, testID) {
  console.log(`Sending User Rating for step ${step} of ${testID}: ${rating}`);
  vscode.postMessage({
    action: 'send-user-rating',
    data: { rating, step, test_id: testID },
  });
}

function generateLanguageSelectionOptions() {
  outputLanguageDiv.classList.add('flex-container');
  // Appium Python
  let div = document.createElement('div');

  let languageScriptChoice = document.createElement('input');
  languageScriptChoice.type = 'radio';
  languageScriptChoice.name = `language_choice`;
  let radio_id = `language_appium_python`;
  languageScriptChoice.id = radio_id;
  languageScriptChoice.checked = true;
  let labelLanguageScriptChoice = document.createElement('label');
  labelLanguageScriptChoice.for = radio_id;
  labelLanguageScriptChoice.innerHTML = 'Appium Python';

  languageScriptChoice.onclick = function () {
    codeTemplateGenerator = new AppiumPython();
    generateFullTestDisplay();
  };

  div.appendChild(languageScriptChoice);
  div.appendChild(labelLanguageScriptChoice);
  outputLanguageDiv.appendChild(div);

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
    codeTemplateGenerator = new AppiumJava();
    generateFullTestDisplay();
  };

  div.appendChild(languageScriptChoice);
  div.appendChild(labelLanguageScriptChoice);
  outputLanguageDiv.appendChild(div);
}

/**
 * @callback OnResizeCallback
 * @param {number} x
 */

/**
 * @typedef {Object} HorizontalResizeBarProps
 * @property {OnResizeCallback} onResize
 */
/**
 * Creates a control to use for resizing components.
 * @param {HorizontalResizeBarProps} props
 */
function createHorizontalResizeBar({ onResize }) {
  const resizer = document.createElement('div');
  resizer.className = 'resizer';

  const mouseDownHandler = () => {
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  };

  const mouseMoveHandler = (e) => {
    document.body.style.cursor = 'col-resize';

    onResize({ x: e.movementX });
  };

  const mouseUpHandler = () => {
    document.body.style.removeProperty('cursor');

    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  };

  resizer.addEventListener('mousedown', mouseDownHandler);
  return resizer;
}

/**
 * generates the div for the step which displays the reason for generating this step
 * @param {dict} stepData is all the data about the current step of this test
 * @returns the div element
 */
function generateReasonContainer(stepData) {
  if ('event_reason' in stepData && stepData.event_reason !== '') {
    const reasonContainer = document.createElement('div');
    reasonContainer.classList.add('step-block');
    reasonContainer.appendChild(
      document.createTextNode('Why ScriptIQ chose this step:'),
    );
    reasonContainer.appendChild(document.createElement('br'));
    reasonContainer.appendChild(document.createTextNode(stepData.event_reason));
    return reasonContainer;
  }
}

/**
 * generates the div for the step which displays the screen descriptions generated by the system
 * @param {dict} stepData is all the data about the current step of this test
 * @returns the div element
 */
function generateScreenDescIdeasContainer(stepData) {
  if ('screen_descs' in stepData && stepData.screen_descs.length > 0) {
    const descsContainer = document.createElement('div');
    descsContainer.classList.add('step-block');

    descsContainer.appendChild(
      document.createTextNode('ScriptIQ’s Screen Descriptions:'),
    );
    const descsListContainer = document.createElement('ul');
    for (let i = 0; i < stepData.screen_descs.length; i++) {
      const li = document.createElement('li');
      li.innerHTML = stepData.screen_descs[i];
      descsListContainer.append(li);
    }
    descsContainer.appendChild(descsListContainer);
    return descsContainer;
  }
}

/**
 * generates the div for the step which displays the assertion results for the input screen descriptions
 * @param {dict} stepData is all the data about the current step of this test
 * @returns the div element
 */
function generateScreenMatchContainer(stepData, userScreenDescs) {
  if ('sd_asserts' in stepData && stepData.sd_asserts.length > 0) {
    const descsContainer = document.createElement('div');
    descsContainer.classList.add('step-block');

    const descsListContainer = document.createElement('table');
    descsListContainer.setAttribute('border', '1');
    const tbdy = document.createElement('tbody');
    let tr = generateHeaderRow(['Screen Descriptions', 'is Match?']);
    tr.classList.add('table-header');
    tbdy.appendChild(tr);
    for (let i = 0; i < stepData.sd_asserts.length; i++) {
      tr = generateMatchesRow(userScreenDescs[i], stepData.sd_asserts[i]);
      if (stepData.sd_asserts[i]) {
        tr.classList.add('true-assert');
      }
      tbdy.appendChild(tr);
    }
    descsListContainer.appendChild(tbdy);
    descsContainer.appendChild(descsListContainer);
    return descsContainer;
  }
}

function generateHeaderRow(labels) {
  const tr = document.createElement('tr');
  for (const l of labels) {
    const t = document.createElement('th');
    t.appendChild(document.createTextNode(l));
    tr.appendChild(t);
  }
  return tr;
}

function generateMatchesRow(assert, label) {
  const tr = document.createElement('tr');
  let t;

  t = document.createElement('td');
  t.appendChild(document.createTextNode(assert));
  tr.appendChild(t);
  t = document.createElement('td');
  t.appendChild(generateMatchIcon(label));
  tr.appendChild(t);
  return tr;
}

function generateMatchIcon(label) {
  const e = document.createElement('img');
  e.classList.add('matched-result');
  if (label) {
    e.src = `${mediaPath}/icons/icn-status-passed.svg`;
  } else {
    e.src = `${mediaPath}/icons/icn-minus-circle.svg`;
  }
  return e;
}

function assertionInputRow(value = '') {
  const assertInput = document.createElement('input');
  assertInput.classList.add('screen-desc-assert-input');
  if (value !== '') {
    assertInput.value = value;
  }
  const lineBreak = document.createElement('br');

  const minusButton = document.createElement('button');
  minusButton.type = 'button';
  minusButton.classList.add('button');
  minusButton.classList.add('button-minus-row');
  minusButton.innerHTML = '-';
  minusButton.onclick = function () {
    assertContainer.removeChild(assertInput);
    assertContainer.removeChild(minusButton);
    assertContainer.removeChild(lineBreak);
  };
  assertContainer.appendChild(minusButton);
  assertContainer.appendChild(assertInput);
  assertContainer.appendChild(lineBreak);
}

/**
 * Generate the fields to add assert inputs
 */
function generateAssertInputs() {
  const addButton = document.getElementById('add-screen-assert-button');
  addButton.onclick = function () {
    assertionInputRow();
  };
}

function addHistoryAddAssert(assert) {
  assertionInputRow(assert);
}

function updateStepDataState(stepData) {
  for (let [key, value] of Object.entries(stepData)) {
    console.log(key, value);
    updateState(key, value);
  }
  if ('user_screen_descs' in stepData) {
    updateState('assert_screen_desc_container', stepData.user_screen_descs);
  }
}

function updateState(key, value) {
  let state = vscode.getState();
  if (state == undefined) {
    state = {};
  }
  state[key] = value;
  vscode.setState(state);
}

function clearState() {
  vscode.setState(undefined);
}

function clearScreen() {
  testGallery.innerHTML = '';
  outputScript.innerHTML = '';
  appName.value = '';
  goalText.value = '';
  assertContainer.innerHTML = '';
  maxTestSteps.value = defaultMaxSteps;
  clearState();
}
