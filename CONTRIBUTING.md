# Contributing

We welcome bug reports and improvement feedback regarding templates.

Feel free to create an issue with details.

On the other hand, if you have any questions or bug reports that are not not directly related to this template, such as questions about Google Tag Manager or the LINE Conversion API itself, please report them to the appropriate places.

## Checklist before bug reporting or feedback

Please make sure to include the following information when creating an issue:

* Error message
* Parameters when an error occurs, excluding confidential information such as personal information and access tokens
* Environmental information when an error occurs (browser type and version)
* Other information that you think is necessary

## Template code conventions

This repository manages two types of template code.

One is the template code for installation with the `.tpl` extension.
The other is the code that is the basis of the template written in JavaScript that exists under `src`.

The Server Side Tag runs on a JavaScript sandbox that runs on Google's Server Side Container. In order to publish the repository this time, it was necessary to realize CI at the GitHub level. Since the specifications of the language executed by Sandbox are almost compatible with JavaScript, we also manage the template code written in JavaScript code and the set of test code that operates by mocking the function provided as API.

You can first modify `src/template_code.js`, write the test code, and then update the　`.tpl` file only if it passes.

Check Google's [Server-side tagging APIs for Sandbox API](https://developers.google.com/tag-platform/tag-manager/server-side/api) specifications.
