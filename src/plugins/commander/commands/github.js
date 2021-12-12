const os = require('os');
const fs = require('fs');
const got = require('got');
const path = require('path');
const process = require('process');
const readdir = require('recursive-readdir');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');
const Cache = require('../../../structs/Cache.js');
const FormatterPlugin = require('../../fmt');
const {promisify} = require('util');
const wait = promisify(setTimeout);

class GitHubCommand extends Command {
    static get deps() {
        return [
            FormatterPlugin
        ];
    }

    constructor(bot) {
        super(bot);
        this.aliases = ['github', 'git', 'repo', 'source', 'status'];
        this.schema = new SlashCommandBuilder();

        this.shortdesc = 'Shows statistics and a link to the bot repository.';
        this.desc = `
                    Displays info about the bot.
                    Shows statistics like stargazers, watchers, open issues, CPU usage, RAM, and lines of code.`;
        this.usages = [
            '!code'
        ];
        this.cache = new Cache();
    }

    fetchOperators() {
        return Promise.all(
            this.bot.operators
                .map(id => this.bot.client.users.fetch(id))
        );
    }

    async call(message) {
        const [
            lines,
            info,
            cpu,
            ram
        ] = await Promise.all([
            this.cache.get('lines', () => this.countBotLines()),
            this.cache.get('info', () => this.getRepoInfo()),
            this.getCPUUsage(),
            this.getRAMInfo()
        ]);

        const fields = [];

        if (lines) {
            fields.push({
                name: 'Lines of code',
                value: String(lines),
                inline: true,
            });
        }

        fields.push({
            name: 'CPU usage',
            value: `${(100 - cpu * 100).toFixed(2)}%`,
            inline: true
        });

        fields.push({
            name: 'RAM',
            value: `${this.formatSize(ram.proc, 2)}/${this.formatSize(ram.total)}`,
            inline: true
        });

        fields.push({
            name: 'Operators',
            value: (await this.fetchOperators())
                .map(user => `${user.username}`)
                .join('\n'),
            inline: true,
        });

        if (info.watchers) {
            fields.push({
                name: 'Watchers',
                value: String(info.watchers),
                inline: true,
            });
        }

        if (info.stars) {
            fields.push({
                name: 'Stargazers',
                value: String(info.stars),
                inline: true,
            });
        }

        if (info.issues) {
            fields.push({
                name: 'Open issues',
                value: String(info.issues),
                inline: true,
            });
        }

        if (info.forks) {
            fields.push({
                name: 'Forks',
                value: String(info.forks),
                inline: true,
            });
        }

        const commitMessage = this.bot.fmt.firstLine(info.lastCommit.message);
        const pullId = commitMessage.match(/#(\d+)/);
        const updateUrl = pullId
            ? `${info.url}/pull/${pullId[1]}`
            : `${info.url}/commit/${info.lastCommit.sha}`;

        return message.channel.send({
            embeds: [{
                author: {
                    name: info.path,
                    url: updateUrl,
                },
                url: info.url,
                title: `Click here to view source code on ${info.sitename}`,
                color: message.guild && message.guild.me.displayColor,
                timestamp: info.lastPush.toISOString(),
                fields,
                footer: {
                    text: `${commitMessage} - ${info.lastCommit.author.name}`,
                    icon_url: info.lastCommit.author.icon
                }
            }]
        });
    }

    climb(p, count) {
        while (count--) {
            p = path.dirname(p);
        }
        return p;
    }

    countBotLines() {
        const botPath = this.climb(__dirname, 3);
        return this.countLines(botPath);
    }

    async countLines(dirPath) {
        const files = await readdir(dirPath, ['.git', 'node_modules']);
        const lineCounts = await Promise.all(
            files.map(filePath => {
                return new Promise((res, rej) => {
                    fs.readFile(filePath, (err, contents) => {
                        if (err) {
                            rej(err);
                            return;
                        }

                        const match = contents.toString().match(/\n/g);

                        res(match ? match.length + 1 : 1);
                    })
                });
            })
        );

        return lineCounts.reduce((sum, count) => sum + count, 0);
    }

    async getRepoInfo() {
        const { TYPE, PATH } = this.bot.config.SOURCE;
        const data = {
            // The website used's name
            sitename: null,
            // Date object for last push event
            lastPush: null,
            // Last commit object, with fields { message, author }
            lastCommit: null,
            // Repository name
            name: null,
            // Path to the repo without host
            path: null,
            // Path to the repo with host
            url: null,
            // Main repository branch
            branch: null,
            // Number of stargazers
            stars: null,
            // Number of subscribers
            watchers: null,
            // Number of open issues
            issues: null,
            // Number of forks
            forks: null,
            // Repo image or owner avatar
            icon: null,
        };

        switch (TYPE) {
            case 'github':
                const [
                    repo,
                    commits
                ] = await Promise.all([
                    got(`https://api.github.com/repos/${PATH}`, {
                        headers: {
                            'User-Agent': PATH
                        }
                    }).json(),
                    got(`https://api.github.com/repos/${PATH}/commits`, {
                        headers: {
                            'User-Agent': PATH
                        }
                    }).json()
                ]);

                data.sitename = 'GitHub';

                data.lastPush = new Date(repo.pushed_at);
                data.name = repo.name;
                data.path = repo.full_name;
                data.url = repo.html_url;
                data.branch = repo.default_branch;
                data.stars = repo.stargazers_count;
                data.watchers = repo.subscribers_count;
                data.issues = repo.open_issues_count;
                data.forks = repo.forks;
                data.icon = repo.owner.avatar_url;

                const commit = commits[0];
                if (commit) {
                    data.lastCommit = {
                        sha: commit.sha,
                        message: commit.commit.message,
                        author: {
                            name: commit.author.login,
                            icon: commit.author.avatar_url
                        },
                    };
                }

                break;
            default:
                throw new Error('Unsupported git transport');
        }

        return data;
    }

    formatSize(bytes, decimals = 2, include = true) {
        if (bytes === 0) return '0 bytes';

        let k = 1024,
            sizes = [' bytes', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb'],
            i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + (include ? sizes[i] : '')
    }

    async getCPUUsage() {
        let stats1 = this.getCPUInfo();

        await wait(500);

        let stats2 = this.getCPUInfo();

        let idle = stats2.idle - stats1.idle;
        let total = stats2.total - stats1.total;

        return idle / total;
    }

    getCPUInfo() {
        let idle = 0,
        total = 0,
        cpus = os.cpus();

        for (const cpu of cpus) {
            for (const thing in  cpu.times) {
                total += cpu.times[thing];
            }

            idle += cpu.times.idle;
        }

        return {
            idle: idle / cpus.length,
            total: total / cpus.length,
        };
    }

    getRAMInfo() {
        const total = os.totalmem(),
        free = os.freemem(),
        used = total - free,
        percent = used / total * 100,
        proc = process.memoryUsage().rss;

        return {
            total,
            free,
            used,
            percent,
            proc
        };
    }
}

module.exports = GitHubCommand;
