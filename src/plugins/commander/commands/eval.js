const path = require('path');
const util = require('util');
const child_process = require('child_process');
const got = require('got');
const acorn = require('acorn');
const escodegen = require('escodegen');
const { parse, HTMLElement, TextNode } = require('node-html-parser');
const {
    BaseManager,
    MessageAttachment,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    SnowflakeUtil
} = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const OPCommand = require('../structs/OPCommand.js');
const FormatterPlugin = require('../../fmt');

const swallow = () => {};

class Inspection {
    constructor({ source, depth }) {
        this.source = source;
        this.depth = depth;
        this.cache = {
            depth: -1,
            text: ''
        };
    }

    inspect(depth) {
        let inspection = util.inspect(this.source, {
            depth: depth,
            compact: false
        });

        // Double the indent, from 2 spaces to 4
        inspection = inspection.replace(/^\s+/gm, '$&$&');

        return inspection;
    }

    shallower() {
        this.depth--;

        return this;
    }

    deeper() {
        this.depth++;

        return this;
    }

    canGoDeeper() {
        const nextInspection = this.inspect(this.depth + 1);

        if (nextInspection.length > 8388269) {
            return false;
        }

        if (nextInspection === this.cache.text) {
            return false;
        }

        this.cache = {
            depth: this.depth + 1,
            text: nextInspection
        };

        return true;
    }

    text() {
        if (this.cache.depth === this.depth) {
            return this.cache.text;
        }

        const inspection = this.inspect(this.depth);

        this.cache = {
            depth: this.depth,
            text: inspection
        };

        return inspection;
    }
}

class Code {
    constructor({ code, isExpression, isAsync }) {
        this.code = code;
        this.isExpression = isExpression;
        this.isAsync = isAsync;
    }
}

class CodeBlock {
    constructor({ code, isFile, ext }) {
        this.code = code;
        this.isFile = isFile;
        this.ext = ext;
    }
}

class EvalCommand extends OPCommand {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['eval'];
        this.schema = new SlashCommandBuilder()
            .addStringOption(option =>
                option.setName('code')
                    .setDescription('The code to evaluate')
                    .setRequired(true)
            );

        this.hidden = true;
        this.shortdesc = `Evaluates a piece of code.`;
        this.desc = `
                    Runs JavaScript in a non-sandboxed environment, and returns the value.
                    If you use a code block, it will get stripped out before evaluation.
                    You need to be a bot operator to use this command.`;
        this.usages = [
            '!eval <code>'
        ];
        this.examples = [
            '!eval send("Hello, world!")',
            '!eval 2 + 2 * 2 ** 2',
            '!eval ```js\nawait message.react("🤔");```'
        ];

        this.ignoredObjects = [];

        // Internal require cache for our custom-loader for dynamic npm installs
        this.stupidRequireCache = new Map();
    }

    // 8mb = 8388269, message limit = 2000
    inspect(object, depth = 3) {
        return new Inspection({
            depth,
            source: object
        });
    }

    require(channel, name) {
        // Accomodate our stupid cache
        if (this.stupidRequireCache.has(name)) {
            return this.stupidRequireCache.get(name);
        }

        try {
            return require(name);
        } catch(e) {
            // This is a HACK to essentially send a message on another thread
            // I use curl because I can't be assed to spawn a small js file to post with got
            // I tried to make this look as pretty as possible
            const url = `https://discord.com/api/v9/channels/${channel.id}/messages`;
            const body = JSON.stringify({
                content: `Dynamically loading ${name}...`
            });
            const headers = [
                ['Content-Type', 'application/json'],
                ['Authorization', `Bot ${this.bot.client.token}`]
            ].map(([k, v]) => `-H "${k}: ${v}"`).join(' ');

            // curl will start on another thread, and npm install with block this thread
            child_process.exec(`curl --data '${body}' ${headers} ${url}`);

            // got.post(url, {
            //     body,
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bot ${this.bot.client.token}`
            //     }
            // });
            child_process.execSync(`npm install ${name}`);

            // Try to clear require cache
            try {
                delete require.cache[require.resolve(name)];
            } catch(e) {}

            try {
                return require(name);
            } catch(e) {
                // HACK: Try to perform npm's script resolution ourselves
                // Some packages fail to dynamically load
                // I have no idea why.
                // The cache has nothing to do with it
                // Let's just hope this works for the ones that fail

                const node_modules = path.join(process.cwd(), 'node_modules');
                const packagePath = path.join(node_modules, name);
                const packageJsonPath = path.join(packagePath, 'package.json');

                let packageJson;
                try {
                    packageJson = require(packageJsonPath);
                } catch(_) {
                    // Error in our bootleg custom loading, rethrow original err
                    throw e;
                }

                const relativeMainPath = packageJson.main || 'index.js';
                const mainPath = path.join(packagePath, relativeMainPath);

                try {
                    const mod = require(mainPath);

                    // Set the module in our require cache
                    // So next time loading it won't send the
                    // "Dynamically loading X..." message
                    // It happens because the native `require(name)` call
                    // throws an error, which is what we're addressing here
                    this.stupidRequireCache.set(name, mod);

                    return mod;
                } catch(_) {
                    // Error in our bootleg custom loading, rethrow original err
                    throw e;
                }
            }
        }
    }

    patchManagerClasses() {
        BaseManager.prototype.get = function(key) {
            return this.cache.get(key);
        };
    }

    unpatchManagerClasses() {
        delete BaseManager.prototype.get;
    }

    beforeEval(context) {
        // `with` throws an error, so, pollute the global with bindings
        for (const key in context) {
            global[key] = context[key];
        }

        this.patchManagerClasses();
    }

    afterEval(context) {
        // Clean up the global
        for (const key in context) {
            delete global[key];
        }

        this.unpatchManagerClasses();
    }

    async getCode(message, content) {
        if (message.attachments.size !== 0) {
            const file = message.attachments.first();
            const ext = file.name.split('.').pop();

            if (ext === 'js' || ext === 'txt') {
                const code = await got(file.url).text();

                return new Code({
                    code,
                    isExpression: false,
                    isAsync: false
                });
            }
        }

        let code = content;

        // Strip code block
        if (code.startsWith('```') && code.endsWith('```')) {
            code = code.slice(3, -3);

            // If js or javascript was one of the first lines, strip it
            const firstLine = code.split('\n', 1)[0];
            if (['js', 'javascript'].includes(firstLine)) {
                code = code.replace(/^.+/, '');
            }
        }

        // Strip any leading semicolons, this shouldn't break anything
        code = code.trim().replace(/;+$/g, '').trim();

        // // Transform `v.await`s to `(await v)`
        // let postfixMatch;
        // while ((postfixMatch = code.match(/\.await\b/)) !== null) {
        //     // Try to find the start of the expression
        //     // We do this by backtracking to the first semicolon
        //     // or the start of the string
        //     // In the future this could be better
        //     // by filtering out semicolons inside strings

        //     // Warning: some real fuckin ugly index code ahead
        //     const lastSemi = code.lastIndexOf(';', postfixMatch.index);

        //     // This branch is completely unnecessary but I like it here
        //     if (lastSemi === -1) {
        //         code = `(await ` + code.slice(0, postfixMatch.index) + ')'
        //             + code.slice(postfixMatch.index + postfixMatch[0].length);
        //     } else {
        //         code = code.slice(0, lastSemi + 1) + `(await `
        //             + code.slice(lastSemi + 1, postfixMatch.index) + ')'
        //             + code.slice(postfixMatch.index + postfixMatch[0].length);
        //     }
        // }

        // TODO: Do the greatest regex trick for these
        const isAsync = code.includes('await');
        const isExpression = !code.includes(';') &&
            !/\b(if|while|for|try|const|let)\b/.test(code);

        if (isAsync) {
            code = `(async () => {\n` +
            `    ${isExpression ? 'return ' : ''}${code};\n` +
            `})()`;
        }

        code = this.postfixAwaitTransform(code);

        return new Code({
            code,
            isExpression,
            isAsync
        });
    }

    postfixAwaitTransform(code) {
        let tree;
        try {
            tree = acorn.parse(code, {
                ecmaVersion: 2021
            });
        } catch(e) {
            return code;
        }

        function handleNode(node) {
            if (!node) return;

            switch (node.type) {
                case 'Program':
                case 'ArrowFunctionExpression':
                case 'BlockStatement':
                    if (Array.isArray(node.body)) {
                        node.body.forEach(handleNode);
                    } else {
                        handleNode(node.body);
                    }
                    break;
                case 'VariableDeclaration':
                    node.declarations.forEach(handleNode);
                    break;
                case 'VariableDeclarator':
                    handleNode(node.id);
                    handleNode(node.init);
                    break;
                case 'ArrayExpression':
                    node.elements.forEach(handleNode);
                    break;
                case 'ObjectExpression':
                    node.properties.forEach(handleNode);
                    break;
                case 'Property':
                    handleNode(node.key);
                    handleNode(node.value);
                    break;
                case 'ExpressionStatement':
                    handleNode(node.expression);
                    break;
                case 'WhileStatement':
                    handleNode(node.test);
                    handleNode(node.body);
                    break;
                case 'CallExpression':
                    handleNode(node.callee);
                    node.arguments.forEach(handleNode);
                    break;
                case 'AwaitExpression':
                case 'UpdateExpression':
                case 'ReturnStatement':
                    handleNode(node.argument);
                    break;
                case 'BinaryExpression':
                    handleNode(node.left);
                    handleNode(node.right);
                    break;
                case 'SpreadElement':
                    handleNode(node.argument);
                    break;
                case 'MemberExpression':
                    const prop = node.property;
                    if (prop && prop.type === 'Identifier' && prop.name === 'await') {
                        // Do the .await transformation
                        node.type = 'AwaitExpression';
                        node.argument = node.object;
                        delete node.object;
                        delete node.property;
                        delete node.optional;
                        delete node.computed;

                        handleNode(node.argument);
                    } else {
                        handleNode(node.object);
                        handleNode(node.property);
                    }
                    break;
                case 'Identifier':
                case 'Literal':
                case 'EmptyStatement':
                    break;
                default:
                    console.warn(`Unhandled acorn node type: ${node.type}`, node);
                    break;
            }
        }

        handleNode(tree);

        try {
            return escodegen.generate(tree);
        } catch(e) {
            return code;
        }
    }

    getVars(message, content) {
        return {
            send: (arg) => {
                if (
                    arg &&
                    (arg.embed || arg.embeds || arg.file || arg.files || arg instanceof MessageEmbed)
                ) {
                    if (arg instanceof MessageEmbed) {
                        arg = {
                            embeds: [
                                arg
                            ]
                        };
                    }

                    if (arg.embed) {
                        arg.embeds = [arg.embed];
                        delete arg.embed;
                    }

                    if (arg.file) {
                        arg.files = [arg.file];
                        delete arg.file;
                    }

                    const promise = message.channel.send(arg);

                    this.ignoredObjects.push(promise);
                    promise.then(message => this.ignoredObjects.push(message));

                    return promise;
                }

                const promise = this.respond(arg, {
                    message: message,
                    channel: message.channel
                });

                this.ignoredObjects.push(promise);
                promise.then(message => this.ignoredObjects.push(message));

                return promise;
            },

            // Bot and plugin related stuff
            bot: this.bot,
            commander: this.bot.commander,
            fmt: this.bot.fmt,
            db: this.bot.db,

            // Client stuff
            client: this.bot.client,
            guilds: this.bot.client.guilds,
            channels: this.bot.client.channels,
            users: this.bot.client.users,
            // members: this.bot.client.members,

            // Context related stuff
            content: content,
            message: message,
            channel: message.channel,
            member: message.member,
            author: message.author,
            user: message.author,
            guild: message.guild,

            // Discord.js structures
            Attachment: MessageAttachment,
            MessageAttachment: MessageAttachment,
            Embed: MessageEmbed,
            MessageEmbed: MessageEmbed,
            MessageActionRow: MessageActionRow,
            MessageButton: MessageButton,

            Snowflake: SnowflakeUtil,
            SnowflakeUtil: SnowflakeUtil,

            // Module stuff
            fs: {
                ...require('fs'),
                ...require('fs/promises')
            },
            got: got,
            path: path,
            util: util,
            Discord: require('discord.js'),

            // For detecting command file evals
            module: {
                exports: null
            }
        };
    }

    getCustomRequire(context) {
        const customRequire = this.require.bind(this, context.message.channel);
        customRequire.resolve = require.resolve;
        customRequire.main = require.main;
        customRequire.cache = require.cache;
        // Deprecated:
        // customRequire.extensions = require.extensions;

        return customRequire;
    }

    async evaluate(code, context) {
        this.beforeEval(context);

        const require = this.getCustomRequire(context);
        const module = context.module;
        swallow(require, module);

        let result;
        try {
            result = eval(code.code);

            if (code.isAsync) {
                result = await result;
            }
        } catch(e) {
            result = new Error('');
            result.inner = e;
        }

        // In an ideal world, afterEval would be here
        // But we do not live in an ideal world
        // Promises created here are not awaited here
        // So it's instead called after this.respond in this.call
        // this.afterEval(context);

        // Wrap in an object so `await`ing doesn't automatically unwrap it
        // Inner promises should be preserved
        return {
            result
        };
    }

    indent(tabs) {
        return new Array(tabs + 1).join('    ');
    }

    formatHTMLTag(element, indent) {
        const { childNodes, rawTagName } = element;

        if (rawTagName === null) {
            // Root node, flatten children
            let content = '';
            for (const node of childNodes) {
                if (node instanceof TextNode) {
                    content += `\n${this.indent(indent)}"${node.text}"`;
                } else if (node instanceof HTMLElement) {
                    content += `\n${this.indent(indent)}${this.formatHTMLTag(node, indent)}`;
                }
            }

            // Remove initial newline
            return content.slice(1);
        }

        let tag = `<${rawTagName}`;
        if (element.rawAttrs) {
            tag += ` ${element.rawAttrs}`;
        }

        if (childNodes.length === 0) {
            tag += ' />';

            return tag;
        } else {
            tag += '>';
        }

        let content = '';

        if (childNodes.length === 1 && childNodes[0] instanceof TextNode) {
            // Single text node, <span>hello</span>
            content = childNodes[0].text.trim();
        } else {
            for (const node of childNodes) {
                if (node instanceof TextNode) {
                    content += `\n${this.indent(indent + 1)}"${node.text}"`;
                } else if (node instanceof HTMLElement) {
                    content += `\n${this.indent(indent + 1)}${this.formatHTMLTag(node, indent + 1)}`;
                }
            }

            content += `\n${this.indent(indent)}`;
        }

        const closingTag = `</${rawTagName}>`;

        return `${tag}${content}${closingTag}`;
    }

    formatHTMLDocument(document) {
        return this.formatHTMLTag(document, 0);
    }

    predictExtensionAndFormat(text) {
        if (text.charAt(0) === '<') {
            let document;
            try {
                document = parse(text);
            } catch(e) {
                // fallthrough
                console.error(e);
            }

            if (document !== undefined) {
                return {
                    ext: 'html',
                    formatted: this.formatHTMLDocument(document)
                };
            }
        }

        if (text.charAt(0) === '{') {
            try {
                const object = JSON.parse(text);

                return {
                    ext: 'json',
                    formatted: JSON.stringify(object, null, 4)
                };
            } catch(e) {
                // fallthrough
            }
        }

        return {
            ext: 'txt',
            formatted: text
        };
    }

    cleanContents(contents, lang) {
        if (lang === 'js' || lang === 'javascript') {
            // <ref *n> breaks js syntax highlighting with highlight.js
            // It breaks it in key: <ref *n> [something] contexts and
            // Promise {
            //     <ref *n> [something]
            // }
            // contexts
            // Fix it by replacing it with &ref at the start of lines with ws
            // and after colons

            // Capturing group 1: colon/arrow and ws, or start of line ws
            // Capturing group 2: reference number

            // Format 1: $1<&ref $2>
            // Format 2: $1<ref $2 />

            // Format 1 makes more sense as & is common for refs
            // But format 2 has some syntax highlighting because of JSX
            return contents.replace(/(^\s*|:\s*|=>\s*)<ref \*(\d+)>/gm, '$1<ref $2 />');
        }

        return contents;
    }

    getCodeBlock(string, lang) {
        let predicted;
        if (lang === undefined) {
            predicted = this.predictExtensionAndFormat(string);
        }

        const ext = lang || predicted.ext;
        const formatted = predicted ? predicted.formatted : string;

        const cleaned = this.cleanContents(formatted, lang);

        const codeBlock = lang === undefined && ext === 'txt'
            ? string
            : this.bot.fmt.codeBlock(ext,
                cleaned
            );

        if (codeBlock.length >= 2000) {
            return new CodeBlock({
                code: cleaned,
                isFile: true,
                ext: ext
            });
        } else {
            return new CodeBlock({
                code: codeBlock,
                isFile: false,
                ext: ext
            });
        }
    }

    sendCodeBlock(channel, codeBlock) {
        if (codeBlock.isFile) {
            return channel.send({
                files: [
                    new MessageAttachment(
                        Buffer.from(codeBlock.code, 'utf8'),
                        `eval.${codeBlock.ext}`
                    )
                ]
            });
        } else {
            return channel.send(codeBlock.code);
        }
    }

    sendExpand(channel, string, lang) {
        const codeBlock = this.getCodeBlock(string, lang);

        return this.sendCodeBlock(channel, codeBlock);
    }

    async respond(result, context, code) {
        const { channel, message: originalMessage } = context;

        if (result === null) {
            return channel.send('null');
        }

        if (Number.isNaN(result)) {
            return channel.send('NaN');
        }

        if (typeof result === 'undefined') {
            // Do not send undefined results for
            // async payloads that are longer than one expression
            if (code && code.isAsync && !code.isExpression) return;

            return channel.send('undefined');
        }

        if (this.ignoredObjects.includes(result)) {
            return;
        }

        if (typeof result === 'bigint') {
            return this.sendExpand(channel, `${result}n`);
        }

        if (typeof result === 'string') {
            // Send smol code block with "" for empty strings
            if (result === '') {
                return this.sendExpand(channel, `""`, 'js')
            } else {
                return this.sendExpand(channel, result);
            }
        }

        if (['symbol', 'number', 'boolean'].includes(typeof result)) {
            return this.sendExpand(channel, String(result));
        }

        if (typeof result === 'function') {
            const stringified = result.toString();
            const lastLine = stringified.slice(stringified.lastIndexOf('\n') + 1);
            const indent = lastLine.match(/^\s*/)[0];
            let indented = indent + stringified;

            if (indented.split('\n').every(line => line.trim() === '' || line.slice(0, indent.length) === indent)) {
                indented = indented.split('\n')
                    .map(line => line.slice(indent.length))
                    .join('\n');
            }

            return this.sendExpand(channel, indented, 'js');
        }

        if (result instanceof Error) {
            const inspection = this.inspect(result);

            return this.sendExpand(channel, inspection.text(), 'apache');
        }

        if (result instanceof Date) {
            return channel.send(result.toUTCString());
        }

        if (result instanceof MessageEmbed) {
            return channel.send({
                embeds: [result]
            });
        }

        if (result instanceof Promise) {
            // Inspect the (possibly) pending promise
            // Send it immediately and store the temp message
            const pendingInspection = this.inspect(result);
            const pendingMessage = await this.sendExpand(channel, pendingInspection.text(), 'js');
            const pendingString = 'Promise {\n    <pending>\n}';

            if (pendingInspection.text() !== pendingString) {
                // Promise wasn't actually pending afterall
                // It's resolved or rejected
                // So! We can early return here
                return pendingMessage;
            }

            // Failure in this stage is not a problem
            // Errors will still be reported back in the 2nd inspection
            try {
                await result;

                // We used to await here and not post if resolved with undef
                // Not anymore, we post pending messages
                //
                // if (value === undefined) {
                //     // Exception for promises; undefined is not echoed
                //     return;
                // }
            } catch(e) {}

            // Respond with the inspection of the settled promise
            // So it's explicit that the value is a promise,
            // and also show the inner value of the resolved (or failed) promise
            const inspection = this.inspect(result);
            const codeBlock = this.getCodeBlock(inspection.text(), 'js');

            if (codeBlock.isFile) {
                const [message] = await Promise.all([
                    this.sendExpand(channel, codeBlock.code, 'js'),
                    pendingMessage.delete()
                ]);

                return message;
            } else {
                return pendingMessage.edit(codeBlock.code);
            }
        }

        if (typeof result === 'object') {
            const inspection = this.inspect(result);
            const message = await this.sendExpand(channel, inspection.text(), 'js');

            this.expandReactions(message, inspection, originalMessage);

            return message;
        }
    }

    async expandReactions(message, inspection, originalMessage) {
        if (!inspection.canGoDeeper()) return;

        let botReaction = await message.react('👁️');

        while (true) {
            const reactions = await message.awaitReactions({
                filter: (reaction, user) =>
                    reaction.emoji.name === botReaction.emoji.name &&
                    user.id === originalMessage.author.id,
                max: 1,
                time: 30000
            });

            if (reactions.size === 0) {
                try {
                    await Promise.all([
                        // Try to remove all reactions
                        // message.reactions.removeAll(),
                        // Remove own reaction
                        botReaction.users.remove()
                    ]);
                } catch(e) {}
                break;
            }

            switch (reactions.first().emoji.name) {
                case '👁️':

                    const codeBlock = this.getCodeBlock(inspection.deeper().text(), 'js');

                    const promises = [];

                    if (codeBlock.isFile) {
                        const [newMessage] = await Promise.all([
                            this.sendExpand(message.channel, codeBlock.code, 'js'),
                            message.delete()
                        ]);


                        message = newMessage;
                    } else {
                        promises.push(reactions.first().users.remove(originalMessage.author));
                        promises.push(message.edit(codeBlock.code));

                        try {
                            await reactionRemovePromise;
                        } catch(e) {}
                    }

                    if (!inspection.canGoDeeper()) {
                        promises.push(botReaction.users.remove());

                        try {
                            await Promise.all(promises);
                        } catch(e) {}
                        return;
                    }

                    if (codeBlock.isFile) {
                        botReaction = await message.react('👁️');
                    }

                    try {
                        await Promise.all(promises);
                    } catch(e) {}

                    break;
            }
        }
    }

    async call(message, content) {
        const code = await this.getCode(message, content);
        const context = this.getVars(message, content);
        const { result } = await this.evaluate(code, context);

        if (result && result instanceof Error && result.inner) {
            await message.channel.send(
                this.bot.fmt.codeBlock('apache', `${result.inner}`)
            );
        } else {
            await this.respond(result, context, code);
        }

        const exported = context.module.exports;

        try {
            let proto = exported;
            while (true) {
                proto = Object.getPrototypeOf(proto);

                if (proto === null) {
                    break;
                }

                if (proto === Command) {
                    this.bot.commander.loadCommand(exported, exported.name);

                    await message.channel.send(`Registered a new command: ${exported.name}`);
                }
            }
        } catch(e) {}

        this.afterEval();
    }
}

module.exports = EvalCommand;
