export class CodeTemplate {
  constructor() {
    if (new.target == CodeTemplate) {
      throw new Error('Cannot instantiate abstract class');
    }
    this.preNewLine = `
`;
    this.preTab = `    `;

    // Code Label Names
    this.code_comment_class = `class="code-comment"`;
    this.code_string_class = `class="code-string"`;
    this.code_parameter_class = `class="code-parameter"`;
    this.code_class_class = `class="code-class"`;
    this.code_created_classes_class = `class="code-created-class"`;
    this.code_number_class = `class="code-number"`;
  }

  /**
   * Code to find element
   * @param {string} id_type identifier type (resource-id, text, content-desc, class)
   * @param {string} id_value value of the identifier
   * @param {number} id_num identifier number when multiple of same type and value on screen
   * @returns string with html of code
   */
  findElementCode(id_type, id_value, id_num = 0) {
    throw new Error('Abstract method findElementCode must be overridden');
  }

  /**
   * Generates the first line of code for each type of action.
   * @param {dict} bestIdentifier the id_type, id_value and id_num
   * @param {string} action (click, scroll, set_text)
   * @returns {string} the line of code
   */
  genCodeLine(bestIdentifier, action, number = '') {
    throw new Error('Abstract method genCodeLine must be overridden');
  }

  /**
   * Add the skip step option to the list of potential identifiers for script generation
   * @param {Element} container the element where the option to not add the step will be added
   * @param {number} stepNum the step number
   * @returns the original element, now with the skip step option added
   */
  addNoOption(container, stepNum) {
    throw new Error('Abstract method addNoOption must be overridden');
  }

  /**
   * Lines of code to swipe given a location of a element
   * @param {string} direction
   * @param {boolean} is_for_script is this in the full code output?
   * @returns string with html of code
   */
  swipeCodeComment(direction, is_for_script = false, number = '') {
    throw new Error('Abstract method swipeCodeComment must be overridden');
  }

  /**
   * Lines of code to send text given an element
   * @param {string} set_text that is being sent
   * @param {boolean} is_for_script is this in the full code output?
   * @returns string with html of code
   */
  sendTextCodeComment(set_text, is_for_script = false, number = '') {
    throw new Error('Abstract method sendTextCodeComment must be overridden');
  }

  /**
   * Header for output script.
   * @returns string with header
   */
  scriptHeaderCode(goal, appName, device_name, platform_version) {
    throw new Error('Abstract method scriptHeaderCode must be overridden');
  }

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  endScriptCode() {
    throw new Error('Abstract method endScriptCode must be overridden');
  }

  /**
   * Split the comment across multiple lines. Cutoff when number of words exceeds 125 characters
   * @param {string} comment to split
   * @param {*} has_start_tab
   * @param {*} starting_value header to comment
   * @returns string of html of comment split into parts
   */
  splitComments(comment, has_start_tab = false, starting_value = ``) {
    throw new Error('Abstract method splitComments must be overridden');
  }
}
