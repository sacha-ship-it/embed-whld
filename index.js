cconst { Client, GatewayIntentBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

const pendingEmbeds = new Map()

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Crée un embed personnalisé')
      .addChannelOption(o => o.setName('canal').setDescription('Canal où envoyer l\'embed').setRequired(true))
      .addStringOption(o => o.setName('couleur').setDescription('Couleur hex (ex: #FF0000)').setRequired(false))
      .addStringOption(o => o.setName('image').setDescription('URL de l\'image principale').setRequired(false))
      .addStringOption(o => o.setName('thumbnail').setDescription('URL de la miniature').setRequired(false))
      .addStringOption(o => o.setName('footer').setDescription('Texte du footer').setRequired(false))
      .addStringOption(o => o.setName('footer_icon').setDescription('URL de l\'icône du footer').setRequired(false))
      .addStringOption(o => o.setName('author').setDescription('Nom de l\'auteur').setRequired(false))
      .addStringOption(o => o.setName('author_icon').setDescription('URL de l\'icône de l\'auteur').setRequired(false))
  ].map(c => c.toJSON())

  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
  console.log('Commandes enregistrées')
}

client.on('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`)
  await registerCommands()
})

client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand() && interaction.commandName === 'embed') {
    const userId = interaction.user.id

    pendingEmbeds.set(userId, {
      canalId: interaction.options.getChannel('canal').id,
      couleur: interaction.options.getString('couleur') || '#C084FC',
      image: interaction.options.getString('image') || null,
      thumbnail: interaction.options.getString('thumbnail') || null,
      footer: interaction.options.getString('footer') || null,
      footerIcon: interaction.options.getString('footer_icon') || null,
      author: interaction.options.getString('author') || null,
      authorIcon: interaction.options.getString('author_icon') || null,
    })

    const modal = new ModalBuilder()
      .setCustomId('embed_modal')
      .setTitle('Créer un embed')

    const titleInput = new TextInputBuilder()
      .setCustomId('titre')
      .setLabel('Titre de l\'embed')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Titre...')
      .setRequired(false)

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description / Texte principal')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Texte de l\'embed...')
      .setRequired(false)

    const messageInput = new TextInputBuilder()
      .setCustomId('message')
      .setLabel('Message au-dessus de l\'embed (optionnel)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Message visible au-dessus...')
      .setRequired(false)

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(messageInput)
    )

    await interaction.showModal(modal)
  }

  if (interaction.isModalSubmit() && interaction.customId === 'embed_modal') {
    const userId = interaction.user.id
    const options = pendingEmbeds.get(userId)

    if (!options) {
      return interaction.reply({ content: '❌ Session expirée. Relance /embed.', ephemeral: true })
    }

    pendingEmbeds.delete(userId)

    const titre = interaction.fields.getTextInputValue('titre')
    const description = interaction.fields.getTextInputValue('description')
    const message = interaction.fields.getTextInputValue('message')

    const embed = new EmbedBuilder().setColor(options.couleur)

    if (titre) embed.setTitle(titre)
    if (description) embed.setDescription(description)
    if (options.image) embed.setImage(options.image)
    if (options.thumbnail) embed.setThumbnail(options.thumbnail)
    if (options.footer) embed.setFooter({ text: options.footer, iconURL: options.footerIcon || undefined })
    if (options.author) embed.setAuthor({ name: options.author, iconURL: options.authorIcon || undefined })

    try {
      const channel = await client.channels.fetch(options.canalId)
      await channel.send({
        content: message || undefined,
        embeds: [embed]
      })
      await interaction.reply({ content: '✅ Embed envoyé dans ' + channel.toString() + ' !', ephemeral: true })
    } catch (e) {
      console.error(e)
      await interaction.reply({ content: '❌ Erreur lors de l\'envoi. Vérifie que le bot a accès au canal.', ephemeral: true })
    }
  }
})

client.login(TOKEN)
