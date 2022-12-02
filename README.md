> :warning: Archived in favor of HMR enabled environment: [consider using this template instead](https://github.com/philheller/browser_extension_environment).

# Extension development

[What is this environment for?](#what-is-this-environment-for)
[What are the tasks the environment automates?](#what-are-the-tasks-the-environment-automates)
[How to use?](#how-to-use)

## What is this environment for?

This environment is used to automate a bunch of tasks in order to bundle an extension.
It is compatible with:

- chromium based browsers (blink)
- Firefox as well with a little addition in the manifest.json (gecko)

This environment is suitable for a small scale project and is _not_ good for:

- big projects with large UI changes
- if you want to include a framework, more dedicated solutions for different frameworks are available

This file will not cover how to develop extensions. Learn more about that for example in the documentation provided by [Google](https://developer.chrome.com/docs/extensions/mv3/getstarted/).

## What are the tasks the environment automates?

- compiling
  - sass to css, JS files
- minimize HTML
- minimize SVGs
- package zip file for upload to chrome and firefox extension store or for thunderbird
- testing is optionally avialable

## How to use?

Use `npm start` or `npm run dev` to start the development server. Any changes will be reflected in the `dist` folder.

Use `npm build` to only create the `dist` folder without watching changes in files.

Use `npm package` in order to create the `.zip` files for Chromium based browsers and Firefox and the `.xpi` file for Thunderbird.
