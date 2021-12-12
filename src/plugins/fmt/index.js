const Plugin = require('../../structs/Plugin.js');
const Cache = require('../../structs/Cache.js')

class FormatterPlugin extends Plugin {
    load() {
        this.bot.fmt = new Formatter(this.bot);
    }
}

class Formatter {
    constructor() {
        this.tokens = new Cache();

        this.ZWSP = String.fromCharCode(8203);
        this.REGEX_TOKEN_PATTERN = /[.*+?^${}()|[\]\\]/g;
    }

    firstLine(str) {
        return str.trim().match(/^.*/)[0];
    }

    trimLines(str) {
        return str.trim().replace(/^\s+/gm, '');
    }

    indent(str, spaces = 2) {
        const prefix = typeof spaces === 'string'
            ? spaces
            : new Array(spaces + 1).join(' ');

        return prefix + str.replace(/\n/g, `\n${prefix}`);
    }

    escapeRegex(str) {
        return str.replace(this.REGEX_TOKEN_PATTERN, '\\$&');
    }

    anyTokens(chars, flags) {
        const uniq = Array.from(new Set(chars));
        const str = uniq.map(this.escapeRegex.bind(this)).join('|');
        return new RegExp(str, flags);
    }

    escape(str, chars, escapeToken = '\\') {
        const re = this.tokens.get(chars, () => this.anyTokens(chars, 'gi'));
        return str.replace(re, `${escapeToken}$&`);
    }

    sugar(content, ...flags) {
        let chars = '';
        let escapeChar;

        if (flags[0] instanceof Array) {
            const params = flags.shift();
            escapeChar = params.shift();
            chars = params.join('');
        }

        chars += flags.join('');

        let str = '';
        for (let i = 0; i < flags.length; i++) {
            str += flags[i];
        }

        str += this.escape(content, chars, escapeChar);

        let i = flags.length;
        while (i--) {
            str += flags[i];
        }

        return str;
    }

    code(content) {
        return this.sugar(content, [ this.ZWSP ], '``')
    }

    italic(content) {
        return this.sugar(content, '*');
    }

    bold(content) {
        return this.sugar(content, '**');
    }

    strike(content) {
        return this.sugar(content, '~~');
    }

    underline(content) {
        return this.sugar(content, '__');
    }

    link(text, url) {
        if (!url) {
            return text;
        }

        return `[${text}](${url})`;
    }

    codeBlock(lang, content) {
        if (!content) {
            content = lang;
            lang = '';
        }

        return this.sugar(`${lang}\n${String(content).trimEnd()}\n`, [ this.ZWSP ], '```');
    }
}

module.exports = FormatterPlugin;
