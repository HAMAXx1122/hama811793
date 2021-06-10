const config = require("../config");
const Discord = require("discord.js");
let cooldown = new Set();
let cseconds = "2";
module.exports = class {

    constructor (client) {
        this.client = client;
    }

    async run (message) {

        const data = { color: this.client.config.color, footer: this.client.config.footer };

        if(!message.guild || message.author.bot) return;

        let guildData = await this.client.findOrCreateGuild({ id: message.guild.id });
        data.guild = guildData;
        message.language = require("../languages/"+data.guild.language);
        
        const embeded = new Discord.MessageEmbed()
        .setColor(this.client.config.color)
        .setDescription(message.language.utils.prefix(data.guild.prefix))
        .setFooter(this.client.config.footer)

        if(message.content.match(new RegExp(`^<@!?${this.client.user.id}>( |)$`))) return message.channel.send(embeded);

        let memberData = await this.client.findOrCreateGuildMember({ id: message.author.id, guildID: message.guild.id, bot: message.author.bot });
        data.member = memberData;

        // If the message does not start with the prefix, cancel
        if(!message.content.toLowerCase().startsWith(guildData.prefix)){
               memberData.messagesCount = memberData.messagesCount + 1;
            memberData.markModified("messagesCount");
            await memberData.save();

            return;
        }

        if (cooldown.has(message.author.id)){
            message.delete();
            const spam_embed = new Discord.MessageEmbed()
            .setColor(this.client.config.color)
            .setDescription(message.language.antispam.cooldown())
            .setFooter(this.client.config.footer)
            return message.channel.send(spam_embed)
           }
           cooldown.add(message.author.id);
        
            setTimeout(() => {
            cooldown.delete(message.author.id)
          }, cseconds * 1000)

        // If the message content is "/pay @Androz 10", the args will be : [ "pay", "@Androz", "10" ]
        const args = message.content.slice(guildData.prefix.length).trim().split(/ +/g);
        // The command will be : "pay" and the args : [ "@Androz", "10" ]
        const command = args.shift().toLowerCase();

        // Gets the command
        const cmd = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command));

        // If no command found, return;
        if(!cmd) return;
        else message.cmd = cmd;

        /* Client permissions */
        const neededPermissions = [];
        cmd.conf.clientPermissions.forEach((permission) => {
            if(!message.channel.permissionsFor(message.guild.me).has(permission)) {
                neededPermissions.push(permission);
            }
        });
        if(neededPermissions.length > 0) {
            return message.channel.send(message.language.errors.missingPerms(neededPermissions));
        }

        /* Command disabled */
        if(!cmd.conf.enabled){
            return message.channel.send(message.language.errors.disabled());
        }

        /* User permissions */
        const permLevel = await this.client.getLevel(message);
        if(permLevel < cmd.conf.permLevel){
            return message.channel.send(message.language.errors.permLevel(this.client.permLevels[cmd.conf.permLevel].name));
        }

        this.client.logger.log(`${message.author.username} (${message.author.id}) ran command ${cmd.help.name}`, "cmd");

        // If the command exists, **AND** the user has permission, run it.
        cmd.run(message, args, data);

    }

};
