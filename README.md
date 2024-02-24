# VSCode ScriptIQ Extension

## Development

Instructions to run this VSCode Extension.

1. Install the npm dependencies.
```bash
npm i
```
2. Configure the ScriptIQ API server by setting the environment variable: `SCRIPTIQ_API_SERVER`.
3. Open this project in a VS Code Window: go to `File` -> `Open Folder`.
4. Run the extension using the F5 button on your keyboard, or click: `Run` -> `Debugging`.
5. Click the `Sauce Lab's ScriptIQ` icon on the left bar (should be the last icon on the left bar. It is a right arrow followed by an underscore). This will open a side bar.
6. Fill in your Sauce Credentials into the appropriate fields and click `Save`. You only need to do this once.
7. Click `New Test Generation`. This will open a window with an APK and test goal field.
8. Fill in your apk name (which matches the name of an apk in your App Management).
  - To upload app, go to: [https://app.saucelabs.com/app-management](https://app.saucelabs.com/app-management) 
9. Fill in a goal field with what you want the test to accomplish.
10. Click `Generate`. It may take a few minutes to generate the output.
11. After the test has been generated, you can go through the candidate test steps. You can use the preselected identifier to interact with an element or select from the other options.
12. At the end of the test steps, there is a button called `Create Script`. Click this to generate a script you can run outside of ScriptIQ.
13. The left sidebar will store test history which you can reopen by clicking the links. (These can also be deleted to keep the sidebar organized)
