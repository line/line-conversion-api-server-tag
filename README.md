# LINE Conversion API Server Side Tag Template

This is a server side tag template that can be installed into [Google Server Side Tag Container](https://developers.google.com/tag-platform/tag-manager/server-side) and used to send conversion events to [LINE Conversion API]() without additional implementation.
By using this, it is possible to do the same measurement on the server side such as LINE Tag do.

Currently, only GA4 Client is supported, and in addition to the data automatically collected by Google Tag, it is possible to send additional parameters unique to LINE.

## Installation & Usage

The `line_conversion_api.tpl` that this repository contains in root directory is a template file for server side tagging.
You can download here and install it from Google Tag Manager.

For detailed information, please check following resources.

* [Setting Guide for LINE Conversion API Server Side Tag](https://conversion-api-docs.linebiz.com/)
* [An introduction to server-side tagging - Google Tag Manager - Server-side](https://developers.google.com/tag-platform/tag-manager/server-side/intro)

## Testing

The Server Side Tag Template works in a sandbox JavaScript environment. Therefore, it behaves a little differently from normal JavaScript code, but CI is realized by executing automated test code using a mock that imitates the behavior of the sandbox API.

```shell
$ npm run test
```

## Bug Reporting & Feedback

We welcome bug reports and improvement feedback regarding templates.

Feel free to create an issue with details.

On the other hand, if you have any questions or bug reports that are not not directly related to this template, such as questions about Google Tag Manager or the LINE Conversion API itself, please report them to the appropriate places.

## License

[APACHE LICENSE, VERSION 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt)
