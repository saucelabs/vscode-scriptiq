import { AbstractBaseGenerator } from './base';

export class AppiumPython extends AbstractBaseGenerator {
  name = 'appium_python';

  findElementCode(id_type: string, id_value: string, id_index = 0) {
    const value = `//*[@${id_type}='${id_value}']`;

    if (id_index == 0) {
      return `driver.find_element(by=AppiumBy.XPATH, value="${value}")`;
    } else {
      return `driver.find_elements(by=AppiumBy.XPATH, value="${value}")[${id_index}]`;
    }
  }

  genCodeLine(
    bestIdentifier: any,
    action: string,
    _opts: {
      number?: string;
    } = { number: '' },
  ) {
    const findElement = this.findElementCode(
      bestIdentifier.type,
      bestIdentifier.value,
      bestIdentifier.index,
    );

    if (action == 'click') {
      return `${findElement}.click()\n`;
    } else {
      return `element = ${findElement}\n`;
    }
  }

  /**
   * Line of code to indicate skipping the step
   * @returns the original element, now with the skip step option added
   */
  noOptionComment() {
    return `# SKIP STEP\n`;
  }

  scrollCode(direction: string, platform: string) {
    const commandName = platform == 'Android' ? 'scrollGesture' : 'scroll';
    return `    driver.execute_script(
        "mobile: ${commandName}",
        {
            "elementId": element,
            "direction": "${direction}",
            "percent": 1,
        },
    )\n`;
  }

  sendTextCode(text: string, platform: string, findElement = '') {
    if (platform == 'Android') {
      return `    element.click()
    element.send_keys("${text}")
    driver.execute_script('mobile: performEditorAction', {'action': 'Go'})
    driver.execute_script('mobile: performEditorAction', {'action': 'Search'})\n`;
    } else {
      return `    element.click()
    ${findElement.replace('\n', '')}    
    element.send_keys("${text}\\n")\n`;
    }
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
# pip install Appium-Python-Client==4.0.0
# pip install selenium==4.20.0

${this.splitComments(goal, false, `Goal: `)}

options = UiAutomator2Options().load_capabilities(
    {
        "platformName": "${platform}",
        "app": "storage:filename=${appName}",
        "appium:deviceName": "${device_name}",
        "appium:platformVersion": "${platform_version}",
        "appium:autoGrantPermissions": True,
        "appium:automationName": "${automationName}",
        "sauce:options": {
            "name": "ScriptIQ test: ${goal}",
            "username": os.environ["SAUCE_USERNAME"],
            "accessKey": os.environ["SAUCE_ACCESS_KEY"],
            "appiumVersion": "latest",
        },
    },
)

driver = webdriver.Remote('https://ondemand.${region}.saucelabs.com/wd/hub', options=options)
driver.implicitly_wait(60)

## Test Code
try:\n`;
  }

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  endScriptCode() {
    return `except Exception as e:
    print(e)
        
driver.quit()\n`;
  }

  splitComments(comment: string, has_start_tab = false, starting_value = ``) {
    let startTab = '';
    if (has_start_tab) {
      startTab = `    `;
    }

    const cutoff_line_len = 80;
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
    return `${lines.join('\n')}\n`;
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

        const findElement = this.genCodeLine(
          steps[x].potential_identifiers[steps[x].selectedIdentifier],
          steps[x].action,
        );
        codeStepText += `    ` + findElement;

        console.log('SCROLL DEBUGGING');
        console.log(steps[x]);
        if (steps[x].action == 'scroll') {
          codeStepText += this.scrollCode(
            steps[x].actionMetadata.direction,
            platform,
          );
        }
        if (steps[x].action == 'set_text') {
          codeStepText += this.sendTextCode(
            steps[x].actionMetadata.text,
            platform,
            findElement,
          );
        }
        codeStepText += `\n`;
      }
    }
    const closeStepText = this.endScriptCode();

    return `${headerText}${codeStepText}${closeStepText}`;
  }
}
