const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

function createTagButtons(questionId) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`solved-${questionId}`)
                .setLabel('Solved')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`review-${questionId}`)
                .setLabel('Under Review')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`unsolved-${questionId}`)
                .setLabel('Not Solved')
                .setStyle(ButtonStyle.Danger)
        );
}

function createNavigationRow(currentPage, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')  // Changed customId
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next_page')  // Changed customId
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );
}

function getTagColor(tag) {
    const colors = {
        'solved': 0x57F287,
        'under_review': 0x5865F2,
        'not_solved': 0xED4245
    };
    return colors[tag] || 0x0099FF;
}

function formatTag(tag) {
    if (!tag) return 'NOT SET';
    return tag.replace('_', ' ').toUpperCase();
}

function createQuestionEmbed(question, pageInfo) {
    return new EmbedBuilder()
        .setColor(getTagColor(question.tag))
        .setTitle(`Question: ${question.title}`)
        .setDescription(`[Click here to solve](${question.url})`)
        .addFields(
            { name: 'Difficulty', value: question.difficulty || 'Not specified', inline: true },
            { name: 'Status', value: formatTag(question.tag), inline: true }
        )
        .setFooter({ text: `Question ${pageInfo.current + 1} of ${pageInfo.total}` })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('questions')
        .setDescription('Fetches questions from the database'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const response = await fetch('http://127.0.0.1:3000/questions');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const { data } = await response.json();
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                await interaction.editReply('No questions found in the database.');
                return;
            }

            // Store the data in a global cache with the interaction ID
            if (!interaction.client.questionCache) {
                interaction.client.questionCache = new Map();
            }

            interaction.client.questionCache.set(interaction.user.id, {
                currentPage: 0,
                data: data
            });

            const question = data[0];
            const embed = createQuestionEmbed(question, {
                current: 0,
                total: data.length
            });

            const components = [
                createTagButtons(question.id),
                createNavigationRow(0, data.length)
            ];

            await interaction.editReply({
                embeds: [embed],
                components: components
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            await interaction.editReply({
                content: `Error fetching data: ${error.message}`,
                ephemeral: true
            });
        }
    },

    async buttonHandler(interaction) {
        try {
            const cache = interaction.client.questionCache?.get(interaction.user.id);
            if (!cache) {
                await interaction.reply({ 
                    content: 'Session expired. Please run the /questions command again.', 
                    ephemeral: true 
                });
                return;
            }

            // Handle navigation buttons
            if (interaction.customId === 'next_page' || interaction.customId === 'prev_page') {
                const newPage = interaction.customId === 'next_page' ? 
                    cache.currentPage + 1 : cache.currentPage - 1;
                
                if (newPage < 0 || newPage >= cache.data.length) {
                    await interaction.reply({ 
                        content: 'Invalid page number.', 
                        ephemeral: true 
                    });
                    return;
                }

                const question = cache.data[newPage];
                const embed = createQuestionEmbed(question, {
                    current: newPage,
                    total: cache.data.length
                });

                cache.currentPage = newPage;
                interaction.client.questionCache.set(interaction.user.id, cache);

                await interaction.update({
                    embeds: [embed],
                    components: [
                        createTagButtons(question.id),
                        createNavigationRow(newPage, cache.data.length)
                    ]
                });
                return;
            }

            // Handle tag update buttons
            const [action, questionId] = interaction.customId.split('-');
            
            if (!['solved', 'review', 'unsolved'].includes(action)) {
                return;
            }

            const response = await fetch(`http://127.0.0.1:3000/questions/${questionId}/update-tag`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag: action === 'review' ? 'under_review' : `${action}`
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const { data: updatedQuestion } = await response.json();
            
            // Update the cache
            const questionIndex = cache.data.findIndex(q => q.id === parseInt(questionId));
            if (questionIndex !== -1) {
                cache.data[questionIndex] = updatedQuestion;
                interaction.client.questionCache.set(interaction.user.id, cache);
            }

            const embed = createQuestionEmbed(updatedQuestion, {
                current: cache.currentPage,
                total: cache.data.length
            });

            await interaction.update({
                embeds: [embed],
                components: [
                    createTagButtons(updatedQuestion.id),
                    createNavigationRow(cache.currentPage, cache.data.length)
                ]
            });

        } catch (error) {
            console.error('Error handling button:', error);
            await interaction.reply({ 
                content: 'An error occurred while processing your request.', 
                ephemeral: true 
            });
        }
    }
};









































// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('questions')
//         .setDescription('Fetches questions from the database'),
//     async execute(interaction) {
//         await interaction.deferReply();
        
//         try {
//             const response = await fetch('http://localhost:3000/questions');
            
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
            
//             const { data } = await response.json();  // Destructure the data property
            
//             if (!data || !Array.isArray(data) || data.length === 0) {
//                 await interaction.editReply('No questions found in the database.');
//                 return;
//             }

//             const embed = new EmbedBuilder()
//                 .setColor(0x0099FF)
//                 .setTitle('LeetCode Questions')
//                 .setTimestamp();

//             data.forEach((item, index) => {
//                 embed.addFields({
//                     name: `Question: ${item.title}`,  // Using the question number
//                     value: `[Click here to solve](${item.url})\nDifficulty: ${item.difficulty}`
//                 });
//             });

//             await interaction.editReply({ embeds: [embed] });

//         } catch (error) {
//             console.error('Error fetching data:', error);
//             await interaction.editReply({
//                 content: `Error fetching data: ${error.message}`,
//                 ephemeral: true
//             });
//         }
//     },
// };