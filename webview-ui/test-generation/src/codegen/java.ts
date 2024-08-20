import { AbstractBaseGenerator } from './base';

export class AppiumJava extends AbstractBaseGenerator {
  name = 'appium_java';

  findElementCode(id_type: string, id_value: string, id_index = 0) {
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
    opts: { number?: string } = {
      number: '',
    },
  ) {
    const findElement = this.findElementCode(
      bestIdentifier.type,
      bestIdentifier.value,
      bestIdentifier.index,
    );

    if (action == 'click') {
      return `${findElement}.click();\n`;
    } else {
      return `WebElement element${opts.number} = ${findElement};\n`;
    }
  }

  noOptionComment() {
    return ` // SKIP STEP\n`;
  }

  scrollCode(direction: string, platform: string, number = '') {
    const commandName = platform == 'Android' ? 'scrollGesture' : 'scroll';
    return `            driver.executeScript("mobile: ${commandName}", ImmutableMap.of(
                "elementId", element${number},
                "direction", "${direction}",
                "percent", 1.00
           ));\n`;
  }

  sendTextCode(text: string, platform: string, number = '', findElement = '') {
    if (platform == 'Android') {
      return `            element${number}.click();
            ${findElement.replace('WebElement ', '').replace('\n', '')}
            element${number}.sendKeys("${text}");
            ((PressesKey) driver).pressKey(new KeyEvent(AndroidKey.ENTER));\n`;
    } else {
      return `            element${number}.click();
            ${findElement.replace('WebElement ', '')}            element${number}.sendKeys("${text}\\n");`;
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
    const split_goal = this.splitComments(goal, false, `Goal: `);
    return `package com.example;
    
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
import org.openqa.selenium.WebElement;

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

        url = new URL("https://ondemand.${region}.saucelabs.com/wd/hub");

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
        ${split_goal}
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
      startTab = `            `;
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
    return `${lines.join('\n')}`;
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
        codeStepText +=
          this.splitComments(steps[x].event_reason, true, `ScriptIQ Reason: `) +
          '\n';

        const findElement = this.genCodeLine(
          steps[x].potential_identifiers[steps[x].selectedIdentifier],
          steps[x].action,
          { number: x.toString() },
        );

        codeStepText += `            ` + findElement;

        if (steps[x].action == 'scroll') {
          codeStepText += this.scrollCode(
            steps[x].actionMetadata.direction,
            platform,
            x.toString(),
          );
        }
        if (steps[x].action == 'set_text') {
          codeStepText += this.sendTextCode(
            steps[x].actionMetadata.text,
            platform,
            x.toString(),
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
