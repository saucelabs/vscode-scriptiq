import { AbstractBaseGenerator } from './base';

export class AppiumPython extends AbstractBaseGenerator {
  name = 'appium_python';

  findElementCode(
    id_type: string,
    id_value: string,
    id_index = 0,
    highlight = false,
  ) {
    let by_choice = 'XPATH';
    if (id_type == 'resource-id') {
      by_choice = 'ID';
    } else if (id_type == 'content-desc') {
      by_choice = 'ACCESSIBILITY_ID';
    } else if (id_type == 'class') {
      by_choice = 'CLASS_NAME';
    }

    let value = `${id_value}`;
    if (by_choice == 'XPATH') {
      value = `//*[@${id_type}='${id_value}']`;
    }

    if (highlight) {
      if (id_index == 0) {
        return `driver.find_element(<span ${this.code_parameter_class}>by</span>=<span ${this.code_class_class}>AppiumBy</span>.${by_choice}, <span ${this.code_parameter_class}>value</span>=<span ${this.code_string_class}>"${value}"</span>)`;
      } else {
        return `driver.find_elements(<span ${this.code_parameter_class}>by</span>=<span ${this.code_class_class}>AppiumBy</span>.${by_choice}, <span ${this.code_parameter_class}>value</span>=<span ${this.code_string_class}>"${value}"</span>)[<span ${this.code_number_class}>${id_index}</span>]`;
      }
    } else {
      if (id_index == 0) {
        return `driver.find_element(by=AppiumBy.${by_choice}, value="${value}")`;
      } else {
        return `driver.find_elements(by=AppiumBy.${by_choice}, value="${value}")[${id_index}]`;
      }
    }
  }

  genCodeLine(
    bestIdentifier: any,
    action: string,
    opts: {
      highlight?: boolean;
      number?: string;
    } = { number: '', highlight: false },
  ) {
    const findElement = this.findElementCode(
      bestIdentifier.type,
      bestIdentifier.value,
      bestIdentifier.index,
      opts?.highlight,
    );

    let codeStepText = ``;
    if (action == 'set_text') {
      codeStepText += `element = ${findElement}${this.preNewLine}`;
    } else if (action == 'click') {
      codeStepText += `${findElement}.click()${this.preNewLine}`;
    } else if (action == 'scroll') {
      codeStepText += `location = ${findElement}.rect${this.preNewLine}`;
    }
    return codeStepText;
  }

  /**
   * Line of code to indicate skipping the step
   * @returns the original element, now with the skip step option added
   */
  noOptionComment() {
    return (
      `<span ${this.code_comment_class}> # SKIP STEP</span>` + this.preNewLine
    );
  }

  swipeCodeComment(direction: string, is_for_script = false) {
    let frontLine = '';
    if (is_for_script) {
      frontLine = this.preTab;
    }

    let text = '';
    if (!is_for_script) {
      text += `${this.preNewLine}# SWIPE CODE:${this.preNewLine}`;
    }
    if (direction === 'down') {
      text += `${frontLine}width_midpoint = location["x"] + location["width"]/2${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=width_midpoint, start_y=location["y"] + location["height"] - 5, end_x=width_midpoint, end_y=location["y"] + 5, duration=800)${this.preNewLine}`;
    } else if (direction === 'up') {
      text += `${frontLine}width_midpoint = location["x"] + location["width"]/2${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=width_midpoint, start_y=location["y"] + 5, end_x=width_midpoint, end_y=location["y"] + location["height"] - 5, duration=800)${this.preNewLine}`;
    } else if (direction === 'left') {
      text += `${frontLine}height_midpoint = location["y"] + location["height"]/2${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=location["x"] + location["width"] - 5, start_y=height_midpoint, end_x=location["x"] + 5, end_y=height_midpoint, duration=800)${this.preNewLine}`;
    } else if (direction === 'right') {
      text += `${frontLine}height_midpoint = location["y"] + location["height"]/2${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=location["x"] + 5, start_y=height_midpoint, end_x=location["x"] + location["width"] - 5, end_y=height_midpoint, duration=800)${this.preNewLine}`;
    }
    return text;
  }

  sendTextCodeComment(set_text: string, is_for_script = false) {
    let frontLine = '';
    if (is_for_script) {
      frontLine = this.preTab;
    }

    let text = ``;
    if (!is_for_script) {
      text += `${this.preNewLine}# RETURN TEXT CODE:${this.preNewLine}`;
    }
    text += `${frontLine}element.click()${this.preNewLine}`;
    text += `${frontLine}element.send_keys("${set_text}")${this.preNewLine}`;
    text += `${frontLine}driver.execute_script('mobile: performEditorAction', {'action': 'Go'})${this.preNewLine}`;
    text += `${frontLine}driver.execute_script('mobile: performEditorAction', {'action': 'Search'})${this.preNewLine}`;
    return text;
  }

  scriptHeaderCode(
    goal: string,
    appName: string,
    device_name: string,
    platform_version: string,
    region: string,
    platform: string,
  ) {
    const automationName = platform == 'Android' ? 'UiAutomator2' : 'xcuitest';
    return `import os

from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy

# Installations:
# pip install Appium-Python-Client==3.1.0
# pip install selenium==4.15.2

${this.splitComments(goal, false, `Goal: `)}

app = "${appName}"

dc = {'platformName': '${platform}'}
dc['appium:app'] = "storage:filename=" + app
dc['appium:autoGrantPermissions'] = True
dc['appium:automationName'] = "${automationName}"

dc['appium:deviceName'] = "${device_name}"
dc['appium:platformVersion'] = "${platform_version}"

dc['sauce:options'] = {"name": "ScriptIQ test: ${goal}"}

# Set Sauce Credentials in Path
dc['sauce:options']["username"] = os.environ["SAUCE_USERNAME"]
dc['sauce:options']["accessKey"] = os.environ["SAUCE_ACCESS_KEY"]

options = UiAutomator2Options().load_capabilities(dc)
url = 'https://ondemand.${region}.saucelabs.com/wd/hub' 

driver = webdriver.Remote(url, options=options)
driver.implicitly_wait(60)

## Test Code
try:${this.preNewLine}`;
  }

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  endScriptCode() {
    return `except Exception as e:
${this.preTab}print(e)
        
driver.quit()`;
  }

  splitComments(comment: string, has_start_tab = false, starting_value = ``) {
    let startTab = '';
    if (has_start_tab) {
      startTab = this.preTab;
    }

    const cutoff_line_len = 125;
    const comment_words = comment.split(' ');
    const lines = [];
    let curr_word = `${startTab}# ${starting_value}`;
    for (const word of comment_words) {
      curr_word += word + ' ';
      if (curr_word.length > cutoff_line_len) {
        lines.push(curr_word);
        curr_word = `${startTab}# `;
      }
    }
    if (curr_word.length !== `${startTab}# `.length) {
      lines.push(curr_word);
    }
    return `${lines.join('\n')}${this.preNewLine}`;
  }

  generateFullScript(
    goal: string,
    appName: string,
    device_name: string,
    platform_version: string,
    region: string,
    platform: string,
    steps: any[],
  ) {
    const headerText = this.scriptHeaderCode(
      goal,
      appName,
      device_name,
      platform_version,
      region,
      platform,
    );

    let codeStepText = '';
    for (let x = 0; x < steps.length; x++) {
      if (
        steps[x].potential_identifiers.length > 0 &&
        steps[x].selectedIdentifier !== 'skip'
      ) {
        codeStepText += this.splitComments(
          steps[x].event_reason,
          true,
          `ScriptIQ Reason: `,
        );

        codeStepText +=
          `${this.preTab}` +
          this.genCodeLine(
            steps[x].potential_identifiers[steps[x].selectedIdentifier],
            steps[x].action,
            // x,
          );

        if ('direction' in steps[x] && steps[x].direction !== '') {
          codeStepText += this.swipeCodeComment(
            steps[x].direction,
            true,
            // x,
          );
        }
        if ('text' in steps[x] && steps[x].text !== '') {
          codeStepText += this.sendTextCodeComment(
            steps[x].text,
            true,
            // x,
          );
        }
        codeStepText += `${this.preNewLine}`;
      }
    }
    const closeStepText = this.endScriptCode();

    return `${headerText}${codeStepText}${closeStepText}`;
  }
}
