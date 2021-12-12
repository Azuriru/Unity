const { MessageAttachment, MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Command = require('../structs/Command.js');

class AvatarCommand extends Command {
    constructor(bot) {
        super(bot);
        this.aliases = ['avatar', 'avi', 'a'];
        this.schema = new SlashCommandBuilder()
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('The user you want to get the avatar of')
            );

        this.shortdesc = `Gives you an avatar`;
        this.desc = `Uploads a copy of your, or someone else's, avatar`;
        this.usages = [
            '!avatar',
            '!a @Doru',
            '!a 155545848812535808'
        ];
    }

    getExtension(avatarHash) {
        return avatarHash.startsWith('a_') ? 'gif' : 'png';
    }

    getAvatarURL(user) {
        const avatarHash = user.avatar;
        const ext = this.getExtension(avatarHash);
        const url = `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.${ext}?size=2048`;

        return url;
    }

    getAvatar(user) {
        const avatarHash = user.avatar;
        const ext = this.getExtension(avatarHash);
        const url = this.getAvatarURL(user);

        return new MessageAttachment(url, `avatar.${ext}`);
    }

    async call(message, content) {
        let user = message.mentions.users.first();

        if (!user) {
            const id = content.match(/\d{8,}/);

            if (id) {
                user = this.bot.client.users.cache.get(id[0]);
            }
        }

        if (!user) {
            user = message.author;
        }

        const member = message.guild && message.guild.members.cache.get(user.id);
        const nick = member && member.nickname || user.username;

        try {
            await message.channel.send({
                content: `${nick}'s avatar`,
                files: [
                    this.getAvatar(user)
                ]
            });
        } catch(e) {
            await message.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`${nick}'s avatar`)
                        .setImage(this.getAvatarURL(user))
                ]
            });
        }
    }
}

module.exports = AvatarCommand;
