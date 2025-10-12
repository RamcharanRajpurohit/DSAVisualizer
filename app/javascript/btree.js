class AnimatedBTree {
    constructor(order = 3) {
        this.root = this.createNode(true, order);
        this.order = order;
        this.t = Math.ceil(order / 2);
        this.isAnimating = false;
        this.animationSpeed = 800;
        
        this.cfg = {
            nodeWidth: 100, nodeHeight: 45, hSpacing: 35, vSpacing: 90,
            keyRadius: 18, nodeFill: 'rgba(45,45,55,0.95)', 
            keyFill: 'rgba(75,75,85,0.9)', textColor: '#e8e8e8', 
            lineColor: '#555', activeFill: 'rgba(0,150,255,0.85)', 
            activeStroke: '#0096ff', processFill: 'rgba(255,200,0,0.85)', 
            processStroke: '#ffa500', successFill: 'rgba(0,255,120,0.8)', 
            successStroke: '#00ff44', errorFill: 'rgba(255,70,70,0.8)', 
            errorStroke: '#ff3333'
        };
        
        this.nodeShapes = new Map();
        this.initCanvas();
    }
    
    createNode(isLeaf = true, order = this.order) {
        return {
            id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isLeaf, keys: [], children: [], order,
            minKeys: Math.ceil(order / 2) - 1,
            maxKeys: order - 1
        };
    }
    
    initCanvas() {
        const container = document.getElementById('canvas-container');
        this.stage = new Konva.Stage({ 
            container: 'canvas-container', 
            width: container.offsetWidth, 
            height: container.offsetHeight 
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        
        window.addEventListener('resize', () => {
            this.stage.width(container.offsetWidth);
            this.stage.height(container.offsetHeight);
            this.drawTree();
        });
    }
    
    // INITIAL TREE DRAWING ONLY
    drawTree() {
        this.layer.destroyChildren();
        this.nodeShapes.clear();
        
        const layout = this.calcLayout();
        
        // Draw connections
        layout.forEach(nl => {
            if (!nl.node.isLeaf && nl.node.children.length > 0) {
                nl.node.children.forEach(child => {
                    const childLayout = layout.find(l => l.node.id === child.id);
                    if (childLayout) {
                        const line = new Konva.Line({
                            points: [nl.x, nl.y + this.cfg.nodeHeight/2, 
                                    childLayout.x, childLayout.y - this.cfg.nodeHeight/2],
                            stroke: this.cfg.lineColor, strokeWidth: 2.5,
                            opacity: 0.7, lineCap: 'round'
                        });
                        this.layer.add(line);
                    }
                });
            }
        });
        
        // Draw nodes
        layout.forEach(nl => {
            const group = this.createNodeGroup(nl.node, nl.x, nl.y);
            this.nodeShapes.set(nl.node.id, { group, node: nl.node, x: nl.x, y: nl.y });
        });
        
        this.layer.batchDraw();
    }
    
    calcLayout() {
        const layout = [];
        const levels = {};
        
        const traverse = (node, level = 0) => {
            if (!node) return;
            if (!levels[level]) levels[level] = [];
            levels[level].push(node);
            if (!node.isLeaf && node.children.length > 0) {
                node.children.forEach(child => traverse(child, level + 1));
            }
        };
        
        traverse(this.root);
        
        const stageWidth = this.stage.width();
        
        Object.keys(levels).forEach(lvl => {
            const nodes = levels[lvl];
            const totalWidth = nodes.reduce((sum, n) => 
                sum + Math.max(this.cfg.nodeWidth, n.keys.length * 40 + 25), 0
            ) + (nodes.length - 1) * this.cfg.hSpacing;
            
            let x = (stageWidth - totalWidth) / 2;
            const y = 70 + parseInt(lvl) * this.cfg.vSpacing;
            
            nodes.forEach(node => {
                const w = Math.max(this.cfg.nodeWidth, node.keys.length * 40 + 25);
                layout.push({ node, x: x + w / 2, y, width: w, height: this.cfg.nodeHeight });
                x += w + this.cfg.hSpacing;
            });
        });
        
        return layout;
    }
    
    createNodeGroup(node, x, y) {
        const w = Math.max(this.cfg.nodeWidth, node.keys.length * 40 + 25);
        const group = new Konva.Group({ x: x - w/2, y: y - this.cfg.nodeHeight/2 });
        
        const rect = new Konva.Rect({
            x: 0, y: 0, width: w, height: this.cfg.nodeHeight,
            fill: this.cfg.nodeFill, stroke: this.cfg.lineColor,
            strokeWidth: 2, cornerRadius: 8,
            shadowColor: 'black', shadowBlur: 10,
            shadowOffset: { x: 3, y: 3 }, shadowOpacity: 0.5
        });
        group.add(rect);
        
        const spacing = w / (node.keys.length + 1);
        node.keys.forEach((key, i) => {
            const kx = spacing * (i + 1);
            
            const circle = new Konva.Circle({
                x: kx, y: this.cfg.nodeHeight/2, radius: this.cfg.keyRadius,
                fill: this.cfg.keyFill, stroke: this.cfg.lineColor, strokeWidth: 2
            });
            
            const text = new Konva.Text({
                x: kx - 20, y: this.cfg.nodeHeight/2 - 9, text: key.toString(),
                fontSize: 16, fontFamily: 'Consolas', fill: this.cfg.textColor,
                fontStyle: 'bold', width: 40, align: 'center'
            });
            
            group.add(circle);
            group.add(text);
        });
        
        this.layer.add(group);
        return group;
    }
    
    // LIVE ADD KEY CIRCLE TO NODE
    async liveAddKey(node, key, position) {
        const shapeData = this.nodeShapes.get(node.id);
        if (!shapeData) return;
        
        const group = shapeData.group;
        const w = Math.max(this.cfg.nodeWidth, (node.keys.length + 1) * 40 + 25);
        
        // Expand node width
        const rect = group.findOne('Rect');
        await new Promise(resolve => {
            rect.to({ width: w, duration: 0.3, onFinish: resolve });
        });
        
        // Calculate new positions and shift existing keys
        const oldSpacing = rect.width() / (node.keys.length + 1);
        const newSpacing = w / (node.keys.length + 2);
        
        const shapes = group.getChildren().filter(s => s.className === 'Circle' || s.className === 'Text');
        
        // Shift existing keys
        let keyIndex = 0;
        for (let i = 1; i < shapes.length; i += 2) {
            const circle = shapes[i];
            const text = shapes[i + 1];
            
            if (keyIndex >= position) {
                const newX = newSpacing * (keyIndex + 2);
                circle.to({ x: newX, duration: 0.3 });
                text.to({ x: newX - 20, duration: 0.3 });
            } else {
                const newX = newSpacing * (keyIndex + 1);
                circle.to({ x: newX, duration: 0.3 });
                text.to({ x: newX - 20, duration: 0.3 });
            }
            keyIndex++;
        }
        
        await this.delay(300);
        
        // Add new key circle at position
        const kx = newSpacing * (position + 1);
        
        const newCircle = new Konva.Circle({
            x: kx, y: this.cfg.nodeHeight/2, radius: 0,
            fill: this.cfg.successFill, stroke: this.cfg.successStroke, strokeWidth: 3
        });
        
        const newText = new Konva.Text({
            x: kx - 20, y: this.cfg.nodeHeight/2 - 9, text: key.toString(),
            fontSize: 16, fontFamily: 'Consolas', fill: this.cfg.textColor,
            fontStyle: 'bold', width: 40, align: 'center', opacity: 0
        });
        
        group.add(newCircle);
        group.add(newText);
        
        // Animate key appearing
        await Promise.all([
            new Promise(resolve => newCircle.to({ 
                radius: this.cfg.keyRadius, 
                fill: this.cfg.keyFill, 
                stroke: this.cfg.lineColor, 
                strokeWidth: 2,
                duration: 0.5, 
                onFinish: resolve 
            })),
            new Promise(resolve => newText.to({ opacity: 1, duration: 0.5, onFinish: resolve }))
        ]);
        
        this.layer.batchDraw();
    }
    
    // LIVE SPLIT NODE - CREATE NEW NODES AND CONNECTIONS
    async liveSplit(parent, childIndex) {
        const child = parent.children[childIndex];
        const newNode = this.createNode(child.isLeaf, child.order);
        
        const mid = Math.floor(child.keys.length / 2);
        const midKey = child.keys[mid];
        
        await this.showMessage(`Splitting at ${midKey}`, '#ff6600');
        
        // Highlight the full node
        const childShape = this.nodeShapes.get(child.id);
        if (childShape) {
            const rect = childShape.group.findOne('Rect');
            rect.to({ fill: this.cfg.errorFill, stroke: this.cfg.errorStroke, strokeWidth: 4, duration: 0.3 });
        }
        
        await this.delay(500);
        
        // Update data structure
        newNode.keys = child.keys.slice(mid + 1);
        child.keys = child.keys.slice(0, mid);
        
        if (!child.isLeaf) {
            newNode.children = child.children.slice(mid + 1);
            child.children = child.children.slice(0, mid + 1);
        }
        
        parent.keys.splice(childIndex, 0, midKey);
        parent.children.splice(childIndex + 1, 0, newNode);
        
        // Remove old visual and create new split structure
        if (childShape) {
            childShape.group.destroy();
            this.nodeShapes.delete(child.id);
        }
        
        // Recalculate layout and draw new nodes + connections
        const layout = this.calcLayout();
        
        // Draw new connections first
        const parentLayout = layout.find(l => l.node.id === parent.id);
        const leftLayout = layout.find(l => l.node.id === child.id);
        const rightLayout = layout.find(l => l.node.id === newNode.id);
        
        if (parentLayout && leftLayout) {
            const line1 = new Konva.Line({
                points: [parentLayout.x, parentLayout.y + this.cfg.nodeHeight/2,
                        leftLayout.x, leftLayout.y - this.cfg.nodeHeight/2],
                stroke: this.cfg.successStroke, strokeWidth: 3, opacity: 0
            });
            this.layer.add(line1);
            line1.to({ opacity: 0.7, stroke: this.cfg.lineColor, strokeWidth: 2.5, duration: 0.5 });
        }
        
        if (parentLayout && rightLayout) {
            const line2 = new Konva.Line({
                points: [parentLayout.x, parentLayout.y + this.cfg.nodeHeight/2,
                        rightLayout.x, rightLayout.y - this.cfg.nodeHeight/2],
                stroke: this.cfg.successStroke, strokeWidth: 3, opacity: 0
            });
            this.layer.add(line2);
            line2.to({ opacity: 0.7, stroke: this.cfg.lineColor, strokeWidth: 2.5, duration: 0.5 });
        }
        
        // Create and animate new node groups
        if (leftLayout) {
            const leftGroup = this.createNodeGroup(child, leftLayout.x, leftLayout.y);
            leftGroup.opacity(0);
            leftGroup.to({ opacity: 1, duration: 0.5 });
            this.nodeShapes.set(child.id, { group: leftGroup, node: child, x: leftLayout.x, y: leftLayout.y });
        }
        
        if (rightLayout) {
            const rightGroup = this.createNodeGroup(newNode, rightLayout.x, rightLayout.y);
            rightGroup.opacity(0);
            rightGroup.to({ opacity: 1, duration: 0.5 });
            this.nodeShapes.set(newNode.id, { group: rightGroup, node: newNode, x: rightLayout.x, y: rightLayout.y });
        }
        
        // Update parent node to show new key
        const parentShape = this.nodeShapes.get(parent.id);
        if (parentShape) {
            parentShape.group.destroy();
            this.nodeShapes.delete(parent.id);
            
            const parentGroup = this.createNodeGroup(parent, parentLayout.x, parentLayout.y);
            parentGroup.opacity(0);
            parentGroup.to({ opacity: 1, duration: 0.5 });
            this.nodeShapes.set(parent.id, { group: parentGroup, node: parent, x: parentLayout.x, y: parentLayout.y });
        }
        
        this.layer.batchDraw();
        await this.delay(600);
        
        await this.showMessage(`Split complete: ${midKey} moved up`, '#00ff44');
    }
    
    // UNIFIED MERGE - BOTH DATA AND ANIMATION
    async merge(parent, leftIndex, rightIndex) {
        const leftChild = parent.children[leftIndex];
        const rightChild = parent.children[rightIndex];
        
        await this.showMessage('Merging nodes...', '#ff6600');
        
        // Highlight nodes being merged
        [leftChild.id, rightChild.id].forEach(id => {
            const shape = this.nodeShapes.get(id);
            if (shape) {
                const rect = shape.group.findOne('Rect');
                rect.to({ fill: this.cfg.errorFill, stroke: this.cfg.errorStroke, duration: 0.3 });
            }
        });
        
        await this.delay(500);
        
        // Merge data
        leftChild.keys.push(parent.keys[leftIndex]);
        leftChild.keys.push(...rightChild.keys);
        if (!leftChild.isLeaf) {
            leftChild.children.push(...rightChild.children);
        }
        
        parent.keys.splice(leftIndex, 1);
        parent.children.splice(rightIndex, 1);
        
        // Remove old visuals
        this.nodeShapes.get(leftChild.id)?.group.destroy();
        this.nodeShapes.get(rightChild.id)?.group.destroy();
        this.nodeShapes.delete(leftChild.id);
        this.nodeShapes.delete(rightChild.id);
        
        // Redraw merged node
        const layout = this.calcLayout();
        const mergedLayout = layout.find(l => l.node.id === leftChild.id);
        
        if (mergedLayout) {
            const group = this.createNodeGroup(leftChild, mergedLayout.x, mergedLayout.y);
            group.opacity(0);
            group.to({ opacity: 1, duration: 0.5 });
            this.nodeShapes.set(leftChild.id, { group, node: leftChild, x: mergedLayout.x, y: mergedLayout.y });
        }
        
        this.layer.batchDraw();
        await this.delay(500);
        
        await this.showMessage(`Merged: [${leftChild.keys.join(',')}]`, '#00ff44');
    }
    
    async highlightNode(node, fill, stroke) {
        const shapeData = this.nodeShapes.get(node.id);
        if (!shapeData) return;
        
        const rect = shapeData.group.findOne('Rect');
        rect.to({ fill, stroke, strokeWidth: 4, duration: 0.3 });
        this.layer.batchDraw();
        await this.delay(this.animationSpeed * 0.5);
    }
    
    async showMessage(msg, color = '#0096ff') {
        const info = document.getElementById('operation-details');
        if (info) {
            info.innerHTML = `<strong style="color: ${color}">${msg}</strong>`;
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // INSERT
    async insert(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`Inserting ${key}`, '#0096ff');
        
        try {
            if (this.root.keys.length === 0) {
                this.root.keys.push(key);
                this.drawTree();
            } else {
                await this._insertNonFull(this.root, key);
                
                if (this.root.keys.length > this.root.maxKeys) {
                    const oldRoot = this.root;
                    this.root = this.createNode(false, this.order);
                    this.root.children.push(oldRoot);
                    await this.liveSplit(this.root, 0);
                }
            }
            
            await this.showMessage(`✓ Inserted ${key}`, '#00ff44');
        } finally {
            this.isAnimating = false;
        }
    }
    
    async _insertNonFull(node, key) {
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke);
        
        if (node.isLeaf) {
            let i = node.keys.length - 1;
            while (i >= 0 && key < node.keys[i]) i--;
            const pos = i + 1;
            
            node.keys.splice(pos, 0, key);
            await this.liveAddKey(node, key, pos);
            return;
        }
        
        let i = node.keys.length - 1;
        while (i >= 0 && key < node.keys[i]) i--;
        i++;
        
        await this._insertNonFull(node.children[i], key);
        
        if (node.children[i].keys.length > node.children[i].maxKeys) {
            await this.liveSplit(node, i);
        }
    }
    
    async search(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`Searching ${key}`, '#0096ff');
        
        try {
            const found = await this._search(this.root, key);
            await this.showMessage(found ? `✓ Found ${key}` : `✗ Not found`, found ? '#00ff44' : '#ff3333');
        } finally {
            this.isAnimating = false;
        }
    }
    
    async _search(node, key) {
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke);
        
        let i = 0;
        while (i < node.keys.length && key > node.keys[i]) i++;
        
        if (i < node.keys.length && key === node.keys[i]) {
            return true;
        }
        
        return node.isLeaf ? false : await this._search(node.children[i], key);
    }
    
    async delete(key) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        await this.showMessage(`Deleting ${key}`, '#ff3333');
        
        try {
            await this._delete(this.root, key);
            
            if (this.root.keys.length === 0 && !this.root.isLeaf && this.root.children.length > 0) {
                this.root = this.root.children[0];
                this.drawTree();
            }
            
            await this.showMessage(`✓ Deleted ${key}`, '#00ff44');
        } catch {
            await this.showMessage(`✗ Not found`, '#ff3333');
        } finally {
            this.isAnimating = false;
        }
    }
    
    async _delete(node, key) {
        let idx = 0;
        while (idx < node.keys.length && node.keys[idx] < key) idx++;
        
        await this.highlightNode(node, this.cfg.activeFill, this.cfg.activeStroke);
        
        if (idx < node.keys.length && node.keys[idx] === key) {
            if (node.isLeaf) {
                node.keys.splice(idx, 1);
                this.drawTree(); // Simplified for delete
                return;
            }
            // Handle internal deletion
        } else if (!node.isLeaf) {
            await this._delete(node.children[idx], key);
        } else {
            throw new Error('Not found');
        }
    }
}

// UI SETUP
document.addEventListener('DOMContentLoaded', () => {
    let tree = new AnimatedBTree(3);
    tree.drawTree();
    
    document.getElementById('insert-btn')?.addEventListener('click', async () => {
        const val = parseInt(document.getElementById('value-input')?.value);
        if (!isNaN(val)) {
            await tree.insert(val);
            document.getElementById('value-input').value = '';
        }
    });
    
    document.getElementById('search-btn')?.addEventListener('click', async () => {
        const val = parseInt(document.getElementById('value-input')?.value);
        if (!isNaN(val)) await tree.search(val);
    });
    
    document.getElementById('delete-btn')?.addEventListener('click', async () => {
        const val = parseInt(document.getElementById('value-input')?.value);
        if (!isNaN(val)) {
            await tree.delete(val);
            document.getElementById('value-input').value = '';
        }
    });
});
