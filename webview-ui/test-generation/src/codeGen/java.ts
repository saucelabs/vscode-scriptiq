import { AbstractBaseGenerator } from './base';

export class AppiumJava extends AbstractBaseGenerator {
  name = 'appium_java';

  constructor() {
    super();
    this.preTab = `            `;
  }

  findElementCode(
    id_type: string,
    id_value: string,
    id_index = 0,
    _highlight = false,
  ) {
    let by_choice = 'xpath';
    if (id_type == 'resource-id') {
      by_choice = 'id';
    } else if (id_type == 'class') {
      by_choice = 'className';
    }

    let value = `${id_value}`;
    if (by_choice == 'xpath') {
      value = `//*[@${id_type}='${id_value}']`;
    }

    if (id_index == 0) {
      return `driver.findElement(By.${by_choice}("${value}"))`;
    } else {
      return `((WebElement) driver.findElements(By.${by_choice}("${value}")).get(${id_index}))`;
    }
  }

  genCodeLine(
    bestIdentifier: any,
    action: string,
    opts: { number?: string; highlight?: boolean } = {
      number: '',
      highlight: false,
    },
  ) {
    const findElement = this.findElementCode(
      bestIdentifier.type,
      bestIdentifier.value,
      bestIdentifier.index,
      opts?.highlight,
    );

    let codeStepText = ``;
    if (action == 'set_text') {
      codeStepText += `WebElement element${opts.number} = ${findElement};${this.preNewLine}`;
    } else if (action == 'click') {
      codeStepText += `${findElement}.click();${this.preNewLine}`;
    } else if (action == 'scroll') {
      codeStepText += `String elementId${opts.number} = ((RemoteWebElement) driver.findElement(By.id("com.wayfair.wayfair:id/nested_scroll_view"))).getId();${this.preNewLine}`;
    }
    return codeStepText;
  }

  noOptionComment() {
    return ` // SKIP STEP` + this.preNewLine;
  }

  swipeCodeComment(direction: string, is_for_script = false, number = '') {
    let frontLine;
    if (is_for_script) {
      frontLine = this.preTab;
    } else {
      frontLine = ``;
    }
    let text = ``;
    if (!is_for_script) {
      text += `${this.preNewLine}// SWIPE CODE:${this.preNewLine}`;
    }
    let swipe_dir;
    if (direction === 'down') {
      swipe_dir = 'up';
    } else if (direction === 'up') {
      swipe_dir = 'down';
    } else if (direction === 'left') {
      swipe_dir = 'right';
    } else if (direction === 'right') {
      swipe_dir = 'left';
    }
    text += `${frontLine}driver.executeScript("mobile: swipeGesture", ImmutableMap.of(${this.preNewLine}`;
    text += `${frontLine}${this.preTab}"elementId", elementId${number},${this.preNewLine}`;
    text += `${frontLine}${this.preTab}"direction", "${swipe_dir}",${this.preNewLine}`;
    text += `${frontLine}${this.preTab}"percent", 1.00${this.preNewLine}`;
    text += `${frontLine}));${this.preNewLine}`;
    return text;
  }

  sendTextCodeComment(set_text: string, is_for_script = false, number = '') {
    let frontLine;
    if (is_for_script) {
      frontLine = this.preTab;
    } else {
      frontLine = ``;
    }

    let text = ``;
    if (!is_for_script) {
      text += `${this.preNewLine}// RETURN TEXT CODE:${this.preNewLine}`;
    }
    text += `${frontLine}element${number}.click();${this.preNewLine}`;
    text += `${frontLine}element${number}.sendKeys("${set_text}");${this.preNewLine}`;
    text += `${frontLine}((PressesKey) driver).pressKey(new KeyEvent(AndroidKey.ENTER));${this.preNewLine}`;
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
    return `
import com.google.common.collect.ImmutableMap;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.nativekey.AndroidKey;
import io.appium.java_client.android.nativekey.KeyEvent;
import io.appium.java_client.android.nativekey.PressesKey;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TestName;
import org.openqa.selenium.By;
import org.openqa.selenium.MutableCapabilities;
import org.openqa.selenium.Rectangle;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebElement;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * Test Generation Assistant Tests
 */
public class TestGenerationAssistantTest {
    
    private AppiumDriver driver;
    private MutableCapabilities capabilities;
    private URL url;

    @Rule
    public TestName name = new TestName() {
        public String getMethodName() {
            return String.format("%s", super.getMethodName());
        }
    };

    @Before
    public void setup() throws MalformedURLException {
        capabilities = new MutableCapabilities();
        MutableCapabilities sauceOptions = new MutableCapabilities();

        url = new URL("https://" + System.getenv("SAUCE_USERNAME") + ":" +
                       System.getenv("SAUCE_ACCESS_KEY") +
                       "@ondemand.${region}.saucelabs.com/wd/hub");

        // For all capabilities please check
        // http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
        // Use the platform configuration https://saucelabs.com/platform/platform-configurator#/
        // to find the emulators/real devices names, OS versions and appium versions you can use for your testings
        capabilities.setCapability("platformName", "${platform}");
        capabilities.setCapability("appium:automationName", "${automationName}");
        capabilities.setCapability("appium:autoGrantPermissions", true);

        // Sauce capabilities
        sauceOptions.setCapability("name", name.getMethodName() + ": " + "${goal}");
        sauceOptions.setCapability("username", System.getenv("SAUCE_USERNAME"));
        sauceOptions.setCapability("accessKey", System.getenv("SAUCE_ACCESS_KEY"));

        capabilities.setCapability("sauce:options", sauceOptions);
    }

    @Test
    public void runTest(){
        capabilities.setCapability("appium:app", "storage:filename=${appName}");
        capabilities.setCapability("appium:deviceName", "${device_name}");
        capabilities.setCapability("appium:platformVersion", "${platform_version}");
        try {
            driver = new AndroidDriver(url, capabilities);
            driver.manage().timeouts().implicitlyWait(30, TimeUnit.SECONDS);

`;
  }

  endScriptCode() {
    return `
        } catch (Exception e){
            System.out.println("Error creating driver or running test: " + e.getMessage());
        }
        driver.quit();
    }
}`;
  }

  splitComments(comment: string, has_start_tab = false, starting_value = ``) {
    let startTab = ``;
    if (has_start_tab) {
      startTab = this.preTab;
    }

    const cutoff_line_len = 125;
    const comment_words = comment.split(' ');
    const lines = [];
    let curr_word = `${startTab}// ${starting_value}`;
    for (const word of comment_words) {
      curr_word += word + ' ';
      if (curr_word.length > cutoff_line_len) {
        lines.push(curr_word);
        curr_word = `${startTab}// `;
      }
    }
    if (curr_word.length !== `${startTab}// `.length) {
      lines.push(curr_word);
    }
    return `${lines.join('<br>')}${this.preNewLine}`;
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
            { number: x.toString() },
          );

        if ('direction' in steps[x] && steps[x].direction !== '') {
          codeStepText += this.swipeCodeComment(
            steps[x].direction,
            true,
            x.toString(),
          );
        }
        if ('text' in steps[x] && steps[x].text !== '') {
          codeStepText += this.sendTextCodeComment(
            steps[x].text,
            true,
            x.toString(),
          );
        }
        codeStepText += `${this.preNewLine}`;
      }
    }
    const closeStepText = this.endScriptCode();

    return `${headerText}${codeStepText}${closeStepText}`;
  }
}
