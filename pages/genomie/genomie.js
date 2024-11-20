class GenomeBrowser {
    constructor() {
        this.state = {
            viewport: {
                isDragging: false,
                dragStart: null,
                lastPosition: null,
            },
            data: {
                startPos: null,
                endPos: null,
                currentGenes: null,
                loadedArticles: new Map(),
                genePositions: new Map(),
                DEFAULT_SEARCH_EMBEDDING: [-0.038505927,0.059179112,0.009339615,0.036907,0.10060073,-0.038430683,-0.014898238,0.008507232,-0.10338474,-0.10519059,-0.0743407,0.089088455,0.030153884,-0.024397746,-0.05440114,-0.023137415,0.019431667,-0.028178738,-0.037621815,-0.11497226,0.049924146,-0.027482735,0.09367832,0.007844148,-0.00063075323,0.06305416,0.021670165,0.07810289,0.014136396,0.061662152,0.06391946,0.066929206,-0.018190147,0.028084684,-0.07885532,-0.06978846,0.05688418,-0.044055145,0.07102998,-0.086831145,-0.027915386,-0.0029627178,-0.06963798,0.20737143,0.039314795,-0.017193168,0.11948688,-0.038430683,-0.018415878,-0.012584496,0.038900957,-0.008949289,-0.040029608,-0.023908662,0.030981563,0.07584558,0.23566304,0.13303073,0.013515636,0.04273838,-0.09480697,-0.089991376,0.05616937,0.076184176,-0.013760178,0.0036798837,0.067944996,0.138674,-0.02341958,0.13731962,-0.106168754,-0.038223762,-0.040556315,0.09044284,-0.03365271,0.0286302,-0.07129334,-0.019130692,0.08051068,0.045936234,-0.06595104,0.0891637,0.087056875,0.14130753,0.046425316,0.016845167,0.0016236164,-0.0986444,0.0075149573,0.001333223,-0.013581474,-0.041760214,-0.01869804,-0.011267733,0.02550759,0.0493222,-0.0896904,0.0011016137,0.09036759,-0.039691012,-0.10970521,-0.024548233,0.004063156,-0.03831782,0.0127443895,-0.009457183,-0.028855931,0.023758175,-0.07633466,0.13054769,-0.051955726,-0.034988288,0.0060194903,-0.026410513,-0.018914366,-0.055567417,-0.0099979965,-0.0035293964,0.07580795,-0.007486741,-0.019958371,-0.0066872775,-0.0979672,-0.034706123,0.033953685,-0.02198995,-0.056282233,-0.024247259,-0.03717035,-0.08336994,-0.08743309,0.055266444,-0.056319855,-0.07102998,0.041572105,0.09548416,0.06316703,0.04213643,0.027257005,-0.0045569423,0.060947336,-0.037414894,0.020635564,0.07084187,-0.03901382,0.02302455,0.016882788,-0.023494823,0.04650056,-0.06158691,0.017512955,-0.019619776,0.023494823,0.016450139,-0.014042342,0.057598997,0.05026274,0.026429323,0.051391397,0.004491104,0.018274795,0.0014613724,-0.043415572,0.045785747,0.030868698,-0.021707786,-0.019563343,-0.04582337,-0.0018705096,0.05003701,-0.044958066,-0.11948688,0.0030873402,-0.0049660793,-0.0419107,0.11421983,0.07923154,0.084122375,0.16463305,0.11324166,-0.0043406165,0.12023932,0.031451836,-0.0979672,-0.026297648,-0.05146664,0.05127853,0.008831721,0.014766562,0.03628624,0.06971322,-0.0073409565,0.06267794,-0.047930192,0.0070305765,-0.029420258,0.060082037,-0.11324166,0.11873444,-0.010082646,0.11700384,-0.10707168,-0.025187803,0.116326645,-0.10601827,-0.03626743,0.0950327,-0.10767363,-0.0019269423,0.015387322,0.043453194,0.010769244,0.063543245,0.018810907,-0.03401012,0.03464969,-0.024096772,0.04112064,0.010882109,0.0042677247,-0.05835143,0.028724255,0.008018149,0.08321945,0.08306897,0.03169638,0.032486435,-0.021933516,-0.035571426,0.09962256,0.04236216,-0.08126312,0.032260705,0.010411837,-0.022347357,-0.01888615,-0.078930564,-0.026880786,0.0122459,0.09096955,-0.15033677,0.0034635582,0.0003959108,-0.014512614,-0.07136858,0.019676208,-0.053874437,0.08156409,0.036079317,0.0057890564,-0.07460406,0.006833062,0.08427286,-0.011643951,-0.025451157,-0.1252054]
            },
            ui: {
                geneLabels: [],
                app: null,
                geneContainer: null,
                ruler: null
            }
        };
    }

    initPixiApp() {
        const container = document.getElementById('gene-container');
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent);
        
        this.state.ui.app = new PIXI.Application({
            resizeTo: container,
            backgroundColor: 0xFFFFFF,
            resolution: window.devicePixelRatio || 1,
            antialias: !isMobile,
            autoDensity: true,
        });

        container.appendChild(this.state.ui.app.view);
        
        this.state.ui.geneContainer = new PIXI.Container();
        this.state.ui.ruler = new PIXI.Container();
        this.state.ui.ruler.y = 0;
        this.state.ui.app.stage.addChild(this.state.ui.ruler);
        this.state.ui.app.stage.addChild(this.state.ui.geneContainer);

        this.setupEventListeners();
    }

    interpolateColor(similarity) {
        const power = 0.7;
        const scaledValue = Math.pow(Math.max(0, Math.min(1, similarity)), power);
        
        const startRGB = [51, 51, 51];    // Dark gray
        const endRGB = [0, 200, 0];       // Green
        
        return `rgb(${startRGB.map((start, i) => 
            Math.round(start + (endRGB[i] - start) * scaledValue)
        ).join(', ')})`;
    }

    async loadGeneEmbedding(geneName) {
        try {
            const response = await fetch(`https://www.barneyhill.com/assets/genova/gene_embeddings/${geneName}_embedding.json`);
            if (!response.ok) throw new Error('Embedding not found');
            const text = await response.text();
            const embedding = JSON.parse(text.trim());
            return embedding;
        } catch (error) {
            console.error(`Error loading embedding for ${geneName}:`, error);
            return null;
        }
    }

    async parseSearchInput(input) {
        if (input.includes(':')) {
            const [chrom, pos] = input.split(':');
            return { 
                chrom: chrom.startsWith('chr') ? chrom : `chr${chrom}`,
                pos: parseInt(pos)
            };
        }
        
        const response = await fetch(`https://www.barneyhill.com/assets/genova/fh/${input}_mygene_info.json`);
        const geneInfo = await response.json();
        const pos = geneInfo.genomic_pos;
        const midpoint = Math.floor((pos.start + pos.end) / 2);
        return { 
            chrom: pos.chr.startsWith('chr') ? pos.chr : `chr${pos.chr}`,
            pos: midpoint
        };
    }

    scrollToGene(geneName) {
        const genePos = this.state.data.genePositions.get(geneName);
        if (!genePos) return;
        
        const geneCenterX = genePos.x + (genePos.width / 2);
        this.state.ui.geneContainer.position.x = -geneCenterX * this.state.ui.geneContainer.scale.x + this.state.ui.app.screen.width/2;
    }

    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async findClosestGenes(genes, position, count = 15) {
        const searchTerm = document.getElementById('search-term').value;
        let queryEmbedding = null;
        if (searchTerm) {
            queryEmbedding = await this.getEmbedding(searchTerm);
        }

        const nearestGenes = genes
            .filter(g => g.type === 'gene')
            .map(gene => ({
                ...gene,
                distance: Math.abs((gene.start + gene.end) / 2 - position)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count * 2);

        const validGenes = (await Promise.all(
            nearestGenes.map(async gene => {
                const article = await this.loadArticle(gene.gene_name);
                return article ? gene : null;
            })
        )).filter(Boolean).slice(0, count);

        if (queryEmbedding) {
            const geneEmbeddings = await Promise.all(
                validGenes.map(async gene => {
                    const embedding = await this.loadGeneEmbedding(gene.gene_name);
                    return { gene, embedding };
                })
            );

            return geneEmbeddings
                .filter(({ embedding }) => embedding !== null)
                .map(({ gene, embedding }) => ({
                    ...gene,
                    similarity: this.cosineSimilarity(queryEmbedding, embedding)
                }))
                .sort((a, b) => b.similarity - a.similarity);
        }

        return validGenes;
    }

    async getEmbedding(query) {
        if (query.toLowerCase() === 'adiposity') {
            return this.state.data.DEFAULT_SEARCH_EMBEDDING;
        }

        const response = await fetch('https://sicily-cf.barneyhill1.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query })
        });
        const data = await response.json();
        return data.embedding;
    }

    async loadArticle(geneName) {
        if (this.state.data.loadedArticles.has(geneName)) {
            return this.state.data.loadedArticles.get(geneName);
        }

        try {
            const response = await fetch(`https://www.barneyhill.com/assets/genova/fh/${geneName}.txt`);
            if (!response.ok) throw new Error();
            const text = await response.text();
            if (!text.trim()) throw new Error();
            
            const lines = text.split('\n');
            const contentToRender = lines.slice(2).join('\n');
            
            const htmlContent = marked.parse(contentToRender);
            this.state.data.loadedArticles.set(geneName, htmlContent);
            return htmlContent;
        } catch {
            return false;
        }
    }

    async createGeneList(genes) {
        const listContainer = document.querySelector('.gene-list');
        listContainer.innerHTML = '';
        
        for (const gene of genes) {
            const geneItem = document.createElement('div');
            geneItem.className = 'gene-item';
            
            const header = document.createElement('div');
            header.className = 'gene-header';
            
            const similarityText = gene.similarity !== undefined 
                ? `<span class="gene-similarity">Similarity: <span style="color: ${this.interpolateColor(gene.similarity)}">${gene.similarity.toFixed(3)}</span></span>` 
                : '';
                
            const geneColor = this.getGeneColor(gene.gene_name);
            
            header.innerHTML = `
                <span class="gene-name" style="color: ${geneColor}">${gene.gene_name}</span>
                <span class="gene-stats">
                    <span class="gene-distance">${Math.floor(gene.distance).toLocaleString()} bp away,</span>
                    ${similarityText}
                </span>
            `;
            
            const content = document.createElement('div');
            content.className = 'gene-content';
            content.innerHTML = '<div class="loading">Loading...</div>';
            
            geneItem.appendChild(header);
            geneItem.appendChild(content);
            
            header.onclick = async () => {
                const isExpanded = content.classList.contains('expanded');
                
                if (!isExpanded) {
                    const [articleContent, embedding] = await Promise.all([
                        this.loadArticle(gene.gene_name),
                        this.loadGeneEmbedding(gene.gene_name)
                    ]);
                    content.innerHTML = `<div class="article-content">${articleContent}</div>`;
                    this.scrollToGene(gene.gene_name);
                }
                
                content.classList.toggle('expanded');
            };

            listContainer.appendChild(geneItem);
        }
    
        document.querySelector('.article-panel').classList.add('visible');
    }

    async searchPosition() {
        const searchButton = document.getElementById('search-button');
        const searchIcon = document.getElementById('search-icon');
        const loadingIcon = document.getElementById('loading-icon');
        
        searchButton.disabled = true;
        searchIcon.style.display = 'none';
        loadingIcon.style.display = 'block';
        
        try {
            const input = document.getElementById('position').value;
            if (!input) return;

            const { chrom, pos } = await (input.includes(':') ? 
                Promise.resolve(this.parseSearchInput(input)) : 
                this.parseSearchInput(input));

            const data = await fetch(`https://www.barneyhill.com/assets/genova/genes/gencode.v47.annotation.${chrom}.genes.json`)
                .then(response => response.json());

            const features = data.map(feature => ({
                ...feature,
                start: parseInt(feature.start),
                end: parseInt(feature.end)
            }))
            .sort((a, b) => a.start - b.end);
            
            this.state.data.startPos = Math.min(...features.map(f => f.start));
            this.state.data.endPos = Math.max(...features.map(f => f.end));
            this.state.data.currentGenes = features;
            
            const closestGenes = await this.findClosestGenes(features, pos);
            if (closestGenes.length > 0) {
                await this.createGeneList(closestGenes);
            }
            
            this.displayGenes(features, this.state.data.startPos, this.state.data.endPos, pos);
            
            await new Promise(resolve => this.state.ui.app.ticker.addOnce(resolve));

        } catch (error) {
            console.error('Search failed:', error);
            alert('Invalid input or gene not found');
        } finally {
            searchButton.disabled = false;
            searchIcon.style.display = 'block';
            loadingIcon.style.display = 'none';
        }
    }

    setupEventListeners() {
        const view = this.state.ui.app.view;
        
        // Bind event handlers to this instance
        this.onDragStart = this.onDragStart.bind(this);
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.onWheel = this.onWheel.bind(this);

        view.addEventListener('mousedown', this.onDragStart);
        view.addEventListener('mousemove', this.onDragMove);
        view.addEventListener('mouseup', this.onDragEnd);
        view.addEventListener('touchstart', this.onDragStart);
        view.addEventListener('touchmove', this.onDragMove);
        view.addEventListener('touchend', this.onDragEnd);
        view.addEventListener('wheel', this.onWheel);

        view.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });

        view.addEventListener('gesturechange', (e) => {
            e.preventDefault();
            const midX = e.clientX - view.getBoundingClientRect().left;
            const worldPos = (midX - this.state.ui.geneContainer.position.x) / this.state.ui.geneContainer.scale.x;
            
            const dampening = 0.2;
            const zoomFactor = e.scale;
            
            this.state.ui.geneContainer.scale.x *= Math.pow(zoomFactor, dampening);
            this.state.ui.geneContainer.position.x = midX - worldPos * this.state.ui.geneContainer.scale.x;
            
            this.updateTextScales();
            this.updateRuler();
        });

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.state.ui.app.renderer.resize(width, height);
                this.updateRuler();
            }
        });

        resizeObserver.observe(document.getElementById('gene-container'));
    }

    onDragStart(event) {
        this.state.viewport.isDragging = true;
        const point = event.touches ? event.touches[0] : event;
        this.state.viewport.dragStart = { x: point.clientX, y: point.clientY };
        this.state.viewport.lastPosition = { 
            x: this.state.ui.geneContainer.position.x,
            y: this.state.ui.geneContainer.position.y 
        };
    }

    onDragMove(event) {
        if (!this.state.viewport.isDragging) return;
        
        const point = event.touches ? event.touches[0] : event;
        this.state.ui.geneContainer.position.x += point.clientX - this.state.viewport.dragStart.x;
        this.state.viewport.dragStart.x = point.clientX;

        this.updateRuler();
    }

    onDragEnd() {
        this.state.viewport.isDragging = false;
    }

    onWheel(event) {
        event.preventDefault();
        const mouseX = event.clientX - this.state.ui.app.view.getBoundingClientRect().left;
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        
        const worldPos = (mouseX - this.state.ui.geneContainer.position.x) / this.state.ui.geneContainer.scale.x;
        this.state.ui.geneContainer.scale.x *= zoomFactor;
        this.state.ui.geneContainer.position.x = mouseX - worldPos * this.state.ui.geneContainer.scale.x;
        
        this.updateTextScales();
        this.updateRuler();
    }

    updateTextScales() {
        const ZOOM_THRESHOLD = 10;
        const FADE_RANGE = 20;
        
        this.state.ui.geneLabels.forEach(label => {
            label.scale.x = 1 / this.state.ui.geneContainer.scale.x;
            const fadeAmount = Math.min(1, Math.max(0, (this.state.ui.geneContainer.scale.x - ZOOM_THRESHOLD) / FADE_RANGE));
            label.alpha = fadeAmount;
        });
    }

    assignRows(genes, minDistance = 100000) {
        if (genes.length === 0) return [];
        
        let rows = [[genes[0]]];
        genes[0].row = 0;
        
        for (let i = 1; i < genes.length; i++) {
            let currentGene = genes[i];
            let placed = false;
            
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                let canFit = true;
                for (let gene of rows[rowIndex]) {
                    const distance = Math.max(currentGene.start, gene.start) - Math.min(currentGene.end, gene.end);
                    if (distance < minDistance) {
                        canFit = false;
                        break;
                    }
                }
                if (canFit) {
                    rows[rowIndex].push(currentGene);
                    currentGene.row = rowIndex;
                    placed = true;
                    break;
                }
            }
            
            if (!placed) {
                rows.push([currentGene]);
                currentGene.row = rows.length - 1;
            }
        }
        
        return Math.max(...genes.map(g => g.row)) + 1;
    }

    getGeneColor(geneName) {
        const hash = [...geneName].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
        const hue = hash % 360;
        return `hsl(${hue}, 50%, 50%)`;
    }

    async handleGeneClick(gene) {
        document.getElementById('position').value = gene.gene_name;
        await this.searchPosition();
        
        const geneItems = document.querySelectorAll('.gene-item');
        geneItems.forEach(item => {
            const isMatch = item.querySelector('.gene-name')?.textContent === gene.gene_name;
            item.classList.toggle('active', isMatch);
            if (isMatch) item.querySelector('.gene-header')?.click();
        });
    }

    createGeneGraphics(gene, x, y, width, exonHeight, geneHeight, exons) {
        const geneDisplay = new PIXI.Container();
        const color = PIXI.utils.string2hex(this.getGeneColor(gene.gene_name));
        
        const hitArea = new PIXI.Graphics();
        hitArea.beginFill(0xFFFFFF, 0.001)
            .drawRect(0, -20, width, exonHeight + 40);
        geneDisplay.addChild(hitArea);
        
        geneDisplay.hitArea = new PIXI.Rectangle(0, -20, width, exonHeight + 40);
        geneDisplay.interactive = true;
        geneDisplay.cursor = 'pointer';
        geneDisplay.on('click', () => this.handleGeneClick(gene));
        
        const visibleElements = new PIXI.Container();
        
        const geneRect = new PIXI.Graphics();
        geneRect.beginFill(color)
            .drawRect(0, (exonHeight - geneHeight) / 2, width, geneHeight);
        visibleElements.addChild(geneRect);
        
        exons.filter(exon => exon.gene_name === gene.gene_name)
            .forEach(exon => {
                const exonX = ((exon.start - gene.start) * width) / (gene.end - gene.start);
                const exonWidth = ((exon.end - exon.start) * width) / (gene.end - gene.start);
                
                const exonRect = new PIXI.Graphics();
                exonRect.beginFill(color)
                    .drawRect(exonX, 0, exonWidth, exonHeight);
                visibleElements.addChild(exonRect);
            });

        geneDisplay.addChild(visibleElements);
            
        return geneDisplay;
    }

    displayGenes(genes, start, end, targetPos) {
        this.state.ui.geneContainer.removeChildren();
        this.state.ui.geneLabels = [];
        
        const exons = genes.filter(item => item.type === 'exon');
        const geneItems = genes.filter(item => item.type === 'gene');
        
        const rowHeight = 65;
        const geneHeight = 4;
        const exonHeight = 40;
        const labelOffset = 20;
        
        this.assignRows(geneItems);
        this.state.data.genePositions = new Map();
        
        geneItems.forEach(gene => {
            const x = ((gene.start - start) * this.state.ui.app.screen.width) / (end - start);
            const width = ((gene.end - gene.start) * this.state.ui.app.screen.width) / (end - start);
            const y = gene.row * rowHeight + 50;

            this.state.data.genePositions.set(gene.gene_name, { x, width, start: gene.start, end: gene.end });

            const geneDisplay = this.createGeneGraphics(gene, x, y, width, exonHeight, geneHeight, exons);
            
            const text = new PIXI.Text(gene.gene_name, {
                fontFamily: 'Arial',
                fontSize: 15,
                fill: 0x000000
            });
            text.y = -labelOffset;
            text.interactive = true;
            text.cursor = 'pointer';
            geneDisplay.addChild(text);
            this.state.ui.geneLabels.push(text);
            
            geneDisplay.x = x;
            geneDisplay.y = y;
            this.state.ui.geneContainer.addChild(geneDisplay);
        });

        if (targetPos) {
            const zoomLevel = 100;
            this.state.ui.geneContainer.scale.x = zoomLevel;
            const targetPixelPos = ((targetPos - start) / (end - start)) * this.state.ui.app.screen.width;
            this.state.ui.geneContainer.position.x = this.state.ui.app.screen.width/2 - (targetPixelPos * zoomLevel);
            this.updateTextScales();
        }
    }

    updateRuler() {
        this.state.ui.ruler.removeChildren();
        
        const scale = this.state.ui.geneContainer.scale.x;
        const viewStart = Math.floor(this.state.data.startPos - (this.state.ui.geneContainer.position.x / scale / this.state.ui.app.screen.width) * (this.state.data.endPos - this.state.data.startPos));
        const viewEnd = Math.ceil(viewStart + (this.state.data.endPos - this.state.data.startPos) / scale);
        const range = viewEnd - viewStart;
        
        const TICK_DENSITY = 5;
        const orderMagnitude = Math.floor(Math.log10(Math.max(1, range / TICK_DENSITY)));
        const baseInterval = Math.pow(10, orderMagnitude);
        const interval = Math.max(1,
            (range / TICK_DENSITY < baseInterval * 2) ? baseInterval : 
            (range / TICK_DENSITY < baseInterval * 5) ? baseInterval * 2 : 
            baseInterval * 5
        );
        
        const gridLines = new PIXI.Graphics();
        gridLines.lineStyle(1, 0xEEEEEE);
        this.state.ui.ruler.addChild(gridLines);
        
        const rulerLine = new PIXI.Graphics();
        rulerLine.lineStyle(1, 0x000000);
        rulerLine.moveTo(0, 0).lineTo(this.state.ui.app.screen.width, 0);
        this.state.ui.ruler.addChild(rulerLine);
        
        const firstTick = Math.ceil(viewStart / interval) * interval;
        const pixelsPerBase = this.state.ui.app.screen.width / (viewEnd - viewStart);
        
        for (let pos = firstTick; pos < viewEnd; pos += interval) {
            const offsetFromViewStart = pos - viewStart;
            const x = Math.round(offsetFromViewStart * pixelsPerBase);
            
            gridLines.moveTo(x, 5).lineTo(x, this.state.ui.app.screen.height);
            rulerLine.moveTo(x, 0).lineTo(x, 5);
            
            let label;
            if (interval >= 1e6) {
                label = `${Math.floor(pos/1e6)}Mb`;
            } else if (interval >= 1e3) {
                label = `${Math.floor(pos/1e3)}kb`;
            } else {
                label = `${pos}bp`;
            }
            
            const text = new PIXI.Text(label, { fontSize: 10, fill: 0x000000 });
            text.x = x - text.width / 2;
            text.y = 6;
            this.state.ui.ruler.addChild(text);
        }
    }

    toggleAbout() {
        const modal = document.querySelector('.about-modal');
        modal.classList.toggle('visible');
    }
}

let browser;

function initializeGenomeBrowser() {
    browser = new GenomeBrowser();
    browser.initPixiApp();
    
    document.getElementById('search-button').onclick = () => browser.searchPosition();
    document.querySelector('.about-button').onclick = () => browser.toggleAbout();
    document.querySelector('.close-button').onclick = () => browser.toggleAbout();
    ['search-term', 'position'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') browser.searchPosition();
        });
    });
    
    browser.searchPosition();
}

document.addEventListener('DOMContentLoaded', initializeGenomeBrowser);