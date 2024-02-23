const numDeviceCols = 3;


export function generateAllRDCCheckboxes(container) {
    // GOOGLE
    addRDCDeviceCheckboxes(container, "Google", [
        "Google Pixel 7 Pro", "Google Pixel 7", "Google Pixel 6a", "Google Pixel 6 Pro", "Google Pixel 6", "Google Pixel 5",
        "Google Pixel 4a", "Google Pixel 4 XL", "Google Pixel 4", "Google Pixel 3a XL", "Google Pixel 3a", "Google Pixel 3 XL",
        "Google Pixel 3", "Google Pixel 2 XL", "Google Pixel 2", 
        "Android GoogleAPI Emulator", "Google Pixel 4 Emulator", "Google Pixel 4 XL Emulator", "Google Pixel 4a Emulator"])

    //SAMSUNG 
    addRDCDeviceCheckboxes(container, "Samsung", [
        "Samsung Galaxy Z Fold5", "Samsung Galaxy Z Flip5", "Samsung Galaxy Z Flip4 Android 13", "Samsung Galaxy Xcover6 Pro Android 13",
        "Samsung Galaxy S23 Ultra", "Samsung Galaxy S23 Plus", "Samsung Galaxy S23", "Samsung Galaxy S22 Ultra 5G", "Samsung Galaxy S22 Plus 5G", "Samsung Galaxy S22",
        "Samsung Galaxy S21 Ultra 5G Android 13", "Samsung Galaxy S21 Plus 5G Android 13", "Samsung Galaxy S21 5G", "Samsung Galaxy Z Fold4",
        "Samsung Galaxy Z Flip4", "Samsung Galaxy Xcover6 Pro", "Samsung Galaxy S22 5G", "Samsung Galaxy S21 Ultra 5G Android 12",
        "Samsung Galaxy S21 Plus 5G Android 12", "Samsung Galaxy S21 Plus 5G", "Samsung Galaxy S20 Plus Android 12", "Samsung Galaxy Note 20 Ultra 5G",
        "Samsung Galaxy Z Fold 2 5G", "Samsung Galaxy Z Flip", "Samsung Galaxy S21 Ultra 5G", "Samsung Galaxy S20 Ultra"])
}

/**
 * Retrieves devices checked off by user to send when generating test
 * @returns Array of devices selected by user
 */
export function getSelectedDevices() {
    const genCheckboxClass = "gen-checkbox-input";
    const genDeviceCheckbox = document.getElementsByClassName(genCheckboxClass);

    var selectedDevices = [];
    for (const deviceCheckbox of genDeviceCheckbox) {
        if (deviceCheckbox.checked) {
            selectedDevices.push(deviceCheckbox.value);
        } 
    }

    const allDeviceCheckboxes = document.getElementsByClassName("device-checkbox");
    for (const deviceCheckbox of allDeviceCheckboxes) {
        if (deviceCheckbox.checked) {
            selectedDevices.push(deviceCheckbox.value);
        }
    }
    return selectedDevices;
}


export function addRDCDeviceCheckboxes(container, key, specific_devices) {
    var collapsibleButton = document.createElement("button");
    collapsibleButton.type = "button";
    collapsibleButton.classList.add("button", "button-text", "collapsible");

    const overallCheckboxID = key.replace(/ /g,"_") + "_all";
    const specificCheckboxClass = key.replace(/ /g,"_") + "-checkbox";

    var overallInput = document.createElement("input");
    overallInput.type = "checkbox";
    overallInput.id = overallCheckboxID;
    overallInput.name = overallCheckboxID;
    overallInput.value = key + ".*";
    overallInput.classList.add(specificCheckboxClass, "gen-checkbox-input")

    var overallLabel = document.createElement("label");
    overallLabel.for = overallCheckboxID;
    overallLabel.innerHTML = key + " (Any)&nbsp;";

    var downArrow = document.createElement("span");
    downArrow.className = "collapsible-icon";

    collapsibleButton.appendChild(overallInput);
    collapsibleButton.appendChild(overallLabel);
    collapsibleButton.appendChild(downArrow);

    container.appendChild(collapsibleButton);

    var dropDownDiv = document.createElement("div");
    dropDownDiv.classList.add("device-checkboxes");

    var checkboxContainer = document.createElement("div");
    checkboxContainer.id = key.replace(/ /g,"_") + "-checkbox-container";
    checkboxContainer.classList.add("checkbox-container");

    generateSpecificDeviceCheckboxes2(checkboxContainer, overallInput, specificCheckboxClass, specific_devices);

    dropDownDiv.appendChild(checkboxContainer);
    container.appendChild(dropDownDiv);
    container.append(document.createElement("br"));
}


/**
 * Generates the checboxes for a device category
 * @param {Element} checkboxContainer element which drop downs to show device checkboxes
 * @param {Element} genCheckbox element which has the general checkbox for the device category
 * @param {string} genDeviceCheckboxClass id of the general device category
 * @param {Array} deviceNames list of specific device names
 */
function generateSpecificDeviceCheckboxes2(checkboxContainer, genCheckbox, genDeviceCheckboxClass, deviceNames) {
    var specificCheckboxInputs = [];
    var specificCheckboxLabels = [];
    for (const name of deviceNames) {
        var input = document.createElement("input");
        input.type = "checkbox";
        input.classList.add("device-checkbox");
        input.classList.add(genDeviceCheckboxClass);
        const input_id = name.toLowerCase().replace(/ /g,"_");
        input.id = input_id;
        input.name = input_id;
        input.value = name;
        input.onclick = function () {
            if (!this.checked) {
                genCheckbox.checked = false;
            }
        }
        specificCheckboxInputs.push(input);
        var label = document.createElement("label");
        label.setAttribute("for", input_id);
        label.innerHTML = " " + name;
        specificCheckboxLabels.push(label);
    }

    genCheckbox.onclick = function () {
        for (const specific of specificCheckboxInputs) {
            specific.checked = this.checked;
        }
    }

    for (let div_n=0; div_n < numDeviceCols; div_n++) {
        var div = document.createElement("div");
        const numPerCol = specificCheckboxInputs.length / numDeviceCols;
        for (let x=Math.floor(numPerCol * div_n); x<Math.floor(numPerCol * (div_n+1)); x++) {
            div.appendChild(specificCheckboxInputs[x]);
            div.appendChild(specificCheckboxLabels[x]);
            div.appendChild(document.createElement('br'));
        }
        checkboxContainer.appendChild(div);
    }
}