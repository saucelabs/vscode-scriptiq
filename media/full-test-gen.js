import { AppiumPython } from './appium-python.js';
import { AppiumJava } from './appium-java.js';
import { generateAllRDCCheckboxes, getSelectedDevices } from './rdc-device-checkboxes.js';

const vscode = acquireVsCodeApi();

/**
 * Add load event.
 */
window.addEventListener("load", main);
console.log("RELOADING PAGE")
console.log(vscode.getState());

// Declare Html elements.
const testGallery = document.getElementById("gallery-container");
const outputScript = document.getElementById("output-script-container")
const apkText = document.getElementById("apk-text-id");
const goalText = document.getElementById("goal-text-id");
const generateButton = document.getElementById("generate-button-id");
const clearButton = document.getElementById("clear-button-id");
const testHeader = document.getElementById("test-header");
const assertContainer = document.getElementById("assert-container");
const outputLanguageDiv = document.getElementById("output-language-div");

const maxTestSteps = document.getElementById("max_test_steps");
const platformVersion = document.getElementById("platform_number");

// Declare Styles
const sauceOrange = "#EE805A";

// Code Generator Default
var codeTemplateGenerator = new AppiumPython();

// Declare Default Values
const defaultMaxSteps = maxTestSteps.value;

function main() {

    // Add the eventLsteners.
    generateButton?.addEventListener("click", handleAskClick);
    clearButton?.addEventListener("click", handleClearClick);

    // goal enter event
    goalText?.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            // Trigger the button element with a click
            handleAskClick();
        }
    });

    // save values
    apkText?.addEventListener("keyup", function (event) {
        updateState("apk", apkText.value);
    });
    goalText?.addEventListener("keyup", function (event) {
        updateState("goal", goalText.value);
    });
    assertContainer?.addEventListener("keyup", function (event) {
        var screenAsserts = [];
        for (var child of assertContainer.children) {
            if (child.type == "text") screenAsserts.push(child.value);
        }
        updateState("assert_screen_desc_container", screenAsserts);
    });

    // Add RDC device options checkboxes. Go to method to add more device options
    generateAssertInputs();
    generateAllRDCCheckboxes(document.getElementById("rdc-checkbox-container"));
    generateLanguageSelectionOptions();

    var coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    }

    // Repopulate with previous state
    if (vscode.getState() !== undefined) {
        console.log("READING IN STATE")
        generateFullTestDisplay();
    }

    try {
        // Handle messages sent from the extension to the webview
        console.log("LISTENER CREATED");
        window.addEventListener('message', event => {
            const message = event.data; // The json data that the extension sent
            switch (message.command) {
                case 'test':
                    // Append answer.
                    if ("status_message" in message.data) {
                        testGallery.innerHTML = '';
                        outputScript.innerHTML = '';
                        testGallery.appendChild(document.createElement('br'));
                        var container = document.createElement("span");
                        container.classList.add("test-status-header");
                        container.innerHTML = message.data.status_message;
                        testGallery.appendChild(container);

                    } else if ("finished" in message.data) {
                        vscode.postMessage({
                            command: "can-open-window",
                        })
                    } else {
                        testGallery.innerHTML = '';
                        outputScript.innerHTML = '';
                        vscode.postMessage({
                            command: "save-steps",
                            data: message.data,
                        });
                        updateStepDataState(message.data);
                        generateFullTestDisplay();

                    }
                    break;
                case 'history':
                    // Append answer.
                    testHeader.style.display = "block";
                    console.log("Reading in history");
                    console.log(message.data)

                    updateStepDataState(message.data);
                    generateFullTestDisplay();
                    break;
                case 'clear':
                    clearScreen();
                case 'error':
                    break;
            }
        });
    } catch (err) {
        console.log('errrr js');
        console.log(err);
    }
}

function handleAskClick() {

    // Clear answer filed.
    testGallery.innerHTML = '';
    outputScript.innerHTML = '';
    testHeader.style.display = "none";

    var selectedDevices = getSelectedDevices();

    var assertInputsContainers = document.getElementsByClassName("screen-desc-assert-input");
    var assertInputDescs = [];
    for (var cont of assertInputsContainers) {
        assertInputDescs.push(cont.value)
    }

    // Send messages to Panel.
    vscode.postMessage({
        command: "press-generate-button",
        data: {"goal": goalText.value, "apk": apkText.value, "assertions": assertInputDescs, "max_test_steps": maxTestSteps.value, 
            "devices": selectedDevices, "platform_version": platformVersion.value},
    });
}

/**
 * Handle clear button click event.
 */
function handleClearClick() {
    clearScreen();
}

/**
 * Generate the full test output, including llm-generated steps and create script button.
 */
function generateFullTestDisplay() {
    var data = vscode.getState();
    apkText.value = data.apk;
    goalText.value = data.goal;

    assertContainer.innerHTML = '';
    if ("assert_screen_desc_container" in data) {
        for (let desc of data.assert_screen_desc_container) {
            addHistoryAddAssert(desc);
        }
    }

    if (!("all_steps" in data)) {
        return;
    }
    testGallery.innerHTML = '';
    outputScript.innerHTML = '';
    console.log("Generate Steps");

    const all_step_data = data.all_steps;
    testHeader.style.display = "block";

    var start_actions = [];
    for (var ident of all_step_data) {
        var action = {
            "potential_identifiers": ident.potential_identifiers,
            "action": ident.action,
            "text": ident.text,
            "direction": ident.direction,
            "location": ident.location,
            "event_llm_output": ident.event_llm_output,
            "prev_event": ident.previous_events,

        }
        start_actions.push(action);
    }

    const editData = {
        "apk": data.apk,
        "device_name": data.selected_device_name, 
        "platform_version": data.selected_platform_version,
        "start_actions": start_actions,
        "prev_goal": data.goal
    }

    var timeoutTime = 0;
    // if (!languageChange) {
    vscode.postMessage({
        command: "copy-image",
        testID: data.testID,
    });
    timeoutTime = 400
    // }
    for (let i = 0; i < all_step_data.length; i++) {
        setTimeout(function() {
            var user_screen_descs = [];
            if ("user_screen_descs" in data) {
                user_screen_descs = data.user_screen_descs;
            }
            generateStep(i, data.img_ratio, all_step_data[i], editData, data.testID, user_screen_descs);
        }, timeoutTime);
    }
    generateTestOutputInteractables(all_step_data, data.goal, data.apk, data.selected_device_name, data.selected_platform_version, data.data_center);
}

/**
 * Generate a single step of the llm-generated steps. This includes the screenshot, the code options for the step and
 * ScriptIQ's reasoning
 */
function generateStep(i, imgRatio, stepData, edit_data, testID, user_screen_descs=[]) {

        const stepHeaderTag = document.createTextNode('Step ' + (i+1));
        
        const imgHeight = 350;
        const imgWidth = imgHeight * imgRatio;
        const heightRatio = imgHeight/imgWidth;
        const imgDivMinWidth = imgWidth + 20;

        const canvasNode = document.createElement('canvas');
        canvasNode.style.border = "1px black";

        const drawScreenshot = function (node, width) {
            var height = width * heightRatio;
            node.width = width;
            node.height = height;

            const ctx = node.getContext('2d');
            var img = new Image(); 
            img.src = `${mediaPath}/screenshots/${testID}/${stepData.img_out_name}`;
            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                ctx.strokeRect(0, 0, width, height);
                if ("location" in stepData) {
                    ctx.lineWidth = 3;
                    ctx.rect(stepData.location.x * width, stepData.location.y * height, stepData.location.width * width, stepData.location.height * height);
                    ctx.strokeStyle = sauceOrange;
                    ctx.shadowColor= sauceOrange;
                    ctx.stroke();
                }
                for (let x=0; x<10000; x++) {
                    x = x;
                }
            };   
        };

        drawScreenshot(canvasNode, imgWidth);
        
        const imageGallery = document.createElement('div');
        imageGallery.className = "test-step-left";
        imageGallery.style.width = String(imgDivMinWidth) + "px";

        imageGallery.appendChild(stepHeaderTag);
        imageGallery.appendChild(document.createElement('br'));
        imageGallery.appendChild(canvasNode);

        const stepGallery = document.createElement('div');
        stepGallery.className = "test-step-right";

        stepGallery.appendChild(document.createElement('br'));
        stepGallery.appendChild(generateCodeChoicesContainer(i, stepData, edit_data));
        
        var reasonContainer = generateReasonContainer(stepData);
        if (reasonContainer !== undefined) stepGallery.appendChild(reasonContainer);

        var screenDescIdeasContainer = generateScreenDescIdeasContainer(stepData);
        if (screenDescIdeasContainer !== undefined) stepGallery.appendChild(screenDescIdeasContainer);

        var screenMatchContainer = generateScreenMatchContainer(stepData, user_screen_descs);
        if (screenMatchContainer !== undefined) stepGallery.appendChild(screenMatchContainer);

        stepGallery.childNodes[stepGallery.childNodes.length - 1].classList.add("end-step-block");

        // const [editTestButton, editTestDiv] = addEditTestInteractions(i, edit_data);
        // if (stepData.potential_identifiers.length > 0) {
        //     stepGallery.appendChild(document.createElement('br'));
        //     stepGallery.appendChild(editTestButton);
        //     stepGallery.appendChild(document.createElement('br'));
        //     stepGallery.appendChild(editTestDiv);
        // }

        const resizer = createResizerBar(imageGallery, imgDivMinWidth, drawScreenshot, canvasNode);

        const galleryFloatContainerTag = document.createElement('div');
        galleryFloatContainerTag.className = "test-container";

        galleryFloatContainerTag.appendChild(imageGallery);
        galleryFloatContainerTag.appendChild(resizer);
        galleryFloatContainerTag.appendChild(stepGallery);
        testGallery.appendChild(galleryFloatContainerTag);
}

/**
 * 
 * @param {number} i is the step number 
 * @param {dict} stepData is all the data about the current step of this test
 * @param {array} editData is all the data needed for the previous step.
 * @returns the block for step i which displays the code options and the user input buttons
 */
function generateCodeChoicesContainer(i, stepData, editData) {
    var codeContainer = document.createElement("div");
    codeContainer.classList.add("code-block");
    
    if (stepData.potential_identifiers.length > 0) {
        addUserInputButtons(codeContainer, i, editData);
    }

    var codeChoiceContainer = document.createElement("div");
    codeChoiceContainer.id = `code-choice-container-${i}`;

    if (stepData.potential_identifiers.length > 0) {
        var radioScriptIQChoice = document.createElement("input");
        radioScriptIQChoice.type = "radio"
        radioScriptIQChoice.name = `script_choice_${i}`;
        var radio_id = `script_choice_step_${i}_value_0`;
        radioScriptIQChoice.id = radio_id;
        radioScriptIQChoice.value = 0;
        radioScriptIQChoice.checked = true;
        var labelScriptIQChoice = document.createElement("label");
        labelScriptIQChoice.for = radio_id;
        labelScriptIQChoice.innerHTML = " " + codeTemplateGenerator.genCodeLine(stepData.potential_identifiers[0], stepData.action);

        codeChoiceContainer.appendChild(radioScriptIQChoice);
        codeChoiceContainer.appendChild(labelScriptIQChoice);

        codeContainer.append(codeChoiceContainer);

        // Adding other identifier options including skipping the step
        var extraCodeContainer = document.createElement("div");
        extraCodeContainer.id = `extra-code-container-${i}`;
        extraCodeContainer.appendChild(document.createElement("br"));

        // Add Skip Step Comment Option
        // extraCodeContainer = addNoOption(extraCodeContainer, i);
        addNoOption(extraCodeContainer, i);
        for (let x=1; x < stepData.potential_identifiers.length; x++) {

            var radioOtherChoice = document.createElement("input");
            radioOtherChoice.type = "radio"
            radioOtherChoice.name = `script_choice_${i}`;
            var radio_id = `script_choice_step_${i}_value_${x}`;
            radioOtherChoice.id = radio_id;
            radioOtherChoice.value = x;
            var labelOtherChoice = document.createElement("label");
            labelOtherChoice.for = radio_id;
            labelOtherChoice.innerHTML = " " + codeTemplateGenerator.genCodeLine(stepData.potential_identifiers[x], stepData.action);

            extraCodeContainer.appendChild(radioOtherChoice);
            extraCodeContainer.appendChild(labelOtherChoice);
            extraCodeContainer.appendChild(document.createElement("br"));

        }
        extraCodeContainer.style.display = "none";
        codeContainer.appendChild(extraCodeContainer);

        var moreOptionsButton = document.createElement("button");
        moreOptionsButton.classList.add("button", "button-text", "collapsible");

        const moreOptionsText = `View step alternatives <span class="collapsible-icon"></span>`;
        const lessOptionsText = `Hide step alternatives <span class="collapsible-icon reverse"></span>`;
        moreOptionsButton.innerHTML = moreOptionsText;

        moreOptionsButton.onclick = function () {
            if (extraCodeContainer.style.display == "none") {
                extraCodeContainer.style.display = "inline";
                moreOptionsButton.innerHTML = lessOptionsText;
                moreOptionsButton.classList.add("active");
            } else {
                extraCodeContainer.style.display = "none";
                moreOptionsButton.innerHTML = moreOptionsText;
                moreOptionsButton.classList.remove("active");
                reorderCodeOptions(i);
            }  
        }
        codeContainer.appendChild(moreOptionsButton);
    }

    if ("direction" in stepData && stepData.direction !== "") {
        var swipeCode = document.createElement("pre");
        swipeCode.innerHTML = codeTemplateGenerator.swipeCodeComment(stepData.direction);
        codeContainer.appendChild(swipeCode);
    }
    if ("text" in stepData && stepData.text !== "") {
        var setTextCode = document.createElement("pre");
        setTextCode.innerHTML = codeTemplateGenerator.sendTextCodeComment(stepData.text);
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
    var radioOtherChoice = document.createElement("input");
    radioOtherChoice.type = "radio"
    radioOtherChoice.name = `script_choice_${stepNum}`;
    var radio_id = `script_choice_step_${stepNum}_value_-1`;
    radioOtherChoice.id = radio_id;
    radioOtherChoice.value = -1;

    var labelOtherChoice = document.createElement("label");
    labelOtherChoice.for = radio_id;
    labelOtherChoice.innerHTML = codeTemplateGenerator.noOptionComment();

    container.appendChild(radioOtherChoice);
    container.appendChild(labelOtherChoice);
    container.appendChild(document.createElement("br"));

    // return container;
}

function reorderCodeOptions(i) {
    var codeChoiceContainer = document.getElementById(`code-choice-container-${i}`);

    if (!codeChoiceContainer.children[0].checked) {
        var extraCodeContainer = document.getElementById(`extra-code-container-${i}`);
        for (var x=0; x<extraCodeContainer.children.length; x++) {
            if (extraCodeContainer.children[x].checked) {
                break;
            }
        }
        const chosenInput = extraCodeContainer.children[x];
        const chosenLabel = extraCodeContainer.children[(x+1)];
        const chosenBreak = extraCodeContainer.children[(x+2)];

        var unSelectedInput = codeChoiceContainer.children[0];
        var unSelectedLabel = codeChoiceContainer.children[1];

        extraCodeContainer.appendChild(unSelectedInput);
        extraCodeContainer.appendChild(unSelectedLabel);
        extraCodeContainer.appendChild(chosenBreak);

        codeChoiceContainer.appendChild(chosenInput);
        codeChoiceContainer.appendChild(chosenLabel);
        
    }
}

/**
 * add the thumbs up/down for user feedback
 * @param {Element} container the element with the code container where the user feedback buttons are added. 
 * @param {number} i the step number
 * @param {dict} test_record the record of the full test generated
 */
function addUserInputButtons(container, i, test_record) {
    var thumbsDownButton = document.createElement("img");
    thumbsDownButton.classList.add("thumb");
    thumbsDownButton.src = `${mediaPath}/icons/icn-thumbs-down.svg`
    
    var thumbsUpButton = document.createElement("img");
    thumbsUpButton.classList.add("thumb");
    thumbsUpButton.src = `${mediaPath}/icons/icn-thumbs-up.svg`

    thumbsUpButton.onclick = function () {
        if (!this.checked) {
            sendUserRating("like", i, test_record);
        } else {
            sendUserRating("norating", i, test_record);
        }
        this.checked = !this.checked;
        if (this.checked && thumbsDownButton.checked) {
            thumbsDownButton.checked = false;
        }
    }
    thumbsDownButton.onclick = function () {
        if (!this.checked) {
            sendUserRating("dislike", i, test_record);
        } else {
            sendUserRating("norating", i, test_record);
        }
        this.checked = !this.checked;
        if (this.checked && thumbsUpButton.checked) {
            thumbsUpButton.checked = false;
        }
    }
    container.append(thumbsDownButton);
    container.append(thumbsUpButton);
} 

/**
 * Add the skip step option to the list of potential identifiers for script generation
 * @param {Element} container the element where the option to not add the step will be added
 * @param {number} stepNum the step number
 * @returns the original element, now with the skip step option added
 */
function addEditTestInteractions(i, edit_data) {
    const editTestButton = document.createElement("button");
    editTestButton.classList.add("button", "button-text", "pl-0");
    editTestButton.checked = false;
    const editTestButtonOpenText = "Edit Step From Here";
    const editTestButtonCloseText = "Close Step Editor";
    editTestButton.innerHTML = editTestButtonOpenText;
    editTestButton.title = "Keeps steps before this one, uses new goal to generate new steps."

    const editTestDiv = document.createElement("div");
    editTestDiv.id = "edit-test-block";
    editTestDiv.style.display = "none";

    const newGoalLabel = document.createElement("label");
    newGoalLabel.id = "new-goal-label";
    newGoalLabel.innerHTML = "New Goal";
    const newGoalInput = document.createElement("input")
    newGoalInput.id = "new-goal-id";
    newGoalInput.placeholder = "Goal used for edited test steps, previous goal will not be considered."

    const newMaxStepsLabel = document.createElement("label");
    newMaxStepsLabel.id = "new-max-steps-label";
    newMaxStepsLabel.innerHTML = "New Max Step Count";
    const newMaxStepsInput = document.createElement("input")
    newMaxStepsInput.id = "new-max-steps-id";
    newMaxStepsInput.classList.add("short");
    newMaxStepsInput.value = 5;
    newMaxStepsInput.type = "number";

    const newGoalSendButton = document.createElement("button");
    newGoalSendButton.classList.add("button", "button-text", "pl-0", "edit-test-button");
    newGoalSendButton.innerHTML = "Generate Edited Test";

    editTestButton.onclick = function () {
        if (!this.checked) {
            editTestDiv.style.display = "block";
            editTestButton.innerHTML = editTestButtonCloseText;
        } else {
            editTestDiv.style.display = "none";
            editTestButton.innerHTML = editTestButtonOpenText;
        }
        this.checked = !this.checked;
    }

    newGoalSendButton.onclick = function () {
        testGallery.innerHTML = '';
        outputScript.innerHTML = '';

        // Send messages to Panel.
        vscode.postMessage({
            command: "edit-test-button",
            data: {"goal": newGoalInput.value, "apk": edit_data.apk, "max_test_steps": newMaxStepsInput.value, "start_actions": edit_data.start_actions.slice(0, i),
                "devices": [edit_data.device_name], "platform_version": edit_data.platform_version, "prev_goal": edit_data.prev_goal},
        });
    }

    editTestDiv.appendChild(newGoalLabel);
    editTestDiv.appendChild(newGoalInput);
    editTestDiv.appendChild(document.createElement('br'));
    editTestDiv.appendChild(newMaxStepsLabel);
    editTestDiv.appendChild(newMaxStepsInput);
    editTestDiv.appendChild(newGoalSendButton);

    return [editTestButton, editTestDiv];
}

/**
 * Add generate script button and the code to generate script when user click's button
 * @param {Array} identifiers data on each step generated by the llm
 * @param {string} goal provided by user
 * @param {string} apk provided by user
 * @param {string} device_name name of the device ScriptIQ generated test on
 * @param {string} platform_version version of the device ScriptIQ generated test on
 */
function generateTestOutputInteractables(identifiers, goal, apk, device_name, platform_version, data_center) {

    const outputButtonsDiv = document.createElement('div');
    outputButtonsDiv.classList.add("flex-container");
    
    const createScriptButton = document.createElement('button');
    createScriptButton.id = "create-script-button-id";
    createScriptButton.classList.add("button", "button-primary", "button-large", "mt-30");
    createScriptButton.innerHTML = "Create Code Script";
    createScriptButton.checked = false;

    var codeContainer = document.createElement("pre");
    codeContainer.id = "output-script-code-block"
    codeContainer.classList.add("code-block");
    codeContainer.style.display = "none";

    createScriptButton.onclick = function () {
        var firstGen = false; 
        if (codeContainer.innerHTML.length == 0) {
            firstGen = true;
        }
        codeContainer.innerHTML = "";
        codeContainer.style.display = "block";

        var scriptContainer = document.createElement("div");

        var copyButton = document.createElement("img");
        copyButton.classList.add("script-save-buttons");
        copyButton.src = `${mediaPath}/icons/icn-copy.svg`

        copyButton.onclick = function () {
            navigator.clipboard.writeText(codeContainer.textContent);
        }

        codeContainer.appendChild(copyButton);
        
        var headerText = codeTemplateGenerator.scriptHeaderCode(goal, apk, device_name, platform_version, data_center);

        var codeStepText = "";
        for (let x=0; x<identifiers.length; x++) {
            var index_element = document.querySelector(`input[name="script_choice_${x}"]:checked`);
            var index = -1;
            if (index_element !== null) {
                index = document.querySelector(`input[name="script_choice_${x}"]:checked`).value;
            }

            if (index > -1) {
                codeStepText += codeTemplateGenerator.splitComments(identifiers[x].event_reason, true, `ScriptIQ Reason: `);

                codeStepText += `${codeTemplateGenerator.preTab}` + codeTemplateGenerator.genCodeLine(identifiers[x].potential_identifiers[index], identifiers[x].action, x);

                if ("direction" in identifiers[x] && identifiers[x].direction !== "") {
                    codeStepText += codeTemplateGenerator.swipeCodeComment(identifiers[x].direction, true, x);
                }
                if ("text" in identifiers[x] && identifiers[x].text !== "") {
                    codeStepText += codeTemplateGenerator.sendTextCodeComment(identifiers[x].text, true, x);
                }
                codeStepText += `${codeTemplateGenerator.preNewLine}`
            }
        }
        var closeStepText = codeTemplateGenerator.endScriptCode();

        scriptContainer.innerHTML = headerText + codeStepText + closeStepText;
        codeContainer.appendChild(scriptContainer)
        if (firstGen) {
            window.scrollBy(0,200);
        }
        // console.log(codeContainer.textContent)
        // navigator.clipboard.writeText(codeContainer.textContent);
    } 
    outputButtonsDiv.appendChild(createScriptButton);
    outputScript.appendChild(outputButtonsDiv);
    outputScript.appendChild(codeContainer);
}

/**
 * Sends rating to API to log
 * @param {string} rating provided by user (liked, disliked, no-rating)
 * @param {number} step that the user rated
 * @param {dict} test_record information on the generated test
 */
function sendUserRating(rating, step, test_record) {
    console.log("Sending User Rating");
    let copied_test_record = Object.assign({}, test_record);
    copied_test_record.step_data = test_record.step_data[step];
    vscode.postMessage({
        command: "send-user-rating",
        data: {"rating": rating, "step": step, "test_record": copied_test_record},
    });
}


function generateLanguageSelectionOptions() {
    outputLanguageDiv.classList.add("flex-container")
    // Appium Python
    var div = document.createElement("div");

    var languageScriptChoice = document.createElement("input");
    languageScriptChoice.type = "radio"
    languageScriptChoice.name = `language_choice`;
    var radio_id = `language_appium_python`;
    languageScriptChoice.id = radio_id;
    languageScriptChoice.checked = true;
    var labelLanguageScriptChoice = document.createElement("label");
    labelLanguageScriptChoice.for = radio_id;
    labelLanguageScriptChoice.innerHTML = "Appium Python";

    languageScriptChoice.onclick = function () {
        codeTemplateGenerator = new AppiumPython();
        generateFullTestDisplay();
    }

    div.appendChild(languageScriptChoice);
    div.appendChild(labelLanguageScriptChoice);
    outputLanguageDiv.appendChild(div);

    // Appium Java
    div = document.createElement("div");

    languageScriptChoice = document.createElement("input");
    languageScriptChoice.type = "radio"
    languageScriptChoice.name = `language_choice`;
    radio_id = `language_appium_java`;
    languageScriptChoice.id = radio_id;
    labelLanguageScriptChoice = document.createElement("label");
    labelLanguageScriptChoice.for = radio_id;
    labelLanguageScriptChoice.innerHTML = "Appium Java";

    languageScriptChoice.onclick = function () {
        codeTemplateGenerator = new AppiumJava();
        generateFullTestDisplay();
    }

    div.appendChild(languageScriptChoice);
    div.appendChild(labelLanguageScriptChoice);
    outputLanguageDiv.appendChild(div);
}

/**
 * Creates the bar that allows the image to be resized
 */
function createResizerBar(imageGallery, imgDivMinWidth, drawScreenshot, canvasNode) {
    const resizer = document.createElement('div');
    resizer.className = "resizer";
    resizer.id = "dragMe";

    let x = 0;
    let y = 0;
    let leftWidth = 0;

    // Resizer methods
    const mouseDownHandler = function (e) {
        // Get the current mouse position
        x = e.clientX;
        y = e.clientY;
        leftWidth = imageGallery.getBoundingClientRect().width;

        // Attach the listeners to document
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    const mouseMoveHandler = function (e) {
        // How far the mouse has been moved
        const dx = e.clientX - x;

        const newLeftWidth = Math.min(Math.max(imgDivMinWidth, leftWidth + dx), resizer.parentNode.getBoundingClientRect().width * .5);
        imageGallery.style.width = newLeftWidth + "px";
        drawScreenshot(canvasNode, newLeftWidth)

        resizer.style.cursor = 'col-resize';
        document.body.style.cursor = 'col-resize';
    };

    const mouseUpHandler = function () {
        resizer.style.removeProperty('cursor');
        document.body.style.removeProperty('cursor');

        // Remove the handlers of mousemove and mouseup
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    // Attach the handler
    resizer.addEventListener('mousedown', mouseDownHandler);
    return resizer;
}

/**
 * generates the div for the step which displays the reason for generating this step
 * @param {dict} stepData is all the data about the current step of this test
 * @returns the div element 
 */
function generateReasonContainer(stepData) {
    if ("event_reason" in stepData && stepData.event_reason !== "") {
        var reasonContainer = document.createElement("div");
        reasonContainer.classList.add("step-block");
        reasonContainer.appendChild(document.createTextNode("Why ScriptIQ chose this step:"));
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
    if ("screen_descs" in stepData && stepData.screen_descs.length > 0) {
        var descsContainer = document.createElement("div");
        descsContainer.classList.add("step-block");

        descsContainer.appendChild(document.createTextNode("ScriptIQ’s Screen Descriptions:"));
        var descsListContainer = document.createElement("ul");
        for (let i = 0; i < stepData.screen_descs.length; i++) {
            var li = document.createElement('li');
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
    if ("sd_asserts" in stepData && stepData.sd_asserts.length > 0) {
        var descsContainer = document.createElement("div");
        descsContainer.classList.add("step-block");

        descsContainer.appendChild(document.createTextNode("Screen Description Matches:"));
        var descsListContainer = document.createElement("ul");
        for (let i = 0; i < stepData.sd_asserts.length; i++) {
            var li = document.createElement('li');
            li.innerHTML = userScreenDescs[i] + " - " + capitalizeFirstLetter(stepData.sd_asserts[i].toString());
            descsListContainer.append(li);
        }
        descsContainer.appendChild(descsListContainer);
        return descsContainer;
    }
}

function capitalizeFirstLetter(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function assertionInputRow(value='') {
    var assertInput = document.createElement("input");
    assertInput.classList.add("screen-desc-assert-input");
    if (value !== '') {
        assertInput.value = value;
    }
    var lineBreak = document.createElement("br");

    var minusButton = document.createElement("button");
    minusButton.type = "button";
    minusButton.classList.add("button");
    minusButton.classList.add("button-minus-row");
    minusButton.innerHTML = "-";
    minusButton.onclick = function () {
        assertContainer.removeChild(assertInput);
        assertContainer.removeChild(minusButton);
        assertContainer.removeChild(lineBreak);
    }
    assertContainer.appendChild(minusButton);
    assertContainer.appendChild(assertInput);
    assertContainer.appendChild(lineBreak);
}

/**
 * Generate the fields to add assert inputs
 */
function generateAssertInputs() {
    var addButton = document.getElementById("add-screen-assert-button");
    addButton.onclick = function () {
        assertionInputRow();
    }
}

function addHistoryAddAssert(assert) {
    assertionInputRow(assert);
}

function updateStepDataState(stepData) {
    for (const [key, value] of Object.entries(stepData)) {
        console.log(key, value);
        updateState(key, value);
    }
    if ("user_screen_descs" in stepData) {
        updateState("assert_screen_desc_container", stepData.user_screen_descs);
    }
} 


function updateState(key, value) {
    var state = vscode.getState();
    if (state == undefined) {
        state = {}
    } 
    state[key] = value;
    vscode.setState(state)
}


function clearState() {
    vscode.setState(undefined);
}

function clearScreen() {
    testGallery.innerHTML = '';
    outputScript.innerHTML = '';
    apkText.value = '';
    goalText.value = '';
    assertContainer.innerHTML = '';
    maxTestSteps.value = defaultMaxSteps;
    clearState();
}