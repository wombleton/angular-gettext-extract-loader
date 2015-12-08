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

function findRoot (context, entries) {
  if (_.isString(entries)) {
    return path.dirname(path.join(context, entries));
  } else {
    return _.reduce(entries, function (memo, entry) {
      if (!_.isString(entry)) {
        return memo;
      }
      const dir = path.dirname(path.join(context, entry));

      if (memo) {
        const memoTokens = memo.split(path.sep);
        const dirTokens = dir.split(path.sep);
        const result = [];

        // find the minimum matching route
        for (var i = 0; i < memo.length; i++) {
          if (memoTokens[i] === dirTokens[i]) {
            result.push(memoTokens[i]);
          } else {
            return result.join(path.sep);
          }
        }
      } else {
        return dir;
      }
    }, '');
  }
}

module.exports = function (source) {
  this.cacheable();

  const options = loaderUtils.parseQuery(this.query);

  if (!options.pofile) {
    options.pofile = 'template.pot';
  }

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

  const root = findRoot(this.options.context, this.options.entry);
  const filename = path.relative(root, this.resourcePath);

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
