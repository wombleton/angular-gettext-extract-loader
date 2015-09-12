var Extractor = require('angular-gettext-tools').Extractor;
var fs = require('fs');
var PO = require('pofile');
var loaderUtils = require('loader-utils');
var path = require('path');
var _ = require('lodash');

module.exports = function (source) {
  this.cacheable();

  var options = loaderUtils.parseQuery(this.query);

  if (!options.pofile) {
    options.pofile = 'template.pot';
  }

  var po;

  try {
    var s = fs.readFileSync(options.pofile, 'utf8');

    po = PO.parse(s);
  } catch (e) {
    if (e.code === 'ENOENT') {
      po = new PO();
    } else {
      throw new Error('Problem loading pofile: ' + e);
    }
  }

  var extractor = new Extractor(options);

  var root = path.dirname(path.join(this.options.context, this.options.entry));
  var filename = path.relative(root, this.resourcePath);

  extractor.parse(filename, source);

  _.each(po.items, function (item) {
    var context = item.msgctxt || '$$noContext';

    if (!extractor.strings[item.msgid]) {
      extractor.strings[item.msgid] = {};
    }

    var existing = extractor.strings[item.msgid][context];

    if (existing) {
      existing.comments = _.uniq(existing.comments.concat(item.comments)).sort();
      existing.references = _.uniq(existing.references.concat(item.references)).sort();
    } else {
      extractor.strings[item.msgid][context] = item;
    }
  });

  fs.writeFileSync(options.pofile, extractor.toString());

  return source;
};
