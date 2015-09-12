# angular-gettext-extract-loader
Loader to extract gettext strings from an angular project.

## Installation

    npm i -D angular-gettext-extract-loader

## Usage

Add it into the pipeline for js & html loading:

    modules: {
      ...
      loaders: [
        ...
          {
            test: /src.*\.js$/,
            loader: 'angular-gettext-extract-loader?pofile=po/template.pot'
          },
          {
            test: /src.*\.html$/,
            loader: 'angular-gettext-extract-loader?pofile=po/template.pot'
          },
        ...
      ]
      ...
    }

This will output all strings found to the the configured pofile.

## Caveat

It does not detect the removal of strings. (Yet ...?)
