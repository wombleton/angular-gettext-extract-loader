const Extractor = require('angular-gettext-tools').Extractor;
const fs = require('fs');
const PO = require('pofile');
const loaderUtils = require('loader-utils');
const path = require('path');
const _ = require('lodash');

function matches (oldRef, newRef) {
  return _(oldRef).split(':').first() === _(newRef).split(':').first();
}

/**
 * Merge new references with old references; ignore old references from the same file.
 */
function mergeReferences (oldRefs, newRefs) {
  const _newRefs = _(newRefs);

  return _(oldRefs)
    .reject(function (oldRef) {
      return _newRefs.any(function (newRef) {
        return matches(oldRef, newRef);
      });
    })
    .concat(newRefs)
    .uniq()
    .sort()
    .value();
}


/**
 * Parse and merge options from:
 *   - config-level object (`angularGettextExtractLoader`)
 *   - query string
 */
function getOptions(loaderContext) {
  const config = loaderContext.options['angularGettextExtractLoader'];
  const query = loaderUtils.parseQuery(loaderContext.query);
  const options = _.assign({}, config, query);
  
  // Parse `extensions` option. Allows for custom file schemes.
  if (_.isString(options.extensions)) {
    options.extensions = JSON.parse(options.extensions);
  }

  if (!options.pofile) {
    options.pofile = 'template.pot';
  }

  return options;
}


module.exports = function (source) {
  this.cacheable();

  const options = getOptions(this);
  var po;

  try {
    const s = fs.readFileSync(options.pofile, 'utf8');

    po = PO.parse(s);
  } catch (e) {
    if (e.code === 'ENOENT') {
      po = new PO();
    } else {
      throw new Error('Problem loading pofile: ' + e);
    }
  }

  const extractor = new Extractor(options);

  const filename = path.relative(this.options.context, this.resourcePath);

  extractor.parse(filename, source);

  _.each(po.items, function (item) {
    const context = item.msgctxt || '$$noContext';

    if (!extractor.strings[item.msgid]) {
      extractor.strings[item.msgid] = {};
    }

    const existing = extractor.strings[item.msgid][context];

    if (existing) {
      existing.comments = _.uniq(existing.comments.concat(item.comments)).sort();
      existing.references = mergeReferences(item.references, existing.references);
    } else {
      extractor.strings[item.msgid][context] = item;
    }
  });

  fs.writeFileSync(options.pofile, extractor.toString());

  return source;
};
