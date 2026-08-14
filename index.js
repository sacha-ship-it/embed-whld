const { Client, GatewayIntentBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('embed')
      .setDescription('Crée un embed personnalisé')
      .addChannelOption(o => o.setName('canal').setDescription('Canal où envoyer l\'embed').setRequired(true))
      .addStringOption(o => o.setName('couleur').setDescription('Couleur hex (ex: #FF0000)').setRequired(false))
      .addStringOption(o => o.setName('image').setDescription('URL de l\'image principale').setRequired(false))
      .addStringOption(o => o.setName('thumbnail').setDescription('URL de la miniature (coin haut droit)').setRequired(false))
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
    const canal = interaction.options.getChannel('canal')
    const couleur = interaction.options.getString('couleur') || '#5865F2'
    const image = interaction.options.getString('image')
    const thumbnail = interaction.options.getString('thumbnail')
    const footer = interaction.options.getString('footer')
    const footerIcon = interaction.options.getString('footer_icon')
    const author = interaction.options.getString('author')
    const authorIcon = interaction.options.getString('author_icon')

    // Ouvrir le modal pour le titre et la description
    const modal = new ModalBuilder()
      .setCustomId(`embed_modal_${canal.id}_${couleur}_${image || 'none'}_${thumbnail || 'none'}_${footer || 'none'}_${footerIcon || 'none'}_${author || 'none'}_${authorIcon || 'none'}`)
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

  if (interaction.isModalSubmit() && interaction.customId.startsWith('embed_modal_')) {
    const parts = interaction.customId.split('_')
    // Format: embed_modal_CHANNELID_COLOR_IMAGE_THUMBNAIL_FOOTER_FOOTERICON_AUTHOR_AUTHORICON
    const canalId = parts[2]
    const couleur = parts[3]
    const image = parts[4] === 'none' ? null : parts[4]
    const thumbnail = parts[5] === 'none' ? null : parts[5]
    const footer = parts[6] === 'none' ? null : parts[6]
    const footerIcon = parts[7] === 'none' ? null : parts[7]
    const author = parts[8] === 'none' ? null : parts[8]
    const authorIcon = parts[9] === 'none' ? null : parts[9]

    const titre = interaction.fields.getTextInputValue('titre')
    const description = interaction.fields.getTextInputValue('description')
    const message = interaction.fields.getTextInputValue('message')

    const embed = new EmbedBuilder().setColor(couleur)

    if (titre) embed.setTitle(titre)
    if (description) embed.setDescription(description)
    if (image) embed.setImage(image)
    if (thumbnail) embed.setThumbnail(thumbnail)
    if (footer) embed.setFooter({ text: footer, iconURL: footerIcon || undefined })
    if (author) embed.setAuthor({ name: author, iconURL: authorIcon || undefined })

    embed.setTimestamp()

    try {
      const channel = await client.channels.fetch(canalId)
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
