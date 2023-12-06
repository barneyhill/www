// Function to fetch and process the data
async function loadEmojiData() {
    try {
        const response = await fetch('data/emoji-embeddings_6dp.jsonl');
        const text = await response.text();
        const lines = text.split('\n');

        let data = displayData(lines);

        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Function to display data on the page
function displayData(lines) {
    let emojis = []
    let emoji_embeddings = []

    lines.forEach(line => {
        if (line) {
            const item = JSON.parse(line);

            emojis.push(item.emoji)
            emoji_embeddings.push(item.embed)
        }
    });

    return {emojis, emoji_embeddings}
}

document.addEventListener('DOMContentLoaded', async function() {
    const emojiContainer = document.getElementById('emoji-container');

    // Fetch emoji data
    const emojiData = await loadEmojiData();
    const emoji_list = emojiData.emojis;
    const emoji_embeddings = emojiData.emoji_embeddings;

    for (let i = 0; i < 20; i++) {
        const emoji = document.createElement('div');
        emoji.innerText = emoji_list[Math.floor(Math.random() * emoji_list.length)];
        emoji.className = 'emoji';
        emoji.style.top = `${Math.random() * window.innerHeight}px`;
        emoji.style.left = `${Math.random() * window.innerWidth}px`;
        emojiContainer.appendChild(emoji);

        emoji.addEventListener('mousedown', startDrag);
    }

    let activeEmoji = null;
    let offsetX = 0;
    let offsetY = 0;

    function addEmojis(emoji_a, emoji_b) {
        const embedding_a = getEmojiEmbedding(emoji_a);
        const embedding_b = getEmojiEmbedding(emoji_b);

        combined_embedding = embedding_a.map((num, idx) => num + embedding_b[idx] / 2);

        return getClosestEmoji(combined_embedding, emoji_a, emoji_b);
    }

    function getClosestEmoji(emoji_embedding, not_emoji_a, not_emoji_b) {
        let smallest_distance = Infinity;
        let closest_emoji = null;

        for (let i = 0; i < emoji_embeddings.length; i++) {
            if (emoji_list[i] !== not_emoji_a && emoji_list[i] !== not_emoji_b) {
                const distance = getDistance(emoji_embedding, emoji_embeddings[i]);
                if (distance < smallest_distance) {
                    smallest_distance = distance;
                    closest_emoji = emoji_list[i];
                }
            }
        }

        return closest_emoji;

    }

    function getDistance(arr1, arr2) {    
        return Math.sqrt(arr1.reduce((sum, value, index) => {
            return sum + Math.pow(value - arr2[index], 2);
        }, 0));
    }
    

    function getEmojiEmbedding(emoji) {
        return emoji_embeddings[getEmojiPosition(emoji)];
    }

    function getEmojiPosition(emoji) {
        return emoji_list.indexOf(emoji);
    }

    function startDrag(e) {
        activeEmoji = e.target;
        const rect = activeEmoji.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }
    
    function drag(e) {
        if (activeEmoji) {
            activeEmoji.style.left = `${e.clientX - offsetX}px`;
            activeEmoji.style.top = `${e.clientY - offsetY}px`;
        }
    }

    function stopDrag() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        
        // Check for collisions
        const collidedEmoji = checkForCollision(activeEmoji);
        if (collidedEmoji) {
            combine_emojis(activeEmoji, collidedEmoji);
        }

        activeEmoji = null;
    }

    function checkForCollision(emoji) {
        const emojis = document.getElementsByClassName('emoji');
        for (let i = 0; i < emojis.length; i++) {
            if (emojis[i] !== emoji) {
                if (isOverlapping(emoji, emojis[i])) {
                    return emojis[i];
                }
            }
        }
        return null;
    }

    function isOverlapping(elem1, elem2) {
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        return !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
        );
    }

    function combine_emojis(emoji1, emoji2) {
        const combinedEmojiText = addEmojis(emoji1.innerText, emoji2.innerText);
        const combinedEmoji = document.createElement('div');
        combinedEmoji.innerText = combinedEmojiText;
        combinedEmoji.className = 'emoji';
        combinedEmoji.style.top = emoji1.style.top;
        combinedEmoji.style.left = emoji1.style.left;
        combinedEmoji.addEventListener('mousedown', startDrag); // Make the new emoji draggable
        emojiContainer.appendChild(combinedEmoji);
    
        emoji1.remove();
        emoji2.remove();
    }
});

