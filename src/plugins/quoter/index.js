const Plugin = require('../../structs/Plugin.js');
const FormatterPlugin = require('../fmt');

class QuoterPlugin extends Plugin {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    load() {
        this.bot.quoter = new Quoter(this.bot);
    }
}

class Quoter {
    constructor(bot) {
        Object.defineProperty(this, 'bot', { value: bot });
        Object.defineProperty(this, 'config', { value: bot.config.QUOTER });

        this.QUOTE_PATTERN = /(?<!<)https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(@me|\d+)\/(\d+)\/(\d+)(?!>)/g;
        bot.listen('messageCreate', this.onMessage, this);
    }

    matchQuotes(text) {
        const matches = [];
        const regex = this.QUOTE_PATTERN;
        let m;

        regex.lastIndex = 0;

        while ((m = regex.exec(text)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            matches.push(m);
        }

        return matches;
    }

    async onMessage(message) {
        // Ignore bots and self
        if (
            message.author.bot ||
            message.author.id == this.bot.client.user.id
        ) return;

        // Ignore in dev mode if outside of dev guild
        if (this.bot.onlyDev(message.guild)) return;

        if (this.bot.commander) {
            const executed = await this.bot.commander.onMessage(message);

            if (executed) {
                return;
            }
        }

        const quotes = this.matchQuotes(message.content);
        if (!quotes.length) return;

        const messages = await Promise.all(
            quotes
                .slice(0, this.config.MAX)
                .map(this.tryFetchQuote.bind(this))
        );
        const filtered = messages.filter(quote => quote !== null);
        if (filtered.length === 0) return;

        const shouldDelete = message.reference === null
            && quotes.length <= this.config.MAX
            && message.content.replace(this.QUOTE_PATTERN, '').trim() === '';

        const embeds = filtered
            .map((quote, i) => this.buildQuoteEmbed(message, quote, i === 0))
            .filter(Boolean)
        await message.channel.send({
            embeds
        });

        if (shouldDelete) {
            try {
                await message.delete();
            } catch(e) {
                // Swallow
            }
        }
    }

    async tryFetchQuote([_, guildId, channelId, messageId]) {
        if (guildId === '@me') return null;

        try {
            const channel = await this.bot.client.channels.fetch(channelId);
            if (!channel) return null;

            const messages = await channel.messages.fetch({ limit: 1, around: messageId });
            if (!messages.size) return null;

            const message = messages.first();
            if (message.id != messageId) return null;

            return message;
        } catch(e) {
            return null;
        }
    }

    buildQuoteEmbed(message, quote, includeQuoter) {
        const sameChannel = message.channel.id === quote.channel.id;
        const sameGuild = message.guild.id === quote.guild.id;
        let text = quote.member && quote.member.nickname || quote.author.username

        if (!sameChannel) {
            if (sameGuild) {
                text += ` @ #${quote.channel.name}`;
            } else {
                text += ` @ ${quote.guild.name}#${quote.channel.name}`;
            }
        }

        let description = this.bot.fmt.bold(this.bot.fmt.link('Click to jump', `https://discord.com/channels/${quote.guild.id}/${quote.channel.id}/${quote.id}`));

        if (quote.content) {
            description += '\n\n' + quote.content;
        } else if (quote.embeds.length) {
            description += '\n\n' + this.stringifyEmbed(quote.embeds[0]);
        }

        if (description.length > 2048) return null;

        const image = quote.attachments.size
            ? quote.attachments.first()
            : quote.embeds[0] && quote.embeds[0].image;

        const author = includeQuoter
            ? {
                icon_url: message.author.displayAvatarURL(),
                name: `Quoted by ${message.author.username}#${message.author.discriminator}`
            }
            : undefined;

        return {
            author,
            // title: 'Click to jump',
            // url: `https://discord.com/channels/${quote.guild.id}/${quote.channel.id}/${quote.id}`,
            description,
            image: image || undefined,
            footer: {
                icon_url: quote.author.displayAvatarURL(),
                text
            },
            timestamp: quote.createdAt.toISOString()
        };
    }

    stringifyEmbed({
        provider,
        author,
        title,
        url,
        description,
        fields,
        footer,
        timestamp
    }) {
        const sections = new Array(4).fill(null).map(() => []);

        if (provider) {
            sections[0].push(provider.name);
        }

        if (author && author.name) {
            const name = author.url
                ? `[${author.name}](${author.url})`
                : `${author.name}`;

            sections[0].push(`${name}`);
        }

        if (title) {
            let str = url
                ? `[${title}](${url})`
                : `${title}`;

            sections[0].push(str);
        }

        if (description) {
            sections[0].push(`${description}`);
        }

        if (fields.length) {
            for (const field of fields) {
                sections[1].push(`${field.name}:`);
                sections[1].push(field.value.split('\n').map(line => `  ${line}`).join('\n'));
            }
        }

        if (footer) {
            if (timestamp) {
                sections[3].push(`${footer.text} • <t:${Math.floor(new Date(timestamp).getTime() / 1000)}:f>`);
            } else {
                sections[3].push(`${footer.text}`);
            }
        }

        return sections
            .filter(section => section.length)
            .map(section => section.join('\n'))
            .join('\n\n');
    }
}

module.exports = QuoterPlugin;