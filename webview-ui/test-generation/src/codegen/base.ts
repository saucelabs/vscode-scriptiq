export abstract class AbstractBaseGenerator {
  protected preNewLine: string;
  protected preTab: string;

  constructor() {
    this.preNewLine = `\n`;
    this.preTab = `    `;
  }

  /**
   * Code to find element
   * @param id_type identifier type (resource-id, text, content-desc, class)
   * @param id_value value of the identifier
   * @param id_num identifier number when multiple of same type and value on screen
   * @returns string with html of code
   */
  abstract findElementCode(
    id_type: string,
    id_value: string,
    id_num: number,
  ): string;

  /**
   * Generates the first line of code for each type of action.
   * @param bestIdentifier the id_type, id_value and id_num
   * @param action (click, scroll, set_text)
   * @returns the line of code
   */
  abstract genCodeLine(
    bestIdentifier: any,
    action: string,
    opts?: {
      // No idea what this is
      number?: string;
    },
  ): string;

  /**
   * Lines of code to swipe given a location of a element
   * @param direction
   * @param is_for_script is this in the full code output?
   * @returns string with html of code
   */
  abstract swipeCodeComment(direction: string, is_for_script: boolean): string;

  /**
   * Lines of code to send text given an element
   * @param set_text that is being sent
   * @param is_for_script is this in the full code output?
   * @returns string with html of code
   */
  abstract sendTextCodeComment(
    set_text: string,
    is_for_script: boolean,
  ): string;

  /**
   * Header for output script.
   * @returns string with header
   */
  abstract scriptHeaderCode(
    goal: string,
    appName: string,
    device_name: string,
    platform_version: string,
    region: string,
    platform: string,
  ): string;

  /**
   * End code which closes any try statement and ends test
   * @returns string of html of code to end test script
   */
  abstract endScriptCode(): string;

  /**
   * Split the comment across multiple lines. Cutoff when number of words exceeds 125 characters
   * @param comment to split
   * @param has_start_tab
   * @param starting_value header to comment
   * @returns string of html of comment split into parts
   */
  abstract splitComments(
    comment: string,
    has_start_tab: boolean,
    starting_value: string,
  ): string;

  abstract generateFullScript(
    goal: string,
    appName: string,
    device_name: string,
    platform_version: string,
    region: string,
    platform: string,
    steps: any[],
  ): string;

  abstract noOptionComment(): string;
}
