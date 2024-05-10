import * as vscode from 'vscode';

export class HistoryProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  public static readonly viewType = 'scriptiq-history';
  // onDidChangeTreeData?: vscode.Event<void | vscode.TreeItem | vscode.TreeItem[] | null | undefined> | undefined;
  getTreeItem(
    element: vscode.TreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    _element?: vscode.TreeItem | undefined,
  ): vscode.ProviderResult<vscode.TreeItem[]> {
    return [
      new vscode.TreeItem(
        'yelp.apk',
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
      new vscode.TreeItem(
        'Android-MyDemoAppRN.1.3.0.build0-2244.apk',
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
      new vscode.TreeItem(
        'yelp-1.2.3.apk',
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
      new vscode.TreeItem(
        'swag-native-orig.apk',
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
    ];
  }
  // getParent?(element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
  //     throw new Error('Method not implemented.');
  // }
  // resolveTreeItem?(item: vscode.TreeItem, element: vscode.TreeItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
  //     throw new Error('Method not implemented.');
  // }
}
