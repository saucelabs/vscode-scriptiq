import { CodeTemplate } from './code-template.js';

export class AppiumPython extends CodeTemplate {
  name = 'appium_python';

  /**
   * Code to find element
   * @param {string} id_type identifier type (resource-id, text, content-desc, class)
   * @param {string} id_value value of the identifier
   * @param {number} id_num identifier number when multiple of same type and value on screen
   * @returns string with html of code
   */
  findElementCode(id_type, id_value, id_num = 0) {
    var by_choice = 'XPATH';
    if (id_type == 'resource-id') {
      by_choice = 'ID';
    } else if (id_type == 'content-desc') {
      by_choice = 'ACCESSIBILITY_ID';
    } else if (id_type == 'class') {
      by_choice = 'CLASS_NAME';
    }

    if (by_choice == 'XPATH') {
      var value = `//*[@${id_type}='${id_value}']`;
    } else {
      var value = `${id_value}`;
    }

    if (id_num == 0) {
      return `driver.find_element(<span ${this.code_parameter_class}>by</span>=<span ${this.code_class_class}>AppiumBy</span>.${by_choice}, <span ${this.code_parameter_class}>value</span>=<span ${this.code_string_class}>"${value}"</span>)`;
    } else {
      return `driver.find_elements(<span ${this.code_parameter_class}>by</span>=<span ${this.code_class_class}>AppiumBy</span>.${by_choice}, <span ${this.code_parameter_class}>value</span>=<span ${this.code_string_class}>"${value}"</span>)[<span ${this.code_number_class}>${id_num}</span>]`;
    }
  }

  /**
   * Generates the first line of code for each type of action.
   * @param {dict} bestIdentifier the id_type, id_value and id_num
   * @param {string} action (click, scroll, set_text)
   * @returns {string} the line of code
   */
  genCodeLine(bestIdentifier, action, number = '') {
    var findElement = this.findElementCode(
      bestIdentifier.id_type,
      bestIdentifier.id_value,
      bestIdentifier.id_num,
    );

    var codeStepText = ``;
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

  /**
   * Lines of code to swipe given a location of a element
   * @param {string} direction
   * @param {boolean} is_for_script is this in the full code output?
   * @returns string with html of code
   */
  swipeCodeComment(direction, is_for_script = false, number = '') {
    var frontLine;
    if (is_for_script) {
      frontLine = this.preTab;
    } else {
      frontLine = ``;
    }
    var text = ``;
    if (!is_for_script) {
      text += `${this.preNewLine}<span ${this.code_comment_class}># SWIPE CODE:</span>${this.preNewLine}`;
    }
    if (direction === 'down') {
      text += `${frontLine}width_midpoint = location[<span ${this.code_string_class}>"x"</span>] + location[<span ${this.code_string_class}>"width"</span>]/<span ${this.code_number_class}>2</span>${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=width_midpoint, start_y=location[<span ${this.code_string_class}>"y"</span>] + location[<span ${this.code_string_class}>"height"</span>] - <span ${this.code_number_class}>5</span>, end_x=width_midpoint, end_y=location[<span ${this.code_string_class}>"y"</span>] + <span ${this.code_number_class}>5</span>, duration=<span ${this.code_number_class}>800</span>)${this.preNewLine}`;
    } else if (direction === 'up') {
      text += `${frontLine}width_midpoint = location[<span ${this.code_string_class}>"x"</span>] + location[<span ${this.code_string_class}>"width"</span>]/<span ${this.code_number_class}>2</span>${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=width_midpoint, start_y=location[<span ${this.code_string_class}>"y"</span>] + <span ${this.code_number_class}>5</span>, end_x=width_midpoint, end_y=location[<span ${this.code_string_class}>"y"</span>] + location[<span ${this.code_string_class}>"height"</span>] - <span ${this.code_number_class}>5</span>, duration=<span ${this.code_number_class}>800</span>)${this.preNewLine}`;
    } else if (direction === 'left') {
      text += `${frontLine}height_midpoint = location[<span ${this.code_string_class}>"y"</span>] + location[<span ${this.code_string_class}>"height"</span>]/<span ${this.code_number_class}>2</span>${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=location[<span ${this.code_string_class}>"x"</span>] + location[<span ${this.code_string_class}>"width"</span>] - <span ${this.code_number_class}>5</span>, start_y=height_midpoint, end_x=location[<span ${this.code_string_class}>"x"</span>] + <span ${this.code_number_class}>5</span>, end_y=height_midpoint, duration=<span ${this.code_number_class}>800</span>)${this.preNewLine}`;
    } else if (direction === 'right') {
      text += `${frontLine}height_midpoint = location[<span ${this.code_string_class}>"y"</span>] + location[<span ${this.code_string_class}>"height"</span>]/<span ${this.code_number_class}>2</span>${this.preNewLine}`;
      text += `${frontLine}driver.swipe(start_x=location[<span ${this.code_string_class}>"x"</span>] + <span ${this.code_number_class}>5</span>, start_y=height_midpoint, end_x=location[<span ${this.code_string_class}>"x"</span>] + location[<span ${this.code_string_class}>"width"</span>] - <span ${this.code_number_class}>5</span>, end_y=height_midpoint, duration=<span ${this.code_number_class}>800</span>)${this.preNewLine}`;
    }
    return text;
  }

  /**
   * Lines of code to send text given an element
   * @param {string} set_text that is being sent
   * @param {boolean} is_for_script is this in the full code output?
   * @returns string with html of code
   */
  sendTextCodeComment(set_text, is_for_script = false, number = '') {
    var frontLine;
    if (is_for_script) {
      frontLine = this.preTab;
    } else {
      frontLine = ``;
    }

    var text = ``;
    if (!is_for_script) {
      text += `${this.preNewLine}<span ${this.code_comment_class}># RETURN TEXT CODE:</span>${this.preNewLine}`;
    }
    text += `${frontLine}element.click()${this.preNewLine}`;
    text += `${frontLine}element.send_keys(<span ${this.code_string_class}>"${set_text}"</span>)${this.preNewLine}`;
    text += `${frontLine}driver.execute_script(<span ${this.code_string_class}>'mobile: performEditorAction'</span>, {<span ${this.code_string_class}>'action'</span>: <span ${this.code_string_class}>'Go'</span>})${this.preNewLine}`;
    text += `${frontLine}driver.execute_script(<span ${this.code_string_class}>'mobile: performEditorAction'</span>, {<span ${this.code_string_class}>'action'</span>: <span ${this.code_string_class}>'Search'</span>})${this.preNewLine}`;
    return text;
  }

  /**
   * Header for output script.
   * @param {string} goal
   * @param {string} apk
   * @param {string} device_name
   * @param {string} platform_version
   * @returns string with header
   */
  scriptHeaderCode(goal, apk, device_name, platform_version, region) {
    return `<span ${this.code_parameter_class}>import</span> os

<span ${this.code_parameter_class}>from</span> appium <span ${this.code_parameter_class}>import</span> webdriver
<span ${this.code_parameter_class}>from</span> appium.options.android <span ${this.code_parameter_class}>import</span> UiAutomator2Options
<span ${this.code_parameter_class}>from</span> appium.webdriver.common.appiumby <span ${this.code_parameter_class}>import</span> AppiumBy

<span ${this.code_comment_class}># Installations:</span>
<span ${this.code_comment_class}># pip install Appium-Python-Client==3.1.0</span>
<span ${this.code_comment_class}># pip install selenium==4.15.2</span>

${this.splitComments(goal, false, `Goal: `)}

app = <span ${this.code_string_class}>"${apk}"</span>

dc = {<span ${this.code_string_class}>'platformName'</span>: <span ${this.code_string_class}>'Android'</span>}
dc[<span ${this.code_string_class}>'appium:app'</span>] = <span ${this.code_string_class}>"storage:filename="</span> + app
dc[<span ${this.code_string_class}>'appium:autoGrantPermissions'</span>] = <span ${this.code_parameter_class}>True</span>

dc[<span ${this.code_string_class}>'appium:deviceName'</span>] = <span ${this.code_string_class}>"${device_name}"</span>
dc[<span ${this.code_string_class}>'appium:platformVersion'</span>] = <span ${this.code_string_class}>"${platform_version}"</span>

dc[<span ${this.code_string_class}>'sauce:options'</span>] = {<span ${this.code_string_class}>"name"</span>: <span ${this.code_string_class}>"ScriptIQ test: ${goal}"</span>}

<span ${this.code_comment_class}># Set Sauce Credentials in Path</span>
dc[<span ${this.code_string_class}>'sauce:options'</span>][<span ${this.code_string_class}>"username"</span>] = os.environ[<span ${this.code_string_class}>"SAUCE_USERNAME"</span>]
dc[<span ${this.code_string_class}>'sauce:options'</span>][<span ${this.code_string_class}>"accessKey"</span>] = os.environ[<span ${this.code_string_class}>"SAUCE_ACCESS_KEY"</span>]

options = <span ${this.code_class_class}>UiAutomator2Options</span>().load_capabilities(dc)
url = <span ${this.code_string_class}>'https://ondemand.${region}.saucelabs.com/wd/hub'</span> 

driver = webdriver.<span ${this.code_class_class}>Remote</span>(url, <span ${this.code_parameter_class}}>options</span>=options)
driver.implicitly_wait(<span ${this.code_number_class}>60</span>)

<span ${this.code_comment_class}>## Test Code</span>
<span ${this.code_parameter_class}>try:</span>${this.preNewLine}`;
  }

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  endScriptCode() {
    return `<span ${this.code_parameter_class}}>except</span> <span ${this.code_class_class}>Exception</span> <span ${this.code_parameter_class}>as</span> e:
${this.preTab}<span ${this.code_parameter_class}>print</span>(e)
        
driver.quit()`;
  }

  /**
   * Split the comment across multiple lines. Cutoff when number of words exceeds 125 characters
   * @param {string} comment to split
   * @param {boolean} has_start_tab
   * @param {string} starting_value header to comment
   * @returns string of html of comment split into parts
   */
  splitComments(comment, has_start_tab = false, starting_value = ``) {
    var startTab = ``;
    if (has_start_tab) {
      startTab = this.preTab;
    }

    const cutoff_line_len = 125;
    var comment_words = comment.split(' ');
    var lines = [];
    var curr_word = `${startTab}# ${starting_value}`;
    for (let word of comment_words) {
      curr_word += word + ' ';
      if (curr_word.length > cutoff_line_len) {
        lines.push(curr_word);
        curr_word = `${startTab}# `;
      }
    }
    if (curr_word.length !== `${startTab}# `.length) {
      lines.push(curr_word);
    }
    return `<span class=\"code-comment\">${lines.join('<br>')}</span>${this.preNewLine}`;
  }
}
