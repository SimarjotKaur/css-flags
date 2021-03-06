import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import glob from 'glob';
import Promise from 'bluebird';
import svg2font from 'svgicons2svgfont';

const FontHelper = {
  svgFontFilepath: './app/assets/fonts/Symbols.svg',

  getAllSymbols() {
    let pattern = './src/symbols/*.svg';
    return Promise.promisify(glob)(pattern);
  },

  createFont(symbolList) {
    let deferred = Promise.pending();
    let glyphMapping = {};
    let stream = svg2font({
      fontName: 'Symbols'
    });
    stream.pipe(fs.createWriteStream(FontHelper.svgFontFilepath));
    stream.on('finish', () => {
      deferred.resolve(glyphMapping);
    });
    stream.on('error', (err) => {
      deferred.reject(err);
    });

    let unicodeIndex = 0;
    let baseUnicodeCodePoint = 58880; // \e6XX private space
    symbolList.forEach((symbol) => {
      let glyph = fs.createReadStream(symbol);
      let name = path.basename(symbol, '.svg');
      let unicodeCodePoint = unicodeIndex + baseUnicodeCodePoint;
      let unicodeCharacter = String.fromCodePoint(unicodeCodePoint);
      let unicodeCharacterEscaped = `\\${unicodeCodePoint.toString(16)}`;
      unicodeIndex++;

      glyph.metadata = {name, unicode: [unicodeCharacter]};
      glyphMapping[name] = unicodeCharacterEscaped;

      stream.write(glyph);
    });

    stream.end();
    return deferred.promise;
  },

  createScssFile(mapping) {
    let scssContent = _.map(mapping, (value, key) => {
      return `\$UTF8_${key}: '${value}';`;
    });
    scssContent = `// THIS FILE IS GENERATED BY npm run fonts
// DO NOT EDIT DIRECTLY

${scssContent.join('\n')}`;

    let filepath = './app/styles/_helpers/symbol_codes.scss';
    return Promise.promisify(fs.writeFile)(filepath, scssContent)
      .then(() => {
        console.info('symbol_codes.scss created');
      });
  },

  run() {
    FontHelper.getAllSymbols()
      .then(FontHelper.createFont)
      .then(FontHelper.createScssFile)
      .then(() => {
        console.info('Finished!');
      });
  }
};
FontHelper.run();
