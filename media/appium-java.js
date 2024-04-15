import { CodeTemplate } from './code-template.js';

export class AppiumJava extends CodeTemplate {
  name = 'appium_java';

  constructor() {
    super();
    this.preTab = `            `;
  }

  /**
   * Code to find element
   * @param {string} id_type identifier type (resource-id, text, content-desc, class)
   * @param {string} id_value value of the identifier
   * @param {number} id_num identifier number when multiple of same type and value on screen
   * @returns string with html of code
   */
  findElementCode(id_type, id_value, id_num = 0) {
    var by_choice = 'xpath';
    if (id_type == 'resource-id') {
      by_choice = 'id';
    } else if (id_type == 'class') {
      by_choice = 'className';
    }

    if (by_choice == 'xpath') {
      var value = `//*[@${id_type}='${id_value}']`;
    } else {
      var value = `${id_value}`;
    }

    if (id_num == 0) {
      return `driver.<span ${this.code_parameter_class}>findElement</span>(<span ${this.code_class_class}>By</span>.<span ${this.code_parameter_class}>${by_choice}</span>(<span ${this.code_string_class}>"${value}"</span>))`;
    } else {
      return `((<span ${this.code_parameter_class}>WebElement</span>) driver.<span ${this.code_parameter_class}>findElements</span>(<span ${this.code_class_class}>By</span>.<span ${this.code_parameter_class}>${by_choice}</span>(<span ${this.code_string_class}>"${value}"</span>)).get(<span ${this.code_number_class}>${id_num}</span>))`;
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
      codeStepText += `<span ${this.code_parameter_class}>WebElement</span> element${number} = ${findElement};${this.preNewLine}`;
    } else if (action == 'click') {
      codeStepText += `${findElement}.<span ${this.code_parameter_class}>click</span>();${this.preNewLine}`;
    } else if (action == 'scroll') {
      codeStepText += `<span ${this.code_parameter_class}>String</span> elementId${number} = ((<span ${this.code_parameter_class}>RemoteWebElement</span>) driver.<span ${this.code_parameter_class}>findElement</span>(<span ${this.code_parameter_class}>By</span>.<span ${this.code_parameter_class}>id</span>(<span ${this.code_string_class}>"com.wayfair.wayfair:id/nested_scroll_view"</span>))).<span ${this.code_parameter_class}>getId</span>();${this.preNewLine}`;
    }
    return codeStepText;
  }

  /**
   * Line of code to indicate skipping the step
   * @returns the original element, now with the skip step option added
   */
  noOptionComment() {
    return (
      `<span ${this.code_comment_class}> // SKIP STEP</span>` + this.preNewLine
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
      text += `${this.preNewLine}<span ${this.code_comment_class}>// SWIPE CODE:</span>${this.preNewLine}`;
    }
    var swipe_dir;
    if (direction === 'down') {
      swipe_dir = 'up';
    } else if (direction === 'up') {
      swipe_dir = 'down';
    } else if (direction === 'left') {
      swipe_dir = 'right';
    } else if (direction === 'right') {
      swipe_dir = 'left';
    }
    text += `${frontLine}driver.<span ${this.code_parameter_class}>executeScript</span>(<span ${this.code_string_class}>"mobile: swipeGesture"</span>, <span ${this.code_parameter_class}>ImmutableMap</span>.<span ${this.code_parameter_class}>of</span>(${this.preNewLine}`;
    text += `${frontLine}${this.preTab}<span ${this.code_string_class}>"elementId"</span>, elementId${number},${this.preNewLine}`;
    text += `${frontLine}${this.preTab}<span ${this.code_string_class}>"direction"</span>, <span ${this.code_string_class}>"${swipe_dir}"</span>,${this.preNewLine}`;
    text += `${frontLine}${this.preTab}<span ${this.code_string_class}>"percent"</span>, <span ${this.code_number_class}>1.00</span>${this.preNewLine}`;
    text += `${frontLine}));${this.preNewLine}`;
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
      text += `${this.preNewLine}<span ${this.code_comment_class}>// RETURN TEXT CODE:</span>${this.preNewLine}`;
    }
    text += `${frontLine}element${number}.<span ${this.code_parameter_class}>click</span>();${this.preNewLine}`;
    text += `${frontLine}element${number}.<span ${this.code_parameter_class}>sendKeys</span>(<span ${this.code_string_class}>"${set_text}"</span>);${this.preNewLine}`;
    text += `${frontLine}((<span ${this.code_parameter_class}>PressesKey</span>) driver).<span ${this.code_parameter_class}>pressKey</span>(new <span ${this.code_parameter_class}>KeyEvent</span>(<span ${this.code_parameter_class}>AndroidKey</span>.ENTER));${this.preNewLine}`;
    return text;
  }

  /**
   * Header for output script.
   * @returns string with header
   */
  scriptHeaderCode(goal, appName, device_name, platform_version, region) {
    return `
<span ${this.code_class_class}>import</span> com.google.common.collect.<span ${this.code_created_classes_class}>ImmutableMap</span>;
<span ${this.code_class_class}>import</span> io.appium.java_client.<span ${this.code_created_classes_class}>AppiumDriver</span>;
<span ${this.code_class_class}>import</span> io.appium.java_client.android.<span ${this.code_created_classes_class}>AndroidDriver</span>;
<span ${this.code_class_class}>import</span> io.appium.java_client.android.nativekey.<span ${this.code_created_classes_class}>AndroidKey</span>;
<span ${this.code_class_class}>import</span> io.appium.java_client.android.nativekey.<span ${this.code_created_classes_class}>KeyEvent</span>;
<span ${this.code_class_class}>import</span> io.appium.java_client.android.nativekey.<span ${this.code_created_classes_class}>PressesKey</span>;
<span ${this.code_class_class}>import</span> org.junit.<span ${this.code_created_classes_class}>Before</span>;
<span ${this.code_class_class}>import</span> org.junit.<span ${this.code_created_classes_class}>Rule</span>;
<span ${this.code_class_class}>import</span> org.junit.<span ${this.code_created_classes_class}>Test</span>;
<span ${this.code_class_class}>import</span> org.junit.rules.<span ${this.code_created_classes_class}>TestName</span>;
<span ${this.code_class_class}>import</span> org.openqa.selenium.<span ${this.code_created_classes_class}>By</span>;
<span ${this.code_class_class}>import</span> org.openqa.selenium.<span ${this.code_created_classes_class}>MutableCapabilities</span>;
<span ${this.code_class_class}>import</span> org.openqa.selenium.<span ${this.code_created_classes_class}>Rectangle</span>;
<span ${this.code_class_class}>import</span> org.openqa.selenium.<span ${this.code_created_classes_class}>WebElement</span>;
<span ${this.code_class_class}>import</span> org.openqa.selenium.remote.<span ${this.code_created_classes_class}>RemoteWebElement</span>;

<span ${this.code_class_class}>import</span> java.net.<span ${this.code_created_classes_class}>MalformedURLException</span>;
<span ${this.code_class_class}>import</span> java.net.<span ${this.code_created_classes_class}>URL</span>;
<span ${this.code_class_class}>import</span> java.util.concurrent.<span ${this.code_created_classes_class}>TimeUnit</span>;

<span ${this.code_comment_class}>/**
 * Test Generation Assistant Tests
 */</span>
public <span ${this.code_class_class}>class</span> <span ${this.code_created_classes_class}>TestGenerationAssistantTest</span> {
    
    private <span ${this.code_parameter_class}>AppiumDriver</span> driver;
    private <span ${this.code_parameter_class}>MutableCapabilities</span> capabilities;
    private <span ${this.code_parameter_class}>URL</span> url;

    <span ${this.code_parameter_class}>@Rule</span>
    public <span ${this.code_parameter_class}>TestName</span> name = <span ${this.code_class_class}>new</span> <span ${this.code_parameter_class}>TestName</span>() {
        public <span ${this.code_parameter_class}>String</span> <span ${this.code_created_classes_class}>getMethodName</span>() {
            <span ${this.code_class_class}>return</span> <span ${this.code_parameter_class}>String</span>.format(<span ${this.code_string_class}>"%s"</span>, super.getMethodName());
        }
    };

    <span ${this.code_parameter_class}>@Before</span>
    public <span ${this.code_class_class}>void</span> setup() throws <span ${this.code_parameter_class}>MalformedURLException</span> {
        capabilities = <span ${this.code_class_class}>new</span> <span ${this.code_parameter_class}>MutableCapabilities</span>();
        <span ${this.code_parameter_class}>MutableCapabilities</span> sauceOptions = <span ${this.code_class_class}>new</span> <span ${this.code_parameter_class}>MutableCapabilities</span>();

        url = <span ${this.code_class_class}>new</span> <span ${this.code_parameter_class}>URL</span>(<span ${this.code_string_class}>"https://"</span> + <span ${this.code_parameter_class}>System</span>.<span ${this.code_parameter_class}>getenv</span>(<span ${this.code_string_class}>"SAUCE_USERNAME"</span>) + <span ${this.code_string_class}>":"</span> +
                       <span ${this.code_parameter_class}>System</span>.<span ${this.code_parameter_class}>getenv</span>(<span ${this.code_string_class}>"SAUCE_ACCESS_KEY"</span>) +
                       <span ${this.code_string_class}>"@ondemand.${region}.saucelabs.com/wd/hub"</span>);

        <span ${this.code_comment_class}>// For all capabilities please check
        // http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
        // Use the platform configuration https://saucelabs.com/platform/platform-configurator#/
        // to find the emulators/real devices names, OS versions and appium versions you can use for your testings</span>
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"platformName"</span>, <span ${this.code_string_class}>"android"</span>);
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"appium:automationName"</span>, <span ${this.code_string_class}>"UiAutomator2"</span>);
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"appium:autoGrantPermissions"</span>, true);

        // Sauce capabilities
        sauceOptions.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"name"</span>, name.<span ${this.code_parameter_class}>getMethodName</span>() + <span ${this.code_string_class}>": "</span> + <span ${this.code_string_class}>"${goal}"</span>);
        sauceOptions.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"username"</span>, <span ${this.code_class_class}>System</span>.<span ${this.code_parameter_class}>getenv</span>(<span ${this.code_string_class}>"SAUCE_USERNAME"</span>));
        sauceOptions.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"accessKey"</span>, <span ${this.code_class_class}>System</span>.<span ${this.code_parameter_class}>getenv</span>(<span ${this.code_string_class}>"SAUCE_ACCESS_KEY"</span>));

        capabilities.setCapability(<span ${this.code_string_class}>"sauce:options"</span>, sauceOptions);
    }

    <span ${this.code_parameter_class}>@Test</span>
    public <span ${this.code_class_class}>void</span> runTest(){
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"appium:app"</span>, <span ${this.code_string_class}>"storage:filename=${appName}"</span>);
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"appium:deviceName"</span>, <span ${this.code_string_class}>"${device_name}"</span>);
        capabilities.<span ${this.code_parameter_class}>setCapability</span>(<span ${this.code_string_class}>"appium:platformVersion"</span>, <span ${this.code_string_class}>"${platform_version}"</span>);
        <span ${this.code_class_class}>try</span> {
            driver = <span ${this.code_class_class}>new AndroidDriver</span>(url, capabilities);
            driver.<span ${this.code_parameter_class}>manage</span>().<span ${this.code_parameter_class}>timeouts</span>().<span ${this.code_parameter_class}>implicitlyWait</span>(30, <span ${this.code_class_class}>TimeUnit.SECONDS</span>);

`;
  }

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  endScriptCode() {
    return `
        } <span ${this.code_class_class}>catch</span> (<span ${this.code_class_class}>Exception</span> e){
            <span ${this.code_class_class}>System</span>.out.<span ${this.code_parameter_class}>println</span>(<span ${this.code_string_class}>"Error creating driver or running test: "</span> + e.<span ${this.code_parameter_class}>getMessage</span>());
        }
        driver.quit();
    }
}`;
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
    var curr_word = `${startTab}// ${starting_value}`;
    for (let word of comment_words) {
      curr_word += word + ' ';
      if (curr_word.length > cutoff_line_len) {
        lines.push(curr_word);
        curr_word = `${startTab}// `;
      }
    }
    if (curr_word.length !== `${startTab}// `.length) {
      lines.push(curr_word);
    }
    return `<span ${this.code_comment_class}>${lines.join('<br>')}</span>${this.preNewLine}`;
  }
}
