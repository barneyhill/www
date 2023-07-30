const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

// This function should generate a graph using D3.js
// Function to render graph

function getTracklists(data, UID) {
    let tracklists = [];
    for (let set in data) {
        if (data.hasOwnProperty(set)) {
            for (let i = 0; i < data[set].tracks.length; i++) {
                if (data[set].tracks[i].uid === UID) {
                    tracklists.push(data[set]);
                    break;  // break the inner loop as we've found a matching UID
                }
            }
        }
    }
    return tracklists;
}

function truncateText(text, maxLength) {
    if (text.length > maxLength) {
        return text.slice(0, maxLength - 3) + '...';
    } else {
        return text;
    }
}

function flattenTracks(data) {
    // Preprocess the dataset
    let tracks = {};
    for (let set in data) {
        if (data.hasOwnProperty(set)) {
            data[set].tracks.forEach(track => {
                tracks[track.uid] = `${track.artist} - ${track.title}`;
            });
        }
    }
    return tracks;
}

function searchTracks(miniSearch, query) {
    // Perform the search
    let results = miniSearch.search(query);
    // Return the top 5 tracks
    return results.slice(0, 5).map(item => item);
}


function renderGraph(tracklist_data, centerTrackUID) {

    console.log(centerTrackUID)

    let tracklists = getTracklists(tracklist_data, centerTrackUID);

    let nodes = [];
    let links = [];

    let graphContainer = d3.select('#graph');
    let width = graphContainer.node().getBoundingClientRect().width;
    let height = graphContainer.node().getBoundingClientRect().height;

    console.log(height)

    let n_sets = tracklists.length;

    let centralNodeX = width / 2;
    let distanceX = 200;
    let distanceY = 100;

    let centralTrackNode = null;
    let hasAddedCentralNode = false;

    tracklists.forEach((set, set_i) => {
        let centralTrackIndex = set.tracks.findIndex(track =>
            track.uid === centerTrackUID
        );
    
        set.tracks.forEach((track, track_i) => {
            let relativePosition = track_i - centralTrackIndex;
            let x = centralNodeX + relativePosition * distanceX;
            let y = height / 2 + set_i * distanceY;
    
            let sourceId = `${set_i}_${track_i}`;
            let node = {id: sourceId, artist:track.artist, title:track.title, uid:track.uid, linked:track.linked, discogs_id:track.discogs_id, x, y, set_i}
    
            if (track_i === centralTrackIndex){
                if (!hasAddedCentralNode) {
                    node.y = height / 2 + (n_sets - 1) * distanceY / 2;
                    centralTrackNode = node.id;
                    nodes.push(node);
                    hasAddedCentralNode = true;
                    
                }
            } else {
                nodes.push(node);
            }
    
            if (track_i >= 1){
                let set_name = `${set.name} - ${set.date} - ${set.loc}`;
                if (relativePosition == 1){
                    links.push({source: centralTrackNode, target: `${set_i}_${track_i}`, url: set.url, name: set_name, set_i});
                } else if (relativePosition == 0){
                    links.push({source: `${set_i}_${track_i-1}`, target: centralTrackNode, url: set.url, name: set_name, set_i});
                } else {
                    links.push({source: `${set_i}_${track_i-1}`, target: `${set_i}_${track_i}`, url: set.url, name: set_name, set_i});
                }
            }
        });
    });

    let colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    let svg = d3.select('#graph')
        .append('svg')
        .style('width', '100%')
        .style('height', '80%')
        .attr('viewBox', [0, 0, width, height]);

    let g = svg.append('g');

    let zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on('zoom', function(event) {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Create a map of node ids to nodes
    let nodeMap = new Map(nodes.map(node => [node.id, node]));

    let linkGenerator = d3.linkHorizontal()
        .x(d => d.x)
        .y(d => d.y);

    // Group the links by set_i
    let groupedLinks = links.reduce((groups, item) => {
        const group = (groups[item.set_i] || []);
        group.push(item);
        groups[item.set_i] = group;
        return groups;
    }, {});

    // Create the individual paths for stroke coloring and interactivity
    let link = g.append('g')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', d => linkGenerator({source: nodeMap.get(d.source), target: nodeMap.get(d.target)}))
        .attr('fill', 'none')
        .attr('stroke', d => colorScale(d.set_i))
        .attr('stroke-width', 10)
        .on('mouseenter', function(event, d) {
            link.each(function(d1) {
                if (d1.set_i === d.set_i) {
                    d3.select(this).raise().attr('stroke', 'black').attr('stroke-width', 15);
                }
            });
            
            // Start text animation for this set
            d3.selectAll('.superTextClass' + d.set_i).attr('visibility', 'visible');
        })
        .on('mouseleave', function(event, d) {
            link.each(function(d1) {
                if (d1.set_i === d.set_i) {
                    d3.select(this).lower().attr('stroke', colorScale(d1.set_i)).attr('stroke-width', 10);
                }
            });
            
            // Stop text animation for this set
            d3.selectAll('.superTextClass' + d.set_i).attr('visibility', 'hidden');
        })
        .on('click', function(event, d) {
            // Redirect to the associated URL
            window.location.href = "https://www.nts.live/" + d.url;
        });

    Object.entries(groupedLinks).forEach(([set_i, links]) => {        
        // Generate path for the actual links
        let superPathD = links.map((link, i) => {
            return linkGenerator({source: nodeMap.get(link.source), target: nodeMap.get(link.target)});
        }).join("");
                
        let superPath = g.append('path')
            .attr('id', 'superPath' + set_i)  // unique id for the super path
            .attr('d', superPathD)
            .attr('fill', 'none')
            .attr('stroke', 'none');  // Make the path invisible
                                
        function repeatAnimation(superText, startOffset, duration) {
            superText.transition()
                .duration(duration)
                .ease(d3.easeLinear)
                .attrTween("startOffset", function() {
                    return function(t) {
                        let offset = (t * 100 + startOffset) % 100;
                        return offset + "%";
                    }
                })
                .on("end", () => repeatAnimation(superText, startOffset, duration));
        }
        // split url by / and get last element:
        let repeatedText = links[0].name;
        let superTextTemplate = g.append('text').text(repeatedText);  // Template text element for measuring text length
        
        // Get the length of the text and add some padding
        let textLength = superTextTemplate.node().getComputedTextLength();

        superTextTemplate.remove();  // Remove the template text element

        // Calculate the maximum number of repeating texts per path
        let pathLength = superPath.node().getTotalLength();
        let maxRepeats = Math.floor(pathLength / textLength - 0.1);
        let animationSpeed = 200000;

        // Now add your repeated texts
        for (let i = 0; i < maxRepeats; i++) {
            // Calculate the startOffset for this text
            let startOffset = (i / maxRepeats) * 100;
        
            // Append text to the super path
            let superText = g.append('text')
                .attr('id', `superText${set_i}_${i}`)  // unique id for the super text
                .attr('class', `superTextClass${set_i} globalSuperTextClass`)  // class for the group of super text
                .style("text-anchor","middle")
                .style("dominant-baseline","middle")
                .style("pointer-events","none")  // Ignore pointer events on text
                .style('fill', 'white') // Change text color to white
                .attr('visibility', 'hidden')  // Hide the text initially
                .append('textPath')
                .attr('xlink:href', '#superPath' + set_i)  // reference to the super path id
                .style("text-anchor","middle")
                .attr("startOffset", startOffset + "%")  // Set the initial startOffset
                .text(repeatedText);  // Add the repeated text
            
            // Start the animation with no delay
            repeatAnimation(superText, startOffset, animationSpeed);
        }
    });

    let defs = g.append('defs');

    let discogsPattern = defs.append('pattern')
        .attr('id', 'discogsPattern')
        .attr('width', 1)
        .attr('height', 1)
        .attr('patternContentUnits', 'objectBoundingBox');
    
    discogsPattern.append('rect')
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', 'white');
    
    discogsPattern.append('image')
        .attr('xlink:href', '../../assets/discogs.svg')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('width', 1)
        .attr('height', 1);
        
    let node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('g')
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    
    node.append('circle')
        .attr('r', d => d.linked ? 15 : 10)
        .attr('fill', d => d.linked ? 'white' : 'black')
        .attr('stroke', 'black')
        .attr('stroke-width', 5)
        .on('mouseenter', function(event, d) {
            if (d.discogs_id & d.id == centralTrackNode) {
                d3.select(this).attr('stroke-width', 0)
                               .attr('fill', 'url(#discogsPattern)')
                               .attr('r', 18); // increased size of node
            } else if (d.linked) {
                d3.select(this).attr('fill', 'white')
                               .attr('stroke', 'black')
                               .attr('stroke-width', 8);
            }
        })
        .on('mouseleave', function(event, d) {
            d3.select(this).attr('stroke-width', 6);
            if (d.id == centralTrackNode) {
                d3.select(this).attr('fill', d.linked ? 'white' : 'black')
                               .attr('r', d => d.linked ? 15 : 10);

            }
        })
        .on('click', function(event, d) {
            console.log(d);
            if (d.id == centralTrackNode && d.discogs_id !== undefined){
                discogs_url = `https://www.discogs.com/release/${d.discogs_id}`
                window.open(discogs_url, '_blank');
            }
    
            if (d.linked){
                if (d.uid !== null){
                    d3.select('#graph').select('svg').remove();
                    renderGraph(tracklist_data, d.uid);
                } 
            }
        });
    

    let nodeText = node.append('text')
        .attr('class', 'node-text') // Assign class to the text
        .attr('dy', -45); // Shift the vertical position down

    nodeText.append('tspan')
        .attr('class', 'node-text-artist') // Assign class to the artist text
        .text(d => truncateText(d.artist, 27));

    nodeText.append('tspan')
        .attr('x', 0)
        .attr('dy', '1.4em') // Shift the vertical position down by 1em
        .attr('class', 'node-text-title') // Assign class to the title text
        .text(d => truncateText(d.title, 30));
}

document.addEventListener('DOMContentLoaded', (event) => {
    const req = new Request('../../assets/nts_29_7_23_w_discogs_tracklists.js');

    // Start fetch
    fetch(req)
    .then(response => {
        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
            throw new Error("Content Length not available!");
        }

        const total = parseInt(contentLength, 10);
        let loaded = 0;

        return new Response(
            new ReadableStream({
                start(controller) {
                    const reader = response.body.getReader();

                    read();

                    function read() {
                        reader.read().then(({done, value}) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            loaded += value.byteLength;
                            updateProgressBar(loaded / total * 100, loaded);
                            controller.enqueue(value);
                            read();
                        });
                    }
                }
            }), {
            headers: response.headers
        });
    })
    .then(response => response.json())
    .then(data => {
            
            let centerTrackUID = "cf88f74cb2d853cb810449d92fa6980a"; // Default center track
            renderGraph(data, centerTrackUID);
            
            let uf = new uFuzzy({});

            let tracks_flattened = flattenTracks(data);
            let tracks_keys   = Object.keys(tracks_flattened);
            let tracks_values = Object.values(tracks_flattened);          

            const searchInput = document.getElementById('search-input');
            document.getElementById('search-results').style.display = 'none';

            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    // Clear out any old search results
                    document.getElementById('search-results').innerHTML = '';
                    let [idxs, info, order] = uf.search(tracks_values, searchInput.value, outOfOrder = false, infoThresh = 1e3);
                    
                    if (idxs && idxs.length > 0) { // check if idxs is not null and has any search results
                        for (let i = 0; i < Math.min(idxs.length, 20); i++) {
                            // Create a new dropdown item for each result
                            let resultItem = document.createElement('div');
                            resultItem.classList.add('result-item');
            
                            document.getElementById('search-results').style.display = 'block';
            
                            let track_value = tracks_values[idxs[i]];
                            let track_uid   = tracks_keys[idxs[i]];
            
                            resultItem.innerHTML = track_value;
                            resultItem.addEventListener('click', function() {
                                // When this result item is clicked, clear the input field, hide the results dropdown,
                                // and generate a new graph centered on the selected track
                                searchInput.value = '';
                                document.getElementById('search-results').innerHTML = '';
                                document.getElementById('search-results').style.display = 'none';
                                d3.select('#graph').select('svg').remove();
                                renderGraph(data, track_uid);
                            });
                            document.getElementById('search-results').appendChild(resultItem);
                        }
                    } else {
                        // Hide the results box if no results or input is cleared
                        document.getElementById('search-results').style.display = 'none';
                    }
                });
            }
        })
        .catch(error => console.error('Error:', error)); // Moved the catch to the end of the promise chain

        function updateProgressBar(percent, loaded) {
            const progressBarContainer = document.getElementById('progress-bar-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            progressBar.style.width = `${percent}%`;
    
            const loadedMB = (loaded / (1024 * 1024)).toFixed(2); // Convert bytes to MB and round to two decimal places
            progressText.innerText = `${loadedMB} MB downloaded`;
    
            if (percent >= 100) {
                progressText.innerText = "Complete!";
                // Hide the progress bar after 1 second
                setTimeout(() => {
                    progressBarContainer.style.display = "none";
                }, 1000);
            }
        }
    });
    