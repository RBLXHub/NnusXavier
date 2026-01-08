/**
 * me.js - A Discord bridge for VMware vSphere and Server Moderation
 * * Dependencies:
 * npm install discord.js axios
 */

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    REST, 
    Routes,
    PermissionFlagsBits,
    Events
} = require('discord.js');
const axios = require('axios');
const http = require('http');

// --- Configuration ---
const DISCORD_TOKEN = 'MTQyNDQ5NTU5NjkyMzkxNjI4OA.GSbT0c.bbjya94V6zdYpT9HHizFfgKgTB928pb9XaZ04Y'; 
const VC_HOST = 'vcenter.example.local';
const VC_USER = 'administrator@vsphere.local';
const VC_PASS = 'your_password';

// --- 24/7 Keep-Alive Server ---
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('VMware Bot status: ACTIVE');
    res.end();
}).listen(PORT, () => {
    console.log(`[SYSTEM] Keep-alive server listening on port ${PORT}`);
});

// Create Discord Client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ] 
});

// --- Stability Guards (Crucial for 24/7 operation) ---
process.on('unhandledRejection', error => {
    console.error('[STABILITY] Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('[STABILITY] Uncaught Exception:', error);
});

/**
 * Helper to get a vSphere Session Token
 */
async function getVsphereToken() {
    try {
        const auth = Buffer.from(`${VC_USER}:${VC_PASS}`).toString('base64');
        const response = await axios.post(
            `https://${VC_HOST}/api/session`,
            {},
            {
                headers: { 'Authorization': `Basic ${auth}` },
                timeout: 5000, 
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            }
        );
        return response.data;
    } catch (error) {
        console.error('[VMWARE] Login Failed:', error.message);
        return null;
    }
}

/**
 * Get VM List
 */
async function getVMs() {
    const token = await getVsphereToken();
    if (!token) return null;

    try {
        const response = await axios.get(`https://${VC_HOST}/api/vcenter/vm`, {
            headers: { 'vmware-api-session-id': token },
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });
        return response.data;
    } catch (error) {
        console.error('[VMWARE] Fetch VMs Failed:', error.message);
        return null;
    }
}

// --- Slash Commands Setup ---
const commands = [
    new SlashCommandBuilder()
        .setName('vm_list')
        .setDescription('List all VMs on the vCenter server'),
    new SlashCommandBuilder()
        .setName('vm_status')
        .setDescription('Check status of a specific VM')
        .addStringOption(opt => opt.setName('name').setDescription('VM Name').setRequired(true)),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('The member to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for kicking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(opt => opt.setName('target').setDescription('The member to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for banning'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeout/Mute a user')
        .addUserOption(opt => opt.setName('target').setDescription('The member to mute').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the mute'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Alias for /mute - Timeout a user')
        .addUserOption(opt => opt.setName('target').setDescription('The member to timeout').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout/mute from a user')
        .addUserOption(opt => opt.setName('target').setDescription('The member to unmute').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(opt => opt.setName('target').setDescription('The member to warn').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
        .setName('fuck')
        .setDescription('Make the bot say FUCK'),
].map(command => command.toJSON());

// --- Bot Logic ---

client.once(Events.ClientReady, async (c) => {
    console.log(`[DISCORD] Bot logged in as ${c.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
        console.log('[DISCORD] Successfully registered slash commands.');
    } catch (error) {
        console.error('[DISCORD] Command registration error:', error);
    }
});

/**
 * AUTO-MODERATION: Word Detection
 */
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    const forbiddenWords = ['fuck']; 
    const content = message.content.toLowerCase();
    const foundWord = forbiddenWords.find(word => content.includes(word));

    if (foundWord) {
        try { 
            await message.delete(); 
        } catch (e) {
            console.error('[MOD] Permission error: Cannot delete message.');
        }
        const warningEmbed = new EmbedBuilder()
            .setTitle('Auto-Moderation: Warning Issued')
            .setDescription(`User ${message.author.tag}, your message contained a forbidden word and was removed.`)
            .setColor(0xFFAA00)
            .addFields({ name: 'Reason', value: 'Prohibited Language Usage' });
        
        return message.channel.send({ content: `<@${message.author.id}>`, embeds: [warningEmbed] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'fuck') {
        return interaction.reply({ content: 'FUCK' });
    }

    if (interaction.commandName === 'kick') {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        try {
            const member = await interaction.guild.members.fetch(user.id);
            const botMember = await interaction.guild.members.fetch(client.user.id);
            if (member.id === interaction.guild.ownerId) return interaction.reply({ content: 'Error: Cannot kick owner.', ephemeral: true });
            if (member.roles.highest.position >= botMember.roles.highest.position) return interaction.reply({ content: 'Error: Target role is higher than or equal to bot role.', ephemeral: true });
            await member.kick(reason);
            return interaction.reply({ content: `Successfully kicked ${user.tag}.` });
        } catch (err) { return interaction.reply({ content: 'Failed to kick member.', ephemeral: true }); }
    }

    if (interaction.commandName === 'ban') {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        try {
            const member = await interaction.guild.members.fetch(user.id);
            const botMember = await interaction.guild.members.fetch(client.user.id);
            if (member.id === interaction.guild.ownerId) return interaction.reply({ content: 'Error: Cannot ban owner.', ephemeral: true });
            if (member.roles.highest.position >= botMember.roles.highest.position) return interaction.reply({ content: 'Error: Target role is higher than or equal to bot role.', ephemeral: true });
            await member.ban({ reason });
            return interaction.reply({ content: `Successfully banned ${user.tag}.` });
        } catch (err) { return interaction.reply({ content: 'Failed to ban member.', ephemeral: true }); }
    }

    if (interaction.commandName === 'mute' || interaction.commandName === 'timeout') {
        const user = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(duration * 60 * 1000, reason);
            return interaction.reply({ content: `Timed out ${user.tag} for ${duration}m. Reason: ${reason}` });
        } catch (err) { return interaction.reply({ content: 'Failed to apply timeout.', ephemeral: true }); }
    }

    if (interaction.commandName === 'unmute') {
        const user = interaction.options.getUser('target');
        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.timeout(null);
            return interaction.reply({ content: `Unmuted ${user.tag}.` });
        } catch (err) { return interaction.reply({ content: 'Failed to unmute.', ephemeral: true }); }
    }

    if (interaction.commandName === 'warn') {
        const user = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');
        return interaction.reply({ content: `Warning for ${user.tag}: ${reason}` });
    }

    if (interaction.commandName === 'purge') {
        const amount = interaction.options.getInteger('amount');
        if (amount < 1 || amount > 100) return interaction.reply({ content: 'Amount must be between 1 and 100.', ephemeral: true });
        
        await interaction.reply({ content: `Purging ${amount} messages in 3s...`, ephemeral: true });
        
        let countdown = 3;
        const interval = setInterval(async () => {
            countdown--;
            if (countdown > 0) {
                try { await interaction.editReply(`Purging ${amount} messages in ${countdown}s...`); } catch(e){}
            } else {
                clearInterval(interval);
                try {
                    const msgs = await interaction.channel.bulkDelete(amount, true);
                    await interaction.editReply(`Successfully purged ${msgs.size} messages.`);
                } catch (error) { 
                    await interaction.editReply('Failed to purge messages. (Messages older than 14 days cannot be bulk deleted)'); 
                }
            }
        }, 1000);
        return;
    }

    // VMware Operations
    await interaction.deferReply();
    if (interaction.commandName === 'vm_list') {
        const vms = await getVMs();
        if (!vms) return interaction.editReply('vCenter Connection Error.');
        const embed = new EmbedBuilder()
            .setTitle('VMware Virtual Machines')
            .setColor(0x0099FF)
            .setTimestamp();
        
        vms.slice(0, 10).forEach(vm => {
            embed.addFields({ name: vm.name, value: `State: ${vm.power_state}`, inline: true });
        });
        await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'vm_status') {
        const targetName = interaction.options.getString('name');
        const vms = await getVMs();
        const vm = vms?.find(v => v.name.toLowerCase().includes(targetName.toLowerCase()));
        if (!vm) return interaction.editReply(`VM "${targetName}" not found.`);
        
        const embed = new EmbedBuilder()
            .setTitle(`VM Status: ${vm.name}`)
            .addFields(
                { name: 'Power', value: vm.power_state, inline: true },
                { name: 'ID', value: `\`${vm.vm}\``, inline: true }
            )
            .setColor(0x0099FF);
        await interaction.editReply({ embeds: [embed] });
    }
});

client.login(DISCORD_TOKEN);