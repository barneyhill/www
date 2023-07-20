function processConversation(conversations){
    // text-davinci-002-render-sha is gpt3
    let model_map = {"text-davinci-002-render-sha": "gpt-3", "text-davinci-002-render-sha-mobile": "gpt-3",
                     "text-davinci-002-render-sha-code-interpreter": "gpt-3", "text-davinci-002-render-sha-plugin": "gpt-3",
                     "text-davinci-002-render-paid": "gpt-3",
                     "gpt-4": "gpt-4", "gpt-4-plugins": "gpt-4", "gpt-4-mobile": "gpt-4", "gpt-4-code-interpreter": "gpt-4", "gpt-4-browsing": "gpt-4"}
    let token_counts = {"gpt-3": {"user": {}, "assistant": {}}, "gpt-4": {"user": {}, "assistant": {}}}

    conversations.forEach(conversation => {

        let model = null;

        // Get GPT model (message.metadata.model_slug)
        Object.values(conversation.mapping).forEach(mapping_item => {
            let message = mapping_item.message;

            if (message === null || message.metadata.model_slug === null) { return; }

            model = message.metadata.model_slug;
            return;
        });

        if (model == null) { return; }

        Object.values(conversation.mapping).forEach(mapping_item => {

            let message = mapping_item.message;

            if (message === null) { return; }

            // Check if message has any content
            if (message.content && message.content.parts) {
                let content = message.content.parts.join('')

                let date = new Date(message.create_time * 1000);
                let monthyear = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;

                let role = message.author.role;

                if (role != "user" && role != "assistant") { return; }

                if (!(monthyear in token_counts[model_map[model]][role])){
                    token_counts[model_map[model]][role][monthyear] = 0;
                }

                token_counts[model_map[model]][role][monthyear] += GPTTokenizer_cl100k_base.encode(content).length;
            }
        });
    });

    return token_counts;
}

window.onload = () => {
    const fileInput = document.getElementById('file-input');
    const dropzoneLabel = document.querySelector('.dropzone');

    fileInput.addEventListener('change', function () {
        const fileName = fileInput.files[0].name;
        dropzoneLabel.innerText = fileName;
    });

    document.getElementById('calculate-btn').addEventListener('click', function(e) {
        e.preventDefault();

        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (file) {            
            document.getElementById('calculating').innerText = 'Calculating...';

            JSZip.loadAsync(file).then(function(zip) {
                let file = zip.file("conversations.json");
                if (file) {
                    file.async('string').then(function(content) {
                        let conversations = JSON.parse(content);
                        let token_counts = processConversation(conversations)

                        // Define the cost per token for each type
                        const costPerToken = {
                            "gpt-3": { "user": 0.003 / 1000, "assistant": 0.004 / 1000 },
                            "gpt-4": { "user": 0.03 / 1000, "assistant": 0.06 / 1000 }
                        }

                        // Create a combined object that includes all conversations
                        let combined = {};
                        for (let type in token_counts) {
                            for (let role in token_counts[type]) {
                                for (let date in token_counts[type][role]) {
                                    if (!combined[date]) {
                                        combined[date] = 0;
                                    }
                                    combined[date] += token_counts[type][role][date] * costPerToken[type][role];
                                }
                            }
                        }

                        // Sort the keys of the combined object
                        let dates = Object.keys(combined);
                        dates.sort();
                        
                        // Generate data from the sorted keys
                        let data = dates.map(date => combined[date]);

                        // Create a datasets for the chart
                        const datasets = [
                            {
                                label: 'Usage cost given current OpenAI API costs',
                                data: data,
                                fill: false,
                                borderColor: 'rgb(75, 192, 192)',
                                tension: 0.1
                            },
                            {
                                label: 'ChatGPT Plus Subscription',
                                data: new Array(dates.length).fill(20),
                                fill: false,
                                borderColor: 'rgb(255, 99, 132)',
                                borderDash: [5, 5], // Makes the line dotted
                                tension: 0
                            }
                        ];

                        // Create chart
                        const ctx = document.getElementById('chart');
                        new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: dates,
                                datasets: datasets
                            },
                            options: {
                                responsive: true,
                                scales: {            
                                    x: {
                                        type: 'category', // this line is added
                                        title: {
                                            display: true,
                                            text: 'Date'
                                        }
                                    },                                            
                                    y: {
                                        title: {
                                            display: true,
                                            text: 'Total Price ($)'
                                        }
                                    }
                                }
                            }
                        });

                        // Show the results section
                        document.getElementById('results').style.display = 'block';
                        // Hide the calculating message
                        document.getElementById('calculating').innerText = '';
                    });
                } else {
                    // Handle situation where the "conversations.json" is not found in the zip
                    alert("Could not find 'conversations.json' in the uploaded zip file.");
                }
            });
        } else {
            alert("Please upload a file.");
        }
    });
}
